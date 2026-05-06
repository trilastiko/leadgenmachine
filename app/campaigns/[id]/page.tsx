import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StatsRow, VariantPerf } from "@/components/dashboard/Stats";
import { HotLeads } from "@/components/dashboard/HotLeads";

export const dynamic = "force-dynamic";

export default async function CampaignDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: {
      _count: { select: { prospects: true, variants: true } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) notFound();

  const hotProspects = await db.prospect.findMany({
    where: { campaignId: id, replyTag: "hot" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      title: true,
      companyName: true,
      replySummary: true,
      replies: {
        orderBy: { receivedAt: "desc" },
        take: 1,
        select: { receivedAt: true, body: true },
      },
    },
    orderBy: { repliedAt: "desc" },
    take: 20,
  });

  const hotLeads = hotProspects.map((p) => ({
    prospectId: p.id,
    email: p.email,
    name: [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown",
    company: p.companyName,
    title: p.title,
    summary: p.replySummary,
    receivedAt: p.replies[0]?.receivedAt ?? new Date(0),
    body: p.replies[0]?.body ?? "",
  }));

  const variants = c.variants.map((v) => ({
    label: v.label,
    angle: v.angle,
    sent: v.sent,
    opened: v.opened,
    replied: v.replied,
  }));

  const links: Array<{ href: string; label: string; sub: string }> = [
    { href: `/campaigns/${id}/icp`, label: "ICP", sub: "Persona + Apollo filters" },
    {
      href: `/campaigns/${id}/prospects`,
      label: "Prospects",
      sub: `${c._count.prospects} loaded`,
    },
    {
      href: `/campaigns/${id}/emails`,
      label: "Emails",
      sub: `${c._count.variants} variants`,
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← All campaigns
      </Link>
      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{c.name}</h1>
        <span className="rounded-md border px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          {c.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Created {c.createdAt.toLocaleString()}
        {c.reachinboxId ? ` · ReachInbox: ${c.reachinboxId}` : ""}
      </p>

      <ul className="mt-6 grid gap-3 md:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-lg border p-4 hover:bg-accent"
            >
              <div className="font-medium">{l.label}</div>
              <div className="text-xs text-muted-foreground">{l.sub}</div>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-medium uppercase text-muted-foreground">
        Performance
      </h2>
      <div className="mt-3">
        <StatsRow variants={variants} hotLeads={hotLeads.length} />
      </div>

      <div className="mt-6">
        <VariantPerf variants={variants} />
      </div>

      <h2 className="mt-10 text-sm font-medium uppercase text-muted-foreground">
        Hot leads
      </h2>
      <div className="mt-3">
        <HotLeads leads={hotLeads} />
      </div>
    </main>
  );
}
