import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!campaign.icp) {
    return NextResponse.json(
      { error: "icp_required", message: "Generate ICP before starting search" },
      { status: 400 },
    );
  }

  const job = await enqueue("search", { campaignId: id });
  await db.campaign.update({
    where: { id },
    data: { status: "searching" },
  });
  await db.job.create({
    data: {
      campaignId: id,
      type: "apollo_search",
      status: "queued",
      bullId: String(job.id),
    },
  });
  return NextResponse.json({ ok: true, jobId: job.id });
}
