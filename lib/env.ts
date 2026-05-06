import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),

  APOLLO_API_KEY: z.string().min(1),
  REACHINBOX_API_KEY: z.string().min(1),
  REOON_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),

  // Path to GCP service account JSON file (relative or absolute)
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_SHEETS_OWNER_EMAIL: z.string().email().optional(),

  // Defaults
  DEFAULT_TARGET_PROSPECTS: z.coerce.number().int().positive().default(500),
  DEFAULT_DAILY_CAP: z.coerce.number().int().positive().default(40),

  // Models
  ANTHROPIC_MODEL_PRIMARY: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_MODEL_FAST: z.string().default("claude-haiku-4-5-20251001"),

  // Sync cadence
  REACHINBOX_SYNC_INTERVAL_MIN: z.coerce.number().int().positive().default(15),
});

export type Env = z.infer<typeof Env>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
