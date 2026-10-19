import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { makeSessionToken, verifySessionToken } from "./auth";

describe("auth session tokens", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeAll(() => {
    process.env.DATABASE_URL = "postgresql://x:y@localhost:5432/z";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.SESSION_SECRET = "test-secret-test-secret-test";
    process.env.APOLLO_API_KEY = "x";
    process.env.REACHINBOX_API_KEY = "x";
    process.env.REOON_API_KEY = "x";
    process.env.ANTHROPIC_API_KEY = "x";
  });

  it("verifies a freshly signed token", () => {
    const token = makeSessionToken();
    expect(verifySessionToken(token)).toBe(true);
  });

  it("rejects expired and future-issued tokens", () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now");
    clock.mockReturnValue(now - 30 * 24 * 60 * 60 * 1000 - 1);
    const expired = makeSessionToken();
    clock.mockReturnValue(now + 60_001);
    const future = makeSessionToken();
    clock.mockReturnValue(now);
    expect(verifySessionToken(expired)).toBe(false);
    expect(verifySessionToken(future)).toBe(false);
  });

  it("accepts the lifetime boundary and rejects extra token segments", () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now");
    clock.mockReturnValue(now - 30 * 24 * 60 * 60 * 1000);
    const token = makeSessionToken();
    clock.mockReturnValue(now);
    expect(verifySessionToken(token)).toBe(true);
    expect(verifySessionToken(token + ".extra")).toBe(false);
  });

  it("rejects tampered tokens", () => {
    const token = makeSessionToken();
    expect(verifySessionToken(token + "x")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
    expect(verifySessionToken("123.abc")).toBe(false);
  });
});
