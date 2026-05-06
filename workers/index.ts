/**
 * Worker entrypoint. Boots a BullMQ worker for each queue.
 * Run with: pnpm worker:dev
 *
 * Individual workers live in workers/<name>.worker.ts and are wired up here.
 * In commit 1 they are stubs that log and resolve; later commits replace them.
 */
import { Worker } from "bullmq";
import { redis } from "../lib/queue";
import { env } from "../lib/env";

env(); // validate

const log = (q: string, msg: string, extra?: unknown) =>
  console.log(`[worker:${q}] ${msg}`, extra ?? "");

type Handler = (job: { id?: string; name: string; data: unknown }) => Promise<unknown>;

const stub =
  (name: string): Handler =>
  async (job) => {
    log(name, `received job ${job.id}`, job.data);
    return { stub: true };
  };

const handlers: Record<string, Handler> = {
  search: stub("search"),
  verify: stub("verify"),
  export: stub("export"),
  emails: stub("emails"),
  reachinbox: stub("reachinbox"),
  sync: stub("sync"),
  reply: stub("reply"),
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

async function shutdown() {
  console.log("[workers] shutting down");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
