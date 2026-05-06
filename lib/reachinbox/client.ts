import { httpRequest } from "../http";
import { env } from "../env";

/**
 * ReachInbox client — best-effort wrapper around the public API.
 *
 * Confirmed: `Authorization: Bearer {API_KEY}` is the auth scheme
 * (per https://help.reachinbox.ai/en/articles/11008526-clay-integration-...).
 *
 * Endpoint paths and request shapes used in `campaigns.ts` are best-guesses
 * based on common patterns. Override the base URL via `REACHINBOX_BASE_URL`
 * during integration testing if needed.
 */

const DEFAULT_BASE_URL = "https://api.reachinbox.ai/api/v1";

function baseUrl(): string {
  return process.env.REACHINBOX_BASE_URL || DEFAULT_BASE_URL;
}

function authHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${env().REACHINBOX_API_KEY}`,
    accept: "application/json",
  };
}

export function riGet<T>(path: string): Promise<T> {
  return httpRequest<T>(
    {
      method: "GET",
      url: `${baseUrl()}${path}`,
      headers: authHeaders(),
      timeoutMs: 30_000,
    },
    { attempts: 4 },
  );
}

export function riPost<T>(path: string, body: unknown): Promise<T> {
  return httpRequest<T>(
    {
      method: "POST",
      url: `${baseUrl()}${path}`,
      headers: authHeaders(),
      body,
      timeoutMs: 30_000,
    },
    { attempts: 4 },
  );
}

export function riPut<T>(path: string, body: unknown): Promise<T> {
  return httpRequest<T>(
    {
      method: "PUT",
      url: `${baseUrl()}${path}`,
      headers: authHeaders(),
      body,
      timeoutMs: 30_000,
    },
    { attempts: 4 },
  );
}
