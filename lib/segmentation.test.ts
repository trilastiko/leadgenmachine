import { describe, expect, it } from "vitest";
import {
  buildSegments,
  prospectMatchesSegment,
  type ProspectLite,
} from "./segmentation";

const p = (over: Partial<ProspectLite>): ProspectLite => ({
  id: "x",
  seniority: null,
  industry: null,
  location: null,
  companySize: null,
  email: null,
  emailStatus: null,
  includeForOutreach: true,
  ...over,
});

describe("buildSegments", () => {
  it("groups by each dimension and counts emails", () => {
    const list = [
      p({ id: "1", seniority: "vp", industry: "saas", location: "Singapore", companySize: 100, email: "a@x.com" }),
      p({ id: "2", seniority: "vp", industry: "fintech", location: "Indonesia", companySize: 250, email: "b@x.com" }),
      p({ id: "3", seniority: "director", industry: "saas", location: "Singapore", companySize: 30, email: null }),
    ];
    const out = buildSegments(list);
    expect(out.bySeniority.find((s) => s.value === "vp")?.count).toBe(2);
    expect(out.bySeniority.find((s) => s.value === "vp")?.withEmail).toBe(2);
    expect(out.byIndustry.find((s) => s.value === "saas")?.count).toBe(2);
    expect(out.byCompanySize.find((s) => s.value === "11–50")?.count).toBe(1);
    expect(out.byCompanySize.find((s) => s.value === "51–200")?.count).toBe(1);
    expect(out.byLocation.find((s) => s.value === "Singapore")?.count).toBe(2);
  });

  it("buckets unknown values", () => {
    const list = [p({ id: "1" }), p({ id: "2", seniority: "manager" })];
    const out = buildSegments(list);
    expect(out.bySeniority.find((s) => s.value === "(unknown)")?.count).toBe(1);
  });
});

describe("prospectMatchesSegment", () => {
  it("matches by seniority and industry", () => {
    const x = p({ seniority: "vp", industry: "saas", companySize: 100 });
    expect(prospectMatchesSegment(x, "seniority", "vp")).toBe(true);
    expect(prospectMatchesSegment(x, "industry", "saas")).toBe(true);
    expect(prospectMatchesSegment(x, "companySize", "51–200")).toBe(true);
    expect(prospectMatchesSegment(x, "companySize", "1–10")).toBe(false);
  });

  it("matches location by trailing component", () => {
    const x = p({ location: "Jakarta, Indonesia" });
    expect(prospectMatchesSegment(x, "location", "Indonesia")).toBe(true);
    expect(prospectMatchesSegment(x, "location", "Jakarta")).toBe(false);
  });
});
