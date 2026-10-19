/**
 * Tiny CSV writer. Quotes every cell to keep things simple and safe with
 * commas, newlines, and quotes inside values.
 */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return rows
    .map((row) => row.map(quote).join(","))
    .join("\n");
}

function quote(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '""';
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}
