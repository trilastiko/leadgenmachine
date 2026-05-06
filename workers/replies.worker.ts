import type { Job } from "bullmq";
import { db } from "../lib/db";
import { categorizeReply } from "../lib/anthropic/replies";
import { BriefingSchema } from "../lib/anthropic/icp";

export type ReplyJobData = {
  campaignId: string;
  replyEventId: string;
};

const AUTO_TAG_THRESHOLD = 0.8;

export async function runReply(job: Job<ReplyJobData>): Promise<{
  tag: string;
  confidence: number;
  autoTagged: boolean;
}> {
  const { campaignId, replyEventId } = job.data;

  const reply = await db.replyEvent.findUnique({
    where: { id: replyEventId },
    include: { prospect: true },
  });
  if (!reply) throw new Error(`replyEvent ${replyEventId} not found`);

  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error(`campaign ${campaignId} not found`);

  const briefing = BriefingSchema.parse(campaign.briefing);
  const context = `Offering: ${briefing.offering}\nValue prop / outcome: ${briefing.benefit}`;

  const cat = await categorizeReply({
    campaignContext: context,
    subject: reply.subject ?? undefined,
    body: reply.body,
  });

  await db.replyEvent.update({
    where: { id: replyEventId },
    data: {
      tag: cat.tag,
      confidence: cat.confidence,
      sentiment: cat.sentiment,
    },
  });

  const autoTagged = cat.confidence >= AUTO_TAG_THRESHOLD;
  if (autoTagged) {
    await db.prospect.update({
      where: { id: reply.prospectId },
      data: { replyTag: cat.tag, replySummary: cat.summary },
    });
  }

  return { tag: cat.tag, confidence: cat.confidence, autoTagged };
}
