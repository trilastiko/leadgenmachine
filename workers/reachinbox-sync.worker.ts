import type { Job } from "bullmq";
import { db } from "../lib/db";
import { getAnalytics, listReplies } from "../lib/reachinbox/campaigns";
import { enqueue } from "../lib/queue";

export type SyncJobData = { campaignId: string };

/**
 * Pulls latest performance + replies from ReachInbox for one campaign,
 * upserts ReplyEvent rows, enqueues categorization for any new replies,
 * and updates per-variant counts on EmailVariant.
 *
 * Designed to run on a repeating schedule (every 15 min by default).
 */
export async function runSync(job: Job<SyncJobData>): Promise<{
  newReplies: number;
}> {
  const { campaignId } = job.data;
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign?.reachinboxId) {
    return { newReplies: 0 };
  }

  // 1) Aggregate performance — apply to the primary variant for now since the
  //    launcher only configures one variant in RI. When multi-variant lands,
  //    pull per-variant breakdown.
  try {
    const stats = await getAnalytics(campaign.reachinboxId);
    const primary = await db.emailVariant.findFirst({
      where: { campaignId },
      orderBy: { createdAt: "asc" },
    });
    if (primary) {
      await db.emailVariant.update({
        where: { id: primary.id },
        data: {
          sent: stats.sent ?? 0,
          opened: stats.opened ?? 0,
          replied: stats.replied ?? 0,
        },
      });
    }
  } catch (e) {
    console.error("[sync] analytics failed", e);
  }

  // 2) Pull replies. We use the latest ReplyEvent.receivedAt as a watermark
  //    when supported by the API; otherwise we rely on dedup-by-id.
  let newReplies = 0;
  try {
    const lastReply = await db.replyEvent.findFirst({
      where: { prospect: { campaignId } },
      orderBy: { receivedAt: "desc" },
    });
    const replies = await listReplies(campaign.reachinboxId, {
      since: lastReply?.receivedAt.toISOString(),
    });

    for (const r of replies) {
      const prospect = await db.prospect.findFirst({
        where: { campaignId, email: r.lead_email.toLowerCase() },
      });
      if (!prospect) continue;

      const exists = await db.replyEvent.findFirst({
        where: { prospectId: prospect.id, receivedAt: new Date(r.received_at) },
      });
      if (exists) continue;

      const created = await db.replyEvent.create({
        data: {
          prospectId: prospect.id,
          receivedAt: new Date(r.received_at),
          subject: r.subject ?? null,
          body: r.body,
          raw: r as unknown as object,
        },
      });
      await db.prospect.update({
        where: { id: prospect.id },
        data: { repliedAt: new Date(r.received_at) },
      });
      await enqueue("reply", { campaignId, replyEventId: created.id });
      newReplies += 1;
    }
  } catch (e) {
    console.error("[sync] replies failed", e);
  }

  return { newReplies };
}
