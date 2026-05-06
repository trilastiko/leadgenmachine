/**
 * Lightweight fetch wrapper with retry + backoff for vendor HTTP clients.
 * Each integration client (apollo, reachinbox, reoon) wraps this.
 */
export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "HttpError";
  }
}

export type HttpRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type RetryOpts = {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
};

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function httpRequest<T = unknown>(
  req: HttpRequest,
  retry: RetryOpts = {},
): Promise<T> {
  const attempts = retry.attempts ?? 4;
  const initial = retry.initialDelayMs ?? 1_000;
  const max = retry.maxDelayMs ?? 16_000;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const t = req.timeoutMs
        ? setTimeout(() => ctrl.abort(), req.timeoutMs)
        : null;

      const init: RequestInit = {
        method: req.method,
        headers: { "content-type": "application/json", ...(req.headers ?? {}) },
        signal: ctrl.signal,
      };
      if (req.body !== undefined) init.body = JSON.stringify(req.body);

      let res: Response;
      try {
        res = await fetch(req.url, init);
      } finally {
        if (t) clearTimeout(t);
      }

      if (!res.ok) {
        const text = await res.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* keep text */
        }
        const err = new HttpError(
          res.status,
          `HTTP ${res.status} ${res.statusText} for ${req.method} ${req.url}`,
          parsed,
        );
        if (RETRYABLE_STATUSES.has(res.status) && i < attempts - 1) {
          await sleep(backoff(i, initial, max));
          continue;
        }
        throw err;
      }

      if (res.status === 204) return undefined as T;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    } catch (e) {
      lastErr = e;
      const isNet = !(e instanceof HttpError);
      if (isNet && i < attempts - 1) {
        await sleep(backoff(i, initial, max));
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("httpRequest exhausted retries");
}

function backoff(attempt: number, initial: number, max: number): number {
  const exp = Math.min(initial * 2 ** attempt, max);
  const jitter = Math.random() * 0.3 * exp;
  return exp + jitter;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
