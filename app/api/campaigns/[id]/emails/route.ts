import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { BriefingSchema, ICPSchema } from "@/lib/anthropic/icp";
import { generateVariants, EmailVariantSchema } from "@/lib/anthropic/emails";

const Body = z.object({
  notes: z.string().optional(),
  // If single label provided, regenerate just that variant; otherwise regenerate all 5.
  label: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const variants = await db.emailVariant.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ variants });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { notes, label } = Body.parse(body);

  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!c.icp)
    return NextResponse.json(
      { error: "icp_required" },
      { status: 400 },
    );

  const briefing = BriefingSchema.parse(c.briefing);
  const icp = ICPSchema.parse(c.icp);

  let variants;
  try {
    variants = await generateVariants(briefing, icp, notes);
  } catch (e) {
    console.error("generateVariants failed", e);
    return NextResponse.json(
      { error: "generation_failed", message: (e as Error).message },
      { status: 502 },
    );
  }

  if (label) {
    const fresh = variants.find((v) => v.label === label) ?? variants[0];
    EmailVariantSchema.parse(fresh);
    await db.emailVariant.updateMany({
      where: { campaignId: id, label },
      data: {
        angle: fresh.angle,
        subject: fresh.subject,
        body: fresh.body,
        followups: fresh.followups,
      },
    });
  } else {
    await db.$transaction([
      db.emailVariant.deleteMany({ where: { campaignId: id } }),
      ...variants.map((v) =>
        db.emailVariant.create({
          data: {
            campaignId: id,
            label: v.label,
            angle: v.angle,
            subject: v.subject,
            body: v.body,
            followups: v.followups,
          },
        }),
      ),
    ]);
    await db.campaign.update({
      where: { id },
      data: { status: "drafting" },
    });
  }

  const fresh = await db.emailVariant.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ variants: fresh });
}

const PatchBody = z.object({
  variantId: z.string(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  followups: z
    .array(
      z.object({
        step: z.number().int().min(1).max(4),
        delay_days: z.number().int().min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .length(4)
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = PatchBody.parse(await req.json());
  await db.emailVariant.update({
    where: { id: data.variantId },
    data: {
      subject: data.subject,
      body: data.body,
      followups: data.followups,
    },
  });
  const fresh = await db.emailVariant.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ variants: fresh });
}
