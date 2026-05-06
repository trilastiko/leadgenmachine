import { z } from "zod";
import { anthropic, FAST_MODEL } from "./client";
import { REPLY_SYSTEM } from "./prompts";

export const REPLY_TAGS = ["hot", "objection", "not_interested", "ooo"] as const;

export const ReplyCategorizationSchema = z.object({
  tag: z.enum(REPLY_TAGS),
  confidence: z.number().min(0).max(1),
  sentiment: z.enum(["positive", "objection", "negative", "neutral"]),
  summary: z.string().min(1).max(280),
});
export type ReplyCategorization = z.infer<typeof ReplyCategorizationSchema>;

const REPLY_JSON_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    tag: { type: "string", enum: REPLY_TAGS as unknown as string[] },
    confidence: { type: "number" },
    sentiment: {
      type: "string",
      enum: ["positive", "objection", "negative", "neutral"],
    },
    summary: { type: "string" },
  },
  required: ["tag", "confidence", "sentiment", "summary"],
};

export async function categorizeReply(input: {
  campaignContext: string;
  subject?: string;
  body: string;
}): Promise<ReplyCategorization> {
  const client = anthropic();
  const response = await client.messages.create({
    model: FAST_MODEL(),
    max_tokens: 800,
    system: [{ type: "text", text: REPLY_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: REPLY_JSON_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: `Campaign context: ${input.campaignContext}

Reply subject: ${input.subject ?? "(none)"}
Reply body:
${input.body}

Categorize this reply.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Anthropic returned no text content for reply categorization");
  }
  return ReplyCategorizationSchema.parse(JSON.parse(block.text));
}
