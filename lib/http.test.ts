import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { httpRequest, HttpError } from "./http";

const realFetch = global.fetch;

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://x:y@localhost:5432/z";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.SESSION_SECRET = "test-secret-test-secret-test";
  process.env.APOLLO_API_KEY = "x";
  process.env.REACHINBOX_API_KEY = "x";
  process.env.REOON_API_KEY = "x";
  process.env.ANTHROPIC_API_KEY = "x";
});

afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("httpRequest", () => {
  it("returns parsed JSON on 200", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const out = await httpRequest({ method: "GET", url: "https://x/test" });
    expect(out).toEqual({ ok: 1 });
  });

  it("throws HttpError on non-retryable 400", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(
      httpRequest({ method: "GET", url: "https://x/bad" }, { attempts: 2 }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("retries on 503 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("oops", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await httpRequest(
      { method: "GET", url: "https://x/retry" },
      { attempts: 3, initialDelayMs: 1, maxDelayMs: 5 },
    );
    expect(out).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
