import fs from "node:fs/promises";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SegmentTable } from "@/components/prospects/SegmentTable";
import { ExportPanel } from "@/components/prospects/ExportPanel";

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

  const funnel = {
    total: prospects.length,
    included: prospects.filter((p) => p.includeForOutreach).length,
    valid: prospects.filter(
      (p) => p.includeForOutreach && p.emailStatus === "valid",
    ).length,
    risky: prospects.filter(
      (p) => p.includeForOutreach && p.emailStatus === "risky",
    ).length,
    unknown: prospects.filter(
      (p) => p.includeForOutreach && p.emailStatus === "unknown",
    ).length,
  };

  let csvAvailable = false;
  if (c.csvPath) {
    csvAvailable = await fs
      .stat(c.csvPath)
      .then(() => true)
      .catch(() => false);
  }

  const showExport =
    c.status === "verified" ||
    c.status === "exported" ||
    c.status === "drafting" ||
    c.status === "live" ||
    funnel.valid > 0;

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

      <div className="mt-8 space-y-6">
        <SegmentTable
          campaignId={id}
          prospects={prospects}
          status={c.status}
        />
        {showExport ? (
          <ExportPanel
            campaignId={id}
            status={c.status}
            sheetUrl={c.sheetUrl}
            csvAvailable={csvAvailable}
            funnel={funnel}
          />
        ) : null}
      </div>
    </main>
  );
}
