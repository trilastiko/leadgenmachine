import { httpRequest } from "../http";
import { env } from "../env";

const BASE_URL = "https://emailverifier.reoon.com/api/v1";

export function reoonGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  return httpRequest<T>(
    { method: "GET", url, timeoutMs: 60_000 },
    { attempts: 4 },
  );
}

export function reoonPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  return httpRequest<T>(
    { method: "POST", url, body, timeoutMs: 60_000 },
    { attempts: 4 },
  );
}

export function withKey(extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams({
    key: env().REOON_API_KEY,
    ...Object.fromEntries(
      Object.entries(extra).map(([k, v]) => [k, String(v)]),
    ),
  });
  return `?${params.toString()}`;
}
