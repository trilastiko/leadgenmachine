import type { Job } from "bullmq";
import { db } from "../lib/db";
import {
  addLeads,
  configureSequence,
  createCampaign,
  startCampaign,
} from "../lib/reachinbox/campaigns";
import type { RISequenceStep } from "../lib/reachinbox/types";

export type ReachInboxJobData = { campaignId: string };

const SEND_DAYS = ["mon", "tue", "wed", "thu", "fri"];

export async function runReachInboxLaunch(
  job: Job<ReachInboxJobData>,
): Promise<{ reachinboxId: string; leads: number }> {
  const { campaignId } = job.data;
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { variants: true },
  });
  if (!campaign) throw new Error(`campaign ${campaignId} not found`);
  if (campaign.variants.length === 0) {
    throw new Error("no email variants — generate first");
  }

  const prospects = await db.prospect.findMany({
    where: {
      campaignId,
      includeForOutreach: true,
      email: { not: null },
      emailStatus: { in: ["valid", "unknown"] },
    },
  });
  if (prospects.length === 0) {
    throw new Error("no verified prospects to launch");
  }

  const created = await createCampaign({
    name: `${campaign.name} — ${new Date().toISOString().slice(0, 10)}`,
    daily_limit: campaign.sendDailyCap,
    schedule: {
      timezone: "UTC",
      days: SEND_DAYS,
      start_hour: 9,
      end_hour: 17,
    },
  });

  // Use the first variant for the initial sequence; A/B testing across all 5
  // is a follow-up enhancement once we know exactly what shape ReachInbox's
  // multi-variant config takes.
  const primary = campaign.variants[0];
  const followups = (primary.followups as Array<{
    step: number;
    delay_days: number;
    subject: string;
    body: string;
  }>);

  const steps: RISequenceStep[] = [
    {
      step: 1,
      delay_days: 0,
      subject: primary.subject,
      body: primary.body,
    },
    ...followups
      .sort((a, b) => a.step - b.step)
      .map((f) => ({
        step: f.step + 1,
        delay_days: f.delay_days,
        subject: f.subject,
        body: f.body,
      })),
  ];
  await configureSequence(created.id, steps);

  const leads = prospects.map((p) => ({
    email: p.email!,
    first_name: p.firstName ?? undefined,
    last_name: p.lastName ?? undefined,
    company: p.companyName ?? undefined,
    title: p.title ?? undefined,
  }));
  await addLeads(created.id, leads);

  await startCampaign(created.id);

  // Mark prospects as sent-tagged with the primary variant for now; the sync
  // worker will fill in actual sent timestamps from RI analytics.
  await db.$transaction([
    db.campaign.update({
      where: { id: campaignId },
      data: {
        reachinboxId: created.id,
        status: "live",
      },
    }),
    db.prospect.updateMany({
      where: {
        campaignId,
        includeForOutreach: true,
        email: { not: null },
        emailStatus: { in: ["valid", "unknown"] },
      },
      data: { variantSent: primary.label },
    }),
  ]);

  return { reachinboxId: created.id, leads: leads.length };
}
