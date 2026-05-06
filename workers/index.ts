/**
 * Worker entrypoint. Boots a BullMQ worker for each queue.
 * Run with: pnpm worker:dev
 */
import { Worker, type Job } from "bullmq";
import { queue, redis } from "../lib/queue";
import { env } from "../lib/env";
import { db } from "../lib/db";
import { runSearch, type SearchJobData } from "./apollo-search.worker";
import { runVerify, type VerifyJobData } from "./verify.worker";
import { runExport, type ExportJobData } from "./export.worker";
import {
  runReachInboxLaunch,
  type ReachInboxJobData,
} from "./reachinbox.worker";
import { runSync, type SyncJobData } from "./reachinbox-sync.worker";
import { runReply, type ReplyJobData } from "./replies.worker";

env(); // validate

const log = (q: string, msg: string, extra?: unknown) =>
  console.log(`[worker:${q}] ${msg}`, extra ?? "");

type Handler = (job: Job<unknown>) => Promise<unknown>;

async function withJobTracking<T extends { campaignId?: string }>(
  type: string,
  job: Job<T>,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const tracked = await db.job
    .create({
      data: {
        type,
        status: "running",
        bullId: String(job.id),
        startedAt: new Date(),
        campaignId: job.data?.campaignId ?? null,
      },
    })
    .catch((err) => {
      console.error("failed to create job row", err);
      return null;
    });
  try {
    const out = await fn();
    if (tracked) {
      await db.job.update({
        where: { id: tracked.id },
        data: { status: "done", finishedAt: new Date(), meta: out as object },
      });
    }
    return out;
  } catch (err) {
    if (tracked) {
      await db.job.update({
        where: { id: tracked.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: (err as Error).message?.slice(0, 4000) ?? "unknown",
        },
      });
    }
    if (job.data?.campaignId && type !== "reachinbox_sync" && type !== "reply_categorize") {
      await db.campaign
        .update({
          where: { id: job.data.campaignId },
          data: { status: "failed" },
        })
        .catch(() => null);
    }
    throw err;
  }
}

const handlers: Record<string, Handler> = {
  search: (job) =>
    withJobTracking(
      "apollo_search",
      job as Job<SearchJobData>,
      () => runSearch(job as Job<SearchJobData>),
    ),
  verify: (job) =>
    withJobTracking(
      "verify",
      job as Job<VerifyJobData>,
      () => runVerify(job as Job<VerifyJobData>),
    ),
  export: (job) =>
    withJobTracking(
      "export",
      job as Job<ExportJobData>,
      () => runExport(job as Job<ExportJobData>),
    ),
  emails: async (job) => {
    log("emails", `received job ${job.id}`, job.data);
    return { stub: true };
  },
  reachinbox: (job) =>
    withJobTracking(
      "reachinbox_create",
      job as Job<ReachInboxJobData>,
      () => runReachInboxLaunch(job as Job<ReachInboxJobData>),
    ),
  sync: (job) =>
    withJobTracking(
      "reachinbox_sync",
      job as Job<SyncJobData>,
      () => runSync(job as Job<SyncJobData>),
    ),
  reply: (job) =>
    withJobTracking(
      "reply_categorize",
      job as Job<ReplyJobData>,
      () => runReply(job as Job<ReplyJobData>),
    ),
};

const workers: Worker[] = [];

for (const [queueName, handler] of Object.entries(handlers)) {
  const w = new Worker(queueName, handler, {
    connection: redis(),
    concurrency: 2,
  });
  w.on("failed", (job, err) =>
    log(queueName, `job ${job?.id} failed: ${err.message}`),
  );
  w.on("completed", (job) => log(queueName, `job ${job.id} completed`));
  workers.push(w);
}

console.log(`[workers] booted ${workers.length} workers`);

// Schedule recurring sync for every live campaign on boot, then re-check every 5 min.
async function scheduleLiveSyncs() {
  const live = await db.campaign.findMany({
    where: { status: "live", reachinboxId: { not: null } },
    select: { id: true },
  });
  const intervalMs = env().REACHINBOX_SYNC_INTERVAL_MIN * 60_000;
  for (const c of live) {
    await queue("sync").add(
      "sync",
      { campaignId: c.id },
      {
        jobId: `sync:${c.id}`,
        repeat: { every: intervalMs },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );
  }
  if (live.length > 0) {
    log("sync", `scheduled ${live.length} repeating syncs`);
  }
}

scheduleLiveSyncs().catch((e) =>
  console.error("scheduleLiveSyncs failed", e),
);
setInterval(
  () =>
    scheduleLiveSyncs().catch((e) =>
      console.error("scheduleLiveSyncs failed", e),
    ),
  5 * 60_000,
);

async function shutdown() {
  console.log("[workers] shutting down");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
