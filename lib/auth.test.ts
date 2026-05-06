import { describe, it, expect, beforeAll } from "vitest";
import { makeSessionToken, verifySessionToken } from "./auth";

describe("auth session tokens", () => {
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

  it("rejects tampered tokens", () => {
    const token = makeSessionToken();
    expect(verifySessionToken(token + "x")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
    expect(verifySessionToken("123.abc")).toBe(false);
  });
});
