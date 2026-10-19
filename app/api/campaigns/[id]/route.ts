import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.string().optional(),
  icp: z.unknown().optional(),
  targetCount: z.number().int().positive().optional(),
  sendDailyCap: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: { _count: { select: { prospects: true, variants: true } } },
  });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Patch.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const updated = await db.campaign.update({
    where: { id },
    data: parsed.data as Parameters<typeof db.campaign.update>[0]["data"],
  });
  return NextResponse.json(updated);
}
