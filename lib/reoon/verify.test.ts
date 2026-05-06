import { beforeAll, describe, expect, it } from "vitest";
import { mapToEmailStatus } from "./verify";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://x:y@localhost:5432/z";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.SESSION_SECRET = "test-secret-test-secret-test";
  process.env.APOLLO_API_KEY = "x";
  process.env.REACHINBOX_API_KEY = "x";
  process.env.REOON_API_KEY = "x";
  process.env.ANTHROPIC_API_KEY = "x";
});

describe("mapToEmailStatus", () => {
  it("maps valid + safe to 'valid'", () => {
    expect(mapToEmailStatus("valid")).toBe("valid");
    expect(mapToEmailStatus("safe")).toBe("valid");
  });

  it("maps invalid + disabled + disposable + spamtrap to 'invalid'", () => {
    expect(mapToEmailStatus("invalid")).toBe("invalid");
    expect(mapToEmailStatus("disabled")).toBe("invalid");
    expect(mapToEmailStatus("disposable")).toBe("invalid");
    expect(mapToEmailStatus("spamtrap")).toBe("invalid");
  });

  it("maps catch_all + role + inbox_full to 'risky'", () => {
    expect(mapToEmailStatus("catch_all")).toBe("risky");
    expect(mapToEmailStatus("role_account")).toBe("risky");
    expect(mapToEmailStatus("inbox_full")).toBe("risky");
  });

  it("maps unknown to 'unknown'", () => {
    expect(mapToEmailStatus("unknown")).toBe("unknown");
  });
});
