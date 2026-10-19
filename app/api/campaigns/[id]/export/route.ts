import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/queue";

const Body = z
  .object({
    includeUnknown: z.boolean().optional(),
  })
  .partial();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = Body.safeParse(await req.json().catch(() => ({})));
  const includeUnknown = body.success ? body.data.includeUnknown : false;

  const job = await enqueue("export", { campaignId: id, includeUnknown });
  return NextResponse.json({ ok: true, jobId: job.id });
}
