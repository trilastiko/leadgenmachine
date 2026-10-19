import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { prospectMatchesSegment } from "@/lib/segmentation";

const Patch = z.object({
  segments: z.array(
    z.object({
      dimension: z.enum(["seniority", "industry", "location", "companySize"]),
      value: z.string(),
      include: z.boolean(),
    }),
  ),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prospects = await db.prospect.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      seniority: true,
      industry: true,
      location: true,
      companySize: true,
      email: true,
      emailStatus: true,
      includeForOutreach: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ prospects });
}

/** Bulk update includeForOutreach by segment selection. */
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

  const all = await db.prospect.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      seniority: true,
      industry: true,
      location: true,
      companySize: true,
      email: true,
      emailStatus: true,
      includeForOutreach: true,
    },
  });

  // For each prospect compute include = AND over each chosen dimension's segments.
  // If a dimension has no excluded segments, the prospect is included on that axis.
  const excludedByDimension = new Map<string, Set<string>>();
  for (const seg of parsed.data.segments) {
    if (seg.include) continue;
    const set = excludedByDimension.get(seg.dimension) ?? new Set();
    set.add(seg.value);
    excludedByDimension.set(seg.dimension, set);
  }

  const updates: { id: string; include: boolean }[] = [];
  for (const p of all) {
    let include = true;
    for (const [dim, excl] of excludedByDimension.entries()) {
      for (const v of excl) {
        if (
          prospectMatchesSegment(
            p,
            dim as "seniority" | "industry" | "location" | "companySize",
            v,
          )
        ) {
          include = false;
          break;
        }
      }
      if (!include) break;
    }
    if (include !== p.includeForOutreach) {
      updates.push({ id: p.id, include });
    }
  }

  await db.$transaction(
    updates.map((u) =>
      db.prospect.update({
        where: { id: u.id },
        data: { includeForOutreach: u.include },
      }),
    ),
  );

  return NextResponse.json({ updated: updates.length });
}
