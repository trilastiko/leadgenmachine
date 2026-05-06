import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SegmentTable } from "@/components/prospects/SegmentTable";

export const dynamic = "force-dynamic";

export default async function ProspectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) notFound();

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/campaigns/${id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {c.name}
      </Link>
      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Prospects</h1>
        <span className="rounded-md border px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          {c.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {prospects.length} loaded from Apollo. Toggle segments off to exclude
        them, then verify the included emails with Reoon.
      </p>

      <div className="mt-8">
        <SegmentTable
          campaignId={id}
          prospects={prospects}
          status={c.status}
        />
      </div>
    </main>
  );
}
