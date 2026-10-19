import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY });
  return cached;
}

export const PRIMARY_MODEL = () => env().ANTHROPIC_MODEL_PRIMARY;
export const FAST_MODEL = () => env().ANTHROPIC_MODEL_FAST;
