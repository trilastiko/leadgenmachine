"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ExportPanel({
  campaignId,
  status,
  sheetUrl,
  csvAvailable,
  funnel,
}: {
  campaignId: string;
  status: string;
  sheetUrl: string | null;
  csvAvailable: boolean;
  funnel: { total: number; included: number; valid: number; risky: number; unknown: number };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [includeUnknown, setIncludeUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startExport() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ includeUnknown }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export verified prospects</CardTitle>
        <CardDescription>
          Funnel: {funnel.total} loaded → {funnel.included} included → {funnel.valid} valid
          {funnel.risky > 0 ? ` (+ ${funnel.risky} risky)` : ""}
          {funnel.unknown > 0 ? ` (+ ${funnel.unknown} unknown)` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeUnknown}
            onChange={(e) => setIncludeUnknown(e.target.checked)}
          />
          Also include &quot;unknown&quot; status emails
        </label>

        <div className="flex flex-wrap gap-2">
          <Button onClick={startExport} disabled={pending}>
            {pending
              ? "Exporting…"
              : status === "exported"
                ? "Re-export"
                : "Export to Sheets + CSV"}
          </Button>
          {sheetUrl ? (
            <a href={sheetUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary">Open Google Sheet ↗</Button>
            </a>
          ) : null}
          {csvAvailable ? (
            <a href={`/api/campaigns/${campaignId}/csv`}>
              <Button variant="secondary">Download CSV</Button>
            </a>
          ) : null}
          {status === "exported" ? (
            <a href={`/campaigns/${campaignId}/emails`}>
              <Button>Generate cold emails →</Button>
            </a>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
