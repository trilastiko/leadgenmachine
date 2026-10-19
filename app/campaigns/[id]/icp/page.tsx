import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ICPSchema } from "@/lib/anthropic/icp";
import { IcpEditor, type ICPView } from "@/components/icp/IcpEditor";

export default async function IcpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  let icp: ICPView | null = null;
  if (campaign.icp) {
    const parsed = ICPSchema.safeParse(campaign.icp);
    if (parsed.success) icp = parsed.data;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/campaigns/${id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {campaign.name}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Ideal Customer Profile
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Generated from your briefing. Tweak the filters below or regenerate
        with notes, then start the Apollo search.
      </p>
      <div className="mt-8">
        <IcpEditor campaignId={id} initial={icp} />
      </div>
    </main>
  );
}
