import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: { _count: { select: { variants: true } } },
  });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (c._count.variants === 0) {
    return NextResponse.json(
      { error: "variants_required", message: "Generate email variants first" },
      { status: 400 },
    );
  }

  const job = await enqueue("reachinbox", { campaignId: id });
  await db.campaign.update({
    where: { id },
    data: { status: "launching" },
  });
  return NextResponse.json({ ok: true, jobId: job.id });
}
