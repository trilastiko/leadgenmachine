import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function ProspectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await db.campaign.findUnique({
    where: { id },
    include: { _count: { select: { prospects: true } } },
  });
  if (!c) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/campaigns/${id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {c.name}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Prospects</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: <span className="font-medium">{c.status}</span> ·{" "}
        {c._count.prospects} prospects loaded.
      </p>
      <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {c.status === "searching"
          ? "Search is running. Prospects will appear here when complete."
          : "Segmentation UI lands in the next commit."}
      </div>
    </main>
  );
}
