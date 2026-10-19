import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

export type QueueName =
  | "search"
  | "verify"
  | "export"
  | "emails"
  | "reachinbox"
  | "sync"
  | "reply";

const globalForQueue = globalThis as unknown as {
  __redis: IORedis | undefined;
  __queues: Partial<Record<QueueName, Queue>> | undefined;
  __events: Partial<Record<QueueName, QueueEvents>> | undefined;
};

export function redis(): IORedis {
  if (!globalForQueue.__redis) {
    globalForQueue.__redis = new IORedis(env().REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return globalForQueue.__redis;
}

export function queue(name: QueueName): Queue {
  if (!globalForQueue.__queues) globalForQueue.__queues = {};
  let q = globalForQueue.__queues[name];
  if (!q) {
    q = new Queue(name, { connection: redis() });
    globalForQueue.__queues[name] = q;
  }
  return q;
}

export function queueEvents(name: QueueName): QueueEvents {
  if (!globalForQueue.__events) globalForQueue.__events = {};
  let e = globalForQueue.__events[name];
  if (!e) {
    e = new QueueEvents(name, { connection: redis() });
    globalForQueue.__events[name] = e;
  }
  return e;
}

/** Enqueue a campaign-scoped job. */
export async function enqueue<T extends object>(
  name: QueueName,
  data: T & { campaignId?: string },
  opts?: { delayMs?: number; jobId?: string },
) {
  return queue(name).add(name, data, {
    jobId: opts?.jobId,
    delay: opts?.delayMs,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  });
}
