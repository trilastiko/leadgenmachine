"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type Followup = {
  step: number;
  delay_days: number;
  subject: string;
  body: string;
};

export type Variant = {
  id: string;
  label: string;
  angle: string;
  subject: string;
  body: string;
  followups: Followup[];
};

export function VariantEditor({
  campaignId,
  initial,
  status,
}: {
  campaignId: string;
  initial: Variant[];
  status: string;
}) {
  const router = useRouter();
  const [variants, setVariants] = useState<Variant[]>(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  async function generate(label?: string) {
    setError(null);
    setPending(label ?? "all");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/emails`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || undefined, label }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const { variants: next } = (await res.json()) as { variants: Variant[] };
      setVariants(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function saveVariant(v: Variant) {
    setError(null);
    setPending(v.id);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/emails`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantId: v.id,
          subject: v.subject,
          body: v.body,
          followups: v.followups,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const { variants: next } = (await res.json()) as { variants: Variant[] };
      setVariants(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  function patchLocal(id: string, patch: Partial<Variant>) {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function patchFollowup(
    id: string,
    step: number,
    patch: Partial<Followup>,
  ) {
    setVariants((vs) =>
      vs.map((v) =>
        v.id === id
          ? {
              ...v,
              followups: v.followups.map((f) =>
                f.step === step ? { ...f, ...patch } : f,
              ),
            }
          : v,
      ),
    );
  }

  async function launch() {
    setError(null);
    setPending("launch");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/launch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      router.push(`/campaigns/${campaignId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  if (variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate cold email variants</CardTitle>
          <CardDescription>
            Claude will produce 5 distinct angles, each with a 4-step follow-up
            sequence. You can edit and regenerate any of them after.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional steering notes (e.g. tone, things to mention, things to avoid)"
            rows={3}
          />
          <Button
            onClick={() => generate()}
            disabled={pending !== null}
          >
            {pending === "all" ? "Generating…" : "Generate 5 variants"}
          </Button>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="text-sm">
          <div className="font-medium">{variants.length} variants ready</div>
          <div className="text-muted-foreground">
            Edit inline, regenerate any single variant, or push live to ReachInbox.
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => generate()}
            disabled={pending !== null}
          >
            {pending === "all" ? "Regenerating…" : "Regenerate all"}
          </Button>
          <Button onClick={launch} disabled={pending !== null}>
            {pending === "launch"
              ? "Launching…"
              : status === "live"
                ? "Re-launch"
                : "Launch in ReachInbox →"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <label className="text-xs font-medium uppercase text-muted-foreground">
          Steering notes (used by next regeneration)
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {variants.map((v) => (
          <Card key={v.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{v.label}</CardTitle>
                  <CardDescription>angle: {v.angle}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generate(v.label)}
                    disabled={pending !== null}
                  >
                    {pending === v.label ? "Regenerating…" : "Regen"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveVariant(v)}
                    disabled={pending !== null}
                  >
                    {pending === v.id ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  Subject
                </label>
                <Input
                  value={v.subject}
                  onChange={(e) =>
                    patchLocal(v.id, { subject: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  Body
                </label>
                <Textarea
                  value={v.body}
                  onChange={(e) => patchLocal(v.id, { body: e.target.value })}
                  rows={8}
                />
              </div>
              <details className="rounded-md border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                  Follow-up sequence ({v.followups.length} steps)
                </summary>
                <div className="space-y-3 p-3">
                  {v.followups.map((f) => (
                    <div key={f.step} className="space-y-2 rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">
                        Step {f.step} · {f.delay_days} days after previous
                      </div>
                      <Input
                        value={f.subject}
                        onChange={(e) =>
                          patchFollowup(v.id, f.step, { subject: e.target.value })
                        }
                      />
                      <Textarea
                        value={f.body}
                        onChange={(e) =>
                          patchFollowup(v.id, f.step, { body: e.target.value })
                        }
                        rows={5}
                      />
                    </div>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
