import Link from "next/link";
import { Wizard } from "@/components/wizard/Wizard";

export default function NewCampaignPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Back to campaigns
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">New campaign</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Answer 7 simple questions. Takes about 2–3 minutes. You can also copy
        these to send to a client and paste their answers back.
      </p>
      <div className="mt-8">
        <Wizard />
      </div>
    </main>
  );
}
