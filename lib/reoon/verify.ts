import { reoonGet, reoonPost, withKey } from "./client";
import { env } from "../env";
import { sleep } from "../http";

/**
 * Reoon Email Verifier — bulk verification.
 * Docs: https://www.reoon.com/articles/api-documentation-of-reoon-email-verifier/
 *
 * Flow: POST create-bulk-verification-task → poll get-result-bulk-verification-task
 * until status === "completed".
 */

export type ReoonStatus =
  | "valid"
  | "invalid"
  | "disposable"
  | "spamtrap"
  | "safe"
  | "disabled"
  | "inbox_full"
  | "catch_all"
  | "role_account"
  | "unknown";

export type ReoonResult = {
  email: string;
  status: ReoonStatus;
  is_safe_to_send?: boolean;
  is_disposable?: boolean;
  is_role_account?: boolean;
  is_catch_all?: boolean;
};

type CreateResponse = {
  status: "success" | "error";
  task_id?: number;
  count_submitted?: number;
  reason?: string;
};

type ResultResponse = {
  task_id: string;
  status:
    | "waiting"
    | "running"
    | "completed"
    | "file_not_found"
    | "file_loading_error";
  count_total: number;
  count_checked: number;
  progress_percentage: number;
  results?: Record<string, ReoonResult & Record<string, unknown>>;
};

export async function createBulkTask(
  emails: string[],
  name?: string,
): Promise<number> {
  const body = {
    name: name?.slice(0, 25),
    emails,
    key: env().REOON_API_KEY,
  };
  const res = await reoonPost<CreateResponse>(
    "/create-bulk-verification-task/",
    body,
  );
  if (res.status !== "success" || res.task_id == null) {
    throw new Error(`Reoon task create failed: ${res.reason ?? "unknown"}`);
  }
  return res.task_id;
}

export async function getBulkResult(taskId: number): Promise<ResultResponse> {
  return reoonGet<ResultResponse>(
    `/get-result-bulk-verification-task/${withKey({ task_id: taskId })}`,
  );
}

/**
 * Verify a batch of emails end-to-end. Polls every `pollMs` until done or `timeoutMs` elapses.
 */
export async function verifyBatch(
  emails: string[],
  opts: { taskName?: string; pollMs?: number; timeoutMs?: number } = {},
): Promise<Record<string, ReoonResult>> {
  if (emails.length === 0) return {};
  const taskId = await createBulkTask(emails, opts.taskName);

  const pollMs = opts.pollMs ?? 5_000;
  const timeoutMs = opts.timeoutMs ?? 30 * 60_000;
  const start = Date.now();

  while (true) {
    const res = await getBulkResult(taskId);
    if (res.status === "completed") {
      return res.results ?? {};
    }
    if (
      res.status === "file_not_found" ||
      res.status === "file_loading_error"
    ) {
      throw new Error(`Reoon task ${taskId} failed: ${res.status}`);
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Reoon task ${taskId} timed out after ${timeoutMs}ms`);
    }
    await sleep(pollMs);
  }
}

/** Map a Reoon status to our internal `Prospect.emailStatus` value. */
export function mapToEmailStatus(s: ReoonStatus): string {
  switch (s) {
    case "valid":
    case "safe":
      return "valid";
    case "invalid":
    case "disabled":
      return "invalid";
    case "disposable":
    case "spamtrap":
      return "invalid";
    case "catch_all":
      return "risky";
    case "inbox_full":
    case "role_account":
      return "risky";
    case "unknown":
      return "unknown";
    default:
      return "unknown";
  }
}
