import { z } from "zod";
import { anthropic, PRIMARY_MODEL } from "./client";
import { ICP_SYSTEM } from "./prompts";

export const BriefingSchema = z.object({
  offering: z.string().min(1),
  targetRoles: z.string().min(1),
  companyType: z.string().min(1),
  painPoint: z.string().min(1),
  benefit: z.string().min(1),
  geography: z.string().min(1),
  otherFilters: z.string().optional().default(""),
});
export type Briefing = z.infer<typeof BriefingSchema>;

export const ApolloFiltersSchema = z.object({
  person_titles: z.array(z.string()).default([]),
  person_seniorities: z.array(z.string()).default([]),
  person_locations: z.array(z.string()).default([]),
  organization_locations: z.array(z.string()).default([]),
  organization_industries: z.array(z.string()).default([]),
  organization_num_employees_ranges: z.array(z.string()).default([]),
});
export type ApolloFiltersOut = z.infer<typeof ApolloFiltersSchema>;

export const ICPSchema = z.object({
  persona: z.string().min(1),
  pain_points: z.array(z.string()).min(1),
  value_prop: z.string().min(1),
  why_good_fit: z.string().min(1),
  apollo_filters: ApolloFiltersSchema,
});
export type ICP = z.infer<typeof ICPSchema>;

const ICP_JSON_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    persona: { type: "string" },
    pain_points: { type: "array", items: { type: "string" } },
    value_prop: { type: "string" },
    why_good_fit: { type: "string" },
    apollo_filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        person_titles: { type: "array", items: { type: "string" } },
        person_seniorities: { type: "array", items: { type: "string" } },
        person_locations: { type: "array", items: { type: "string" } },
        organization_locations: { type: "array", items: { type: "string" } },
        organization_industries: { type: "array", items: { type: "string" } },
        organization_num_employees_ranges: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "person_titles",
        "person_seniorities",
        "person_locations",
        "organization_locations",
        "organization_industries",
        "organization_num_employees_ranges",
      ],
    },
  },
  required: [
    "persona",
    "pain_points",
    "value_prop",
    "why_good_fit",
    "apollo_filters",
  ],
};

export async function synthesizeIcp(briefing: Briefing, notes?: string): Promise<ICP> {
  const userPrompt = `Campaign brief:

What we're offering: ${briefing.offering}
Who we want to talk to: ${briefing.targetRoles}
What kind of companies: ${briefing.companyType}
Their main pain point: ${briefing.painPoint}
Outcome we deliver: ${briefing.benefit}
Geographic focus: ${briefing.geography}
Other constraints: ${briefing.otherFilters || "(none)"}
${notes ? `\nUser notes for refinement: ${notes}` : ""}

Apollo filter guidance:
- person_seniorities ∈ {owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern}
- organization_num_employees_ranges format: "min,max" (e.g. ["50,200","201,500"])
- person_locations / organization_locations: specific cities, states, or countries (Apollo accepts free-form strings)
- organization_industries: realistic industry names (e.g. "computer software", "financial services")
- person_titles: 3–8 representative titles, not exhaustive

Return the ICP JSON now.`;

  const client = anthropic();
  const response = await client.messages.create({
    model: PRIMARY_MODEL(),
    max_tokens: 4_000,
    system: [{ type: "text", text: ICP_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: ICP_JSON_SCHEMA,
      },
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Anthropic returned no text content for ICP");
  }
  const json = JSON.parse(block.text);
  return ICPSchema.parse(json);
}
