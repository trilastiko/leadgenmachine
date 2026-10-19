"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Question = {
  key: keyof Briefing;
  prompt: string;
  hint: string;
  example: string;
  long?: boolean;
  optional?: boolean;
};

export type Briefing = {
  offering: string;
  targetRoles: string;
  companyType: string;
  painPoint: string;
  benefit: string;
  geography: string;
  otherFilters: string;
};

const QUESTIONS: Question[] = [
  {
    key: "offering",
    prompt: "What are you offering?",
    hint: "1–2 sentences. Plain language.",
    example: "Cold-email lead gen service for B2B SaaS — we book qualified meetings.",
    long: true,
  },
  {
    key: "targetRoles",
    prompt: "Who should you be talking to?",
    hint: "Job titles or roles. Comma-separated.",
    example: "VP of Sales, Sales Director, Head of Growth",
  },
  {
    key: "companyType",
    prompt: "What type of companies?",
    hint: "Size, industry, revenue, or other firmographics.",
    example: "B2B SaaS, 50–300 employees, post-Series A",
  },
  {
    key: "painPoint",
    prompt: "What's their main pain point that you solve?",
    hint: "1–2 specific pain points.",
    example: "Lead gen is too expensive and unpredictable; pipeline keeps drying up.",
    long: true,
  },
  {
    key: "benefit",
    prompt: "What's your core benefit / outcome?",
    hint: "What you actually deliver.",
    example: "50+ qualified meetings per month at half the cost of paid ads",
    long: true,
  },
  {
    key: "geography",
    prompt: "Geographic focus?",
    hint: "Countries, regions, or 'global'.",
    example: "Indonesia, Singapore, Malaysia",
  },
  {
    key: "otherFilters",
    prompt: "Any other filters?",
    hint: "Tech stack, revenue range, growth stage, etc. Or 'none'.",
    example: "Uses HubSpot or Salesforce; raised in last 18 months",
    long: true,
    optional: true,
  },
];

const DRAFT_KEY = "lgm:wizard:draft";

const empty: Briefing = {
  offering: "",
  targetRoles: "",
  companyType: "",
  painPoint: "",
  benefit: "",
  geography: "",
  otherFilters: "",
};

export function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [briefing, setBriefing] = useState<Briefing>(empty);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { briefing: Briefing; name: string };
        setBriefing({ ...empty, ...parsed.briefing });
        setName(parsed.name ?? "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ briefing, name }));
    } catch {
      /* ignore */
    }
  }, [briefing, name]);

  const isReview = step === QUESTIONS.length;
  const q = isReview ? null : QUESTIONS[step];
  const value = q ? briefing[q.key] : "";
  const canNext = q
    ? Boolean(value.trim()) || q.optional === true
    : Boolean(name.trim());

  function update(key: keyof Briefing, v: string) {
    setBriefing((b) => ({ ...b, [key]: v }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          briefing: { ...briefing, otherFilters: briefing.otherFilters.trim() || "(none)" },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const { id } = (await res.json()) as { id: string };
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/campaigns/${id}/icp`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Progress current={step} total={QUESTIONS.length + 1} />

      {q ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{q.prompt}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {q.hint}
              {q.optional ? " (optional)" : ""}
            </p>
          </div>

          {q.long ? (
            <Textarea
              value={value}
              autoFocus
              onChange={(e) => update(q.key, e.target.value)}
              placeholder={q.example}
              rows={4}
            />
          ) : (
            <Input
              value={value}
              autoFocus
              onChange={(e) => update(q.key, e.target.value)}
              placeholder={q.example}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canNext) {
                  e.preventDefault();
                  setStep(step + 1);
                }
              }}
            />
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              ← Back
            </Button>
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              {step === QUESTIONS.length - 1 ? "Review" : "Next"} →
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Name your campaign</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can change this later.
            </p>
            <Input
              className="mt-3"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 — SEA SaaS Sales Leaders"
            />
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Your answers</h3>
            <dl className="space-y-3 text-sm">
              {QUESTIONS.map((qq) => (
                <div key={qq.key} className="grid grid-cols-3 gap-2">
                  <dt className="text-muted-foreground">{qq.prompt}</dt>
                  <dd className="col-span-2 whitespace-pre-line">
                    {briefing[qq.key] || (
                      <span className="italic text-muted-foreground">(empty)</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
              ← Back
            </Button>
            <Button onClick={submit} disabled={!canNext || submitting}>
              {submitting ? "Creating…" : "Create campaign & generate ICP"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current
              ? "bg-primary"
              : i === current
                ? "bg-primary/60"
                : "bg-border",
          )}
        />
      ))}
    </div>
  );
}
