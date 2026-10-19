import { httpRequest } from "../http";
import { env } from "../env";

const BASE_URL = "https://api.apollo.io/api/v1";

function authHeaders(): Record<string, string> {
  return {
    "x-api-key": env().APOLLO_API_KEY,
    accept: "application/json",
  };
}

export function apolloPost<T>(path: string, body: unknown): Promise<T> {
  return httpRequest<T>(
    {
      method: "POST",
      url: `${BASE_URL}${path}`,
      headers: authHeaders(),
      body,
      timeoutMs: 30_000,
    },
    { attempts: 4 },
  );
}

export function apolloGet<T>(path: string): Promise<T> {
  return httpRequest<T>(
    {
      method: "GET",
      url: `${BASE_URL}${path}`,
      headers: authHeaders(),
      timeoutMs: 30_000,
    },
    { attempts: 4 },
  );
}
