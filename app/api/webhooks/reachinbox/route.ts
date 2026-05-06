import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/queue";

/**
 * ReachInbox webhook receiver.
 *
 * ReachInbox webhooks are configured in their dashboard. The exact payload
 * shape depends on the event type (sent, opened, clicked, replied, bounced).
 * We accept any JSON, find a matching campaign by `reachinbox_campaign_id`
 * field if present, and enqueue a sync job to pull canonical state.
 *
 * No webhook signature validation is performed; if ReachInbox supports it,
 * add it here.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    /* empty body is fine — still return 200 */
  }

  const reachinboxId =
    (payload.campaign_id as string | undefined) ??
    (payload.reachinbox_campaign_id as string | undefined) ??
    null;

  if (reachinboxId) {
    const campaign = await db.campaign.findFirst({
      where: { reachinboxId },
    });
    if (campaign) {
      await enqueue("sync", { campaignId: campaign.id });
    }
  }

  return NextResponse.json({ received: true });
}
