import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const job = await enqueue("verify", { campaignId: id });
  await db.campaign.update({
    where: { id },
    data: { status: "verifying" },
  });
  return NextResponse.json({ ok: true, jobId: job.id });
}
