import { webcrypto } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { middleware } from "../middleware";
import { makeSessionToken } from "./auth";
import { verifySessionTokenEdge } from "./auth-edge";
import { SESSION_MAX_AGE_MS } from "./session";

describe("Edge session compatibility", () => {
  beforeAll(() => {
    vi.stubGlobal("crypto", webcrypto);
    Object.assign(process.env, {
      DATABASE_URL: "postgresql://x:y@localhost:5432/z",
      REDIS_URL: "redis://localhost:6379",
      SESSION_SECRET: "test-secret-test-secret-test",
      APOLLO_API_KEY: "x",
      REACHINBOX_API_KEY: "x",
      REOON_API_KEY: "x",
      ANTHROPIC_API_KEY: "x",
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("accepts existing server-signed cookies in Edge middleware", async () => {
    const token = makeSessionToken();
    expect(await verifySessionTokenEdge(token)).toBe(true);
    const response = await middleware(new NextRequest("https://example.test/campaigns/1", {
      headers: { cookie: "lgm_session=" + token },
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects tampering, extra segments, expired and future cookies", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now");
    clock.mockReturnValue(now - SESSION_MAX_AGE_MS - 1);
    const expired = makeSessionToken();
    clock.mockReturnValue(now + 60_001);
    const future = makeSessionToken();
    clock.mockReturnValue(now);
    const token = makeSessionToken();
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    for (const candidate of [undefined, expired, future, tampered, token + ".extra"])
      expect(await verifySessionTokenEdge(candidate)).toBe(false);
  });

  it("preserves public routes and rejects unauthenticated API and page requests", async () => {
    const health = await middleware(new NextRequest("https://example.test/api/health"));
    expect(health.headers.get("x-middleware-next")).toBe("1");
    const api = await middleware(new NextRequest("https://example.test/api/campaigns"));
    expect(api.status).toBe(401);
    const page = await middleware(new NextRequest("https://example.test/campaigns/1"));
    expect(page.headers.get("location")).toBe("https://example.test/login?next=%2Fcampaigns%2F1");
  });
});
