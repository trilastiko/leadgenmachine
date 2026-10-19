type Variant = {
  label: string;
  angle: string;
  sent: number;
  opened: number;
  replied: number;
};

export function StatsRow({
  variants,
  hotLeads,
}: {
  variants: Variant[];
  hotLeads: number;
}) {
  const sent = variants.reduce((a, v) => a + v.sent, 0);
  const opened = variants.reduce((a, v) => a + v.opened, 0);
  const replied = variants.reduce((a, v) => a + v.replied, 0);

  const openRate = sent > 0 ? (opened / sent) * 100 : 0;
  const replyRate = sent > 0 ? (replied / sent) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat label="Sent" value={sent.toLocaleString()} />
      <Stat
        label="Open rate"
        value={`${openRate.toFixed(1)}%`}
        sub={`${opened} opens`}
      />
      <Stat
        label="Reply rate"
        value={`${replyRate.toFixed(1)}%`}
        sub={`${replied} replies`}
      />
      <Stat label="Hot leads" value={hotLeads.toLocaleString()} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function VariantPerf({ variants }: { variants: Variant[] }) {
  if (variants.length === 0) return null;
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-2 text-sm font-medium">Variant performance</div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Label</th>
            <th className="px-4 py-2">Angle</th>
            <th className="px-4 py-2 text-right">Sent</th>
            <th className="px-4 py-2 text-right">Open %</th>
            <th className="px-4 py-2 text-right">Reply %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {variants.map((v) => (
            <tr key={v.label}>
              <td className="px-4 py-2 font-medium">{v.label}</td>
              <td className="px-4 py-2 text-muted-foreground">{v.angle}</td>
              <td className="px-4 py-2 text-right">{v.sent}</td>
              <td className="px-4 py-2 text-right">
                {v.sent ? `${((v.opened / v.sent) * 100).toFixed(1)}%` : "—"}
              </td>
              <td className="px-4 py-2 text-right">
                {v.sent ? `${((v.replied / v.sent) * 100).toFixed(1)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
