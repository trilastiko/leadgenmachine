import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { BriefingSchema, synthesizeIcp } from "@/lib/anthropic/icp";

const Body = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.parse(json);

  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const briefing = BriefingSchema.parse(campaign.briefing);

  try {
    const icp = await synthesizeIcp(briefing, parsed.notes);
    await db.campaign.update({ where: { id }, data: { icp } });
    return NextResponse.json({ icp });
  } catch (e) {
    console.error("synthesizeIcp failed", e);
    return NextResponse.json(
      { error: "icp_generation_failed", message: (e as Error).message },
      { status: 502 },
    );
  }
}
