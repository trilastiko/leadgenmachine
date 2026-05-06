"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Filters = {
  person_titles: string[];
  person_seniorities: string[];
  person_locations: string[];
  organization_locations: string[];
  organization_industries: string[];
  organization_num_employees_ranges: string[];
};

export type ICPView = {
  persona: string;
  pain_points: string[];
  value_prop: string;
  why_good_fit: string;
  apollo_filters: Filters;
};

const FILTER_LABELS: Record<keyof Filters, string> = {
  person_titles: "Job titles",
  person_seniorities: "Seniorities",
  person_locations: "Person locations",
  organization_locations: "Company HQ locations",
  organization_industries: "Industries",
  organization_num_employees_ranges: "Employee count ranges",
};

export function IcpEditor({
  campaignId,
  initial,
}: {
  campaignId: string;
  initial: ICPView | null;
}) {
  const router = useRouter();
  const [icp, setIcp] = useState<ICPView | null>(initial);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setFilter(key: keyof Filters, values: string[]) {
    if (!icp) return;
    setIcp({ ...icp, apollo_filters: { ...icp.apollo_filters, [key]: values } });
  }

  async function regenerate() {
    setError(null);
    const res = await fetch(`/api/campaigns/${campaignId}/icp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || undefined }),
    });
    if (!res.ok) {
      setError(`Regeneration failed: ${await res.text()}`);
      return;
    }
    const { icp: next } = (await res.json()) as { icp: ICPView };
    setIcp(next);
  }

  async function save() {
    setError(null);
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ icp }),
    });
    if (!res.ok) setError(`Save failed: ${await res.text()}`);
  }

  async function startSearch() {
    await save();
    const res = await fetch(`/api/campaigns/${campaignId}/search`, {
      method: "POST",
    });
    if (!res.ok) {
      setError(`Search start failed: ${await res.text()}`);
      return;
    }
    router.push(`/campaigns/${campaignId}/prospects`);
  }

  if (!icp) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ICP not generated yet</CardTitle>
          <CardDescription>
            The initial generation didn&apos;t return a result. Click below to retry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => startTransition(regenerate)}
            disabled={pending}
          >
            {pending ? "Generating…" : "Generate ICP"}
          </Button>
          {error ? (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Persona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{icp.persona}</p>
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Pain points
            </h4>
            <ul className="list-disc pl-4">
              {icp.pain_points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Value prop
            </h4>
            <p>{icp.value_prop}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Why a good fit
            </h4>
            <p>{icp.why_good_fit}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apollo search filters</CardTitle>
          <CardDescription>
            Edit each list as a comma-separated string. These map directly to Apollo&apos;s search API.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(Object.keys(FILTER_LABELS) as Array<keyof Filters>).map((key) => (
            <div key={key}>
              <label className="text-xs font-medium uppercase text-muted-foreground">
                {FILTER_LABELS[key]}
              </label>
              <Textarea
                value={icp.apollo_filters[key].join(", ")}
                onChange={(e) =>
                  setFilter(
                    key,
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refine with notes</CardTitle>
          <CardDescription>
            Add steering notes (e.g. &quot;exclude staffing agencies&quot;), then regenerate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. focus on mid-market, exclude agencies and consulting firms"
            rows={3}
          />
          <Button
            variant="secondary"
            onClick={() => startTransition(regenerate)}
            disabled={pending}
          >
            {pending ? "Regenerating…" : "Regenerate ICP"}
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={save} disabled={pending}>
          Save edits
        </Button>
        <Button onClick={startSearch} disabled={pending}>
          Start Apollo search →
        </Button>
      </div>
    </div>
  );
}
