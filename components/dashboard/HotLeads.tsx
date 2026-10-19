type HotLead = {
  prospectId: string;
  email: string | null;
  name: string;
  company: string | null;
  title: string | null;
  receivedAt: Date;
  summary: string | null;
  body: string;
};

export function HotLeads({ leads }: { leads: HotLead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hot leads yet. They&apos;ll appear here as positive replies come in.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((l) => (
        <div key={l.prospectId} className="rounded-lg border p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-medium">{l.name}</div>
              <div className="text-xs text-muted-foreground">
                {[l.title, l.company].filter(Boolean).join(" · ")}
                {l.email ? ` · ${l.email}` : ""}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {l.receivedAt.toLocaleString()}
            </div>
          </div>
          {l.summary ? (
            <p className="mt-2 text-sm font-medium">{l.summary}</p>
          ) : null}
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground line-clamp-4">
            {l.body}
          </p>
        </div>
      ))}
    </div>
  );
}
