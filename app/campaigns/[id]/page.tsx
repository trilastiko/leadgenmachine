import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: { _count: { select: { prospects: true, variants: true } } },
  });
  if (!c) notFound();

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
    <main className="mx-auto max-w-3xl px-6 py-12">
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
      </p>

      <ul className="mt-8 grid gap-3 md:grid-cols-3">
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
    </main>
  );
}
