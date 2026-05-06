import { riGet, riPost } from "./client";
import type {
  RICampaign,
  RICampaignAnalytics,
  RILead,
  RIReply,
  RISequenceStep,
} from "./types";

/**
 * High-level wrappers around campaign operations.
 *
 * IMPORTANT: ReachInbox does not publish a comprehensive REST API reference.
 * The endpoint paths used here are best-guesses based on common patterns and
 * what's referenced in their Clay/Zapier integration docs. Verify each
 * endpoint against live responses during smoke tests; override paths via
 * the constants below.
 */

const PATHS = {
  campaigns: "/campaigns",
  campaignById: (id: string) => `/campaigns/${id}`,
  campaignLeads: (id: string) => `/campaigns/${id}/leads`,
  campaignSequence: (id: string) => `/campaigns/${id}/sequence`,
  campaignStart: (id: string) => `/campaigns/${id}/start`,
  campaignPause: (id: string) => `/campaigns/${id}/pause`,
  campaignAnalytics: (id: string) => `/campaigns/${id}/analytics`,
  campaignReplies: (id: string) => `/campaigns/${id}/replies`,
};

export async function listCampaigns(): Promise<RICampaign[]> {
  const res = await riGet<{ data?: RICampaign[]; campaigns?: RICampaign[] }>(
    PATHS.campaigns,
  );
  return res.data ?? res.campaigns ?? [];
}

export async function createCampaign(input: {
  name: string;
  daily_limit?: number;
  schedule?: { timezone?: string; days?: string[]; start_hour?: number; end_hour?: number };
}): Promise<RICampaign> {
  return riPost<RICampaign>(PATHS.campaigns, input);
}

export async function addLeads(
  campaignId: string,
  leads: Array<Omit<RILead, "id" | "campaign_id">>,
): Promise<{ added: number }> {
  const res = await riPost<{ added?: number; count?: number }>(
    PATHS.campaignLeads(campaignId),
    { leads },
  );
  return { added: res.added ?? res.count ?? leads.length };
}

export async function configureSequence(
  campaignId: string,
  steps: RISequenceStep[],
): Promise<void> {
  await riPost<unknown>(PATHS.campaignSequence(campaignId), { steps });
}

export async function startCampaign(campaignId: string): Promise<void> {
  await riPost<unknown>(PATHS.campaignStart(campaignId), {});
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  await riPost<unknown>(PATHS.campaignPause(campaignId), {});
}

export async function getAnalytics(
  campaignId: string,
): Promise<RICampaignAnalytics> {
  return riGet<RICampaignAnalytics>(PATHS.campaignAnalytics(campaignId));
}

export async function listReplies(
  campaignId: string,
  opts: { since?: string } = {},
): Promise<RIReply[]> {
  const qs = opts.since ? `?since=${encodeURIComponent(opts.since)}` : "";
  const res = await riGet<{ data?: RIReply[]; replies?: RIReply[] }>(
    `${PATHS.campaignReplies(campaignId)}${qs}`,
  );
  return res.data ?? res.replies ?? [];
}
