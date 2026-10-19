import { z } from "zod";
import { anthropic, PRIMARY_MODEL } from "./client";
import { EMAIL_SYSTEM } from "./prompts";
import type { Briefing, ICP } from "./icp";

const ANGLES = ["pain", "outcome", "social_proof", "curiosity", "direct"] as const;

export const FollowupSchema = z.object({
  step: z.number().int().min(1).max(4),
  delay_days: z.number().int().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const EmailVariantSchema = z.object({
  label: z.string().min(1),
  angle: z.enum(ANGLES),
  subject: z.string().min(1).max(80),
  body: z.string().min(1),
  followups: z.array(FollowupSchema).length(4),
});
export type EmailVariantOut = z.infer<typeof EmailVariantSchema>;

export const EmailVariantsSchema = z.object({
  variants: z.array(EmailVariantSchema).length(5),
});

const VARIANTS_JSON_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          angle: { type: "string", enum: ANGLES as unknown as string[] },
          subject: { type: "string" },
          body: { type: "string" },
          followups: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                step: { type: "integer" },
                delay_days: { type: "integer" },
                subject: { type: "string" },
                body: { type: "string" },
              },
              required: ["step", "delay_days", "subject", "body"],
            },
          },
        },
        required: ["label", "angle", "subject", "body", "followups"],
      },
    },
  },
  required: ["variants"],
};

export async function generateVariants(
  briefing: Briefing,
  icp: ICP,
  userNotes?: string,
): Promise<EmailVariantOut[]> {
  const userPrompt = `Campaign:
- Offering: ${briefing.offering}
- Target persona: ${icp.persona}
- Top pain points: ${icp.pain_points.join("; ")}
- Value prop: ${icp.value_prop}
- Outcome we deliver: ${briefing.benefit}
- Geography: ${briefing.geography}

Generate 5 distinct cold-email variants in this exact angle order:
1. pain — open with their pain, name it, then offer relief
2. outcome — open with the result other companies got
3. social_proof — open with credibility (number of similar customers, named logos if generic)
4. curiosity — pattern-interrupt; question or unexpected framing
5. direct — straight pitch, no warmup

Each variant has 4 follow-ups at delays 3, 7, 14, 21 days. Each follow-up must
add a NEW angle — not re-pitch the same thing. Don't repeat the subject line
between the initial and the follow-ups.

${userNotes ? `User notes: ${userNotes}` : ""}

Return the JSON now.`;

  const client = anthropic();
  const response = await client.messages.create({
    model: PRIMARY_MODEL(),
    max_tokens: 16_000,
    system: [{ type: "text", text: EMAIL_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: VARIANTS_JSON_SCHEMA,
      },
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Anthropic returned no text content for email variants");
  }
  const parsed = EmailVariantsSchema.parse(JSON.parse(block.text));
  return parsed.variants;
}
