import Link from "next/link";
import { db } from "@/lib/db";

export default async function HomePage() {
  const campaigns = await db.campaign
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { prospects: true } } },
    })
    .catch(() => []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Lead Gen Machine</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Brief → ICP → Apollo → Verify → Sheets → Cold email → ReachInbox.
          </p>
        </div>
        <Link
          href="/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New campaign
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent campaigns</h2>
      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No campaigns yet. Click <span className="font-medium">New campaign</span> to start.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.status} · {c._count.prospects} prospects
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.createdAt.toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
