import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { VariantEditor, type Followup, type Variant } from "@/components/emails/VariantEditor";

export const dynamic = "force-dynamic";

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) notFound();

  const rows = await db.emailVariant.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });

  const variants: Variant[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    angle: r.angle,
    subject: r.subject,
    body: r.body,
    followups: (r.followups as unknown as Followup[]) ?? [],
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/campaigns/${id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {c.name}
      </Link>
      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Cold emails</h1>
        <span className="rounded-md border px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          {c.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Five variants across distinct angles. Each has 4 follow-ups at 3, 7,
        14, 21 days. Edit inline; launch when ready.
      </p>

      <div className="mt-8">
        <VariantEditor
          campaignId={id}
          initial={variants}
          status={c.status}
        />
      </div>
    </main>
  );
}
