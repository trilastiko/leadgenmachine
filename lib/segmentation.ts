/**
 * Helpers for grouping prospects into useful segments for the selection UI.
 */

export type ProspectLite = {
  id: string;
  seniority: string | null;
  industry: string | null;
  location: string | null;
  companySize: number | null;
  email: string | null;
  emailStatus: string | null;
  includeForOutreach: boolean;
};

export type Segment = {
  key: string;
  dimension: "seniority" | "industry" | "location" | "companySize";
  value: string;
  count: number;
  withEmail: number;
};

const SIZE_BANDS = [
  { label: "1–10", test: (n: number) => n >= 1 && n <= 10 },
  { label: "11–50", test: (n: number) => n >= 11 && n <= 50 },
  { label: "51–200", test: (n: number) => n >= 51 && n <= 200 },
  { label: "201–500", test: (n: number) => n >= 201 && n <= 500 },
  { label: "501–1000", test: (n: number) => n >= 501 && n <= 1000 },
  { label: "1001–5000", test: (n: number) => n >= 1001 && n <= 5000 },
  { label: "5001+", test: (n: number) => n > 5000 },
];

function sizeBand(n: number | null): string {
  if (n == null) return "(unknown)";
  return SIZE_BANDS.find((b) => b.test(n))?.label ?? "(unknown)";
}

function group(
  prospects: ProspectLite[],
  dimension: Segment["dimension"],
): Segment[] {
  const acc = new Map<string, { count: number; withEmail: number }>();
  for (const p of prospects) {
    let val: string;
    switch (dimension) {
      case "seniority":
        val = p.seniority ?? "(unknown)";
        break;
      case "industry":
        val = p.industry ?? "(unknown)";
        break;
      case "location":
        val = (p.location ?? "(unknown)").split(",").pop()?.trim() || "(unknown)";
        break;
      case "companySize":
        val = sizeBand(p.companySize);
        break;
    }
    const cur = acc.get(val) ?? { count: 0, withEmail: 0 };
    cur.count += 1;
    if (p.email) cur.withEmail += 1;
    acc.set(val, cur);
  }
  return Array.from(acc.entries())
    .map(([value, v]) => ({
      key: `${dimension}:${value}`,
      dimension,
      value,
      count: v.count,
      withEmail: v.withEmail,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildSegments(prospects: ProspectLite[]): {
  bySeniority: Segment[];
  byIndustry: Segment[];
  byLocation: Segment[];
  byCompanySize: Segment[];
} {
  return {
    bySeniority: group(prospects, "seniority"),
    byIndustry: group(prospects, "industry"),
    byLocation: group(prospects, "location"),
    byCompanySize: group(prospects, "companySize"),
  };
}

export function prospectMatchesSegment(
  p: ProspectLite,
  dimension: Segment["dimension"],
  value: string,
): boolean {
  switch (dimension) {
    case "seniority":
      return (p.seniority ?? "(unknown)") === value;
    case "industry":
      return (p.industry ?? "(unknown)") === value;
    case "location":
      return ((p.location ?? "(unknown)").split(",").pop()?.trim() || "(unknown)") === value;
    case "companySize":
      return sizeBand(p.companySize) === value;
  }
}
