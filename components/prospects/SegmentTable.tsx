"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  buildSegments,
  prospectMatchesSegment,
  type ProspectLite,
  type Segment,
} from "@/lib/segmentation";

type Dim = Segment["dimension"];

const DIM_LABELS: Record<Dim, string> = {
  seniority: "Seniority",
  industry: "Industry",
  location: "Location",
  companySize: "Company size",
};

export function SegmentTable({
  campaignId,
  prospects,
  status,
}: {
  campaignId: string;
  prospects: ProspectLite[];
  status: string;
}) {
  const router = useRouter();
  const segments = useMemo(() => buildSegments(prospects), [prospects]);
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<"verify" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const includedCount = useMemo(() => {
    let n = 0;
    outer: for (const p of prospects) {
      for (const dim of Object.keys(DIM_LABELS) as Dim[]) {
        for (const seg of segments[`by${capitalize(dim)}` as keyof typeof segments]) {
          if (
            excluded[seg.key] &&
            prospectMatchesSegment(p, seg.dimension, seg.value)
          ) {
            continue outer;
          }
        }
      }
      n += 1;
    }
    return n;
  }, [prospects, segments, excluded]);

  const includedWithEmail = useMemo(() => {
    let n = 0;
    outer: for (const p of prospects) {
      if (!p.email) continue;
      for (const dim of Object.keys(DIM_LABELS) as Dim[]) {
        for (const seg of segments[`by${capitalize(dim)}` as keyof typeof segments]) {
          if (
            excluded[seg.key] &&
            prospectMatchesSegment(p, seg.dimension, seg.value)
          ) {
            continue outer;
          }
        }
      }
      n += 1;
    }
    return n;
  }, [prospects, segments, excluded]);

  function toggle(seg: Segment) {
    setExcluded((cur) => ({ ...cur, [seg.key]: !cur[seg.key] }));
  }

  async function persistSelection() {
    const allSegs: Segment[] = [
      ...segments.bySeniority,
      ...segments.byIndustry,
      ...segments.byLocation,
      ...segments.byCompanySize,
    ];
    const body = {
      segments: allSegs.map((s) => ({
        dimension: s.dimension,
        value: s.value,
        include: !excluded[s.key],
      })),
    };
    const res = await fetch(`/api/campaigns/${campaignId}/prospects`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  async function startVerify() {
    setError(null);
    setPending("verify");
    try {
      await persistSelection();
      const res = await fetch(`/api/campaigns/${campaignId}/verify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function saveOnly() {
    setError(null);
    setPending("save");
    try {
      await persistSelection();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  if (prospects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {status === "searching"
          ? "Search is running. This page refreshes automatically."
          : "No prospects yet. Run an Apollo search from the ICP page first."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={prospects.length} />
        <Stat label="Included" value={includedCount} />
        <Stat
          label="With email"
          value={includedWithEmail}
          subtext={`of ${prospects.filter((p) => p.email).length}`}
        />
        <Stat
          label="Email status"
          value={prospects.filter((p) => p.emailStatus === "valid").length}
          subtext="valid"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(DIM_LABELS) as Dim[]).map((dim) => {
          const segs =
            segments[`by${capitalize(dim)}` as keyof typeof segments];
          return (
            <div key={dim} className="rounded-lg border">
              <div className="border-b px-4 py-2 text-sm font-medium">
                {DIM_LABELS[dim]}
              </div>
              <ul className="divide-y">
                {segs.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!excluded[s.key]}
                        onChange={() => toggle(s)}
                      />
                      <span>{s.value}</span>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {s.count} ({s.withEmail} w/ email)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={saveOnly}
          disabled={pending !== null}
        >
          {pending === "save" ? "Saving…" : "Save selection"}
        </Button>
        <Button onClick={startVerify} disabled={pending !== null}>
          {pending === "verify"
            ? "Starting verify…"
            : `Verify ${includedWithEmail} emails →`}
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtext ? (
        <div className="text-xs text-muted-foreground">{subtext}</div>
      ) : null}
    </div>
  );
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
