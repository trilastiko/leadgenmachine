import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { BriefingSchema, synthesizeIcp } from "@/lib/anthropic/icp";

const Body = z.object({
  name: z.string().min(1).max(120),
  briefing: BriefingSchema,
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { name, briefing } = parsed.data;

  const campaign = await db.campaign.create({
    data: { name, briefing, status: "briefed" },
  });

  // Synthesize ICP eagerly so the user lands on the review screen with content.
  // This is a single Claude call (~3–5s); inline is acceptable. Failures are
  // recoverable — campaign stays in "briefed" status and the ICP page shows
  // a "Generate ICP" button.
  try {
    const icp = await synthesizeIcp(briefing);
    await db.campaign.update({
      where: { id: campaign.id },
      data: { icp },
    });
  } catch (e) {
    console.error("synthesizeIcp failed", e);
  }

  return NextResponse.json({ id: campaign.id });
}

export async function GET() {
  const items = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ campaigns: items });
}
