import type { Job } from "bullmq";
import { db } from "../lib/db";
import { searchPeoplePaginated } from "../lib/apollo/search";
import { enrichPeople } from "../lib/apollo/enrich";
import type { ApolloFilters, ApolloPerson } from "../lib/apollo/types";
import { ICPSchema } from "../lib/anthropic/icp";

export type SearchJobData = { campaignId: string };

export async function runSearch(job: Job<SearchJobData>): Promise<{ count: number }> {
  const { campaignId } = job.data;
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error(`campaign ${campaignId} not found`);

  await db.campaign.update({ where: { id: campaignId }, data: { status: "searching" } });

  const icp = ICPSchema.parse(campaign.icp);
  const filters: ApolloFilters = {
    person_titles: icp.apollo_filters.person_titles,
    person_seniorities: icp.apollo_filters.person_seniorities,
    person_locations: icp.apollo_filters.person_locations,
    organization_locations: icp.apollo_filters.organization_locations,
    organization_industries: icp.apollo_filters.organization_industries,
    organization_num_employees_ranges:
      icp.apollo_filters.organization_num_employees_ranges,
  };

  const target = campaign.targetCount;
  const people = await searchPeoplePaginated(filters, target);
  console.log(`[search] retrieved ${people.length} people from search`);

  const enriched = await enrichPeople(people);
  console.log(`[search] enriched ${enriched.length} people with emails`);

  // Index enrichment results by apollo id for merging
  const enrichedById = new Map<string, ApolloPerson>();
  for (const p of enriched) {
    if (p.id) enrichedById.set(p.id, p);
  }

  // Dedup by apollo id, then prefer rows with an email
  const merged = new Map<string, ApolloPerson>();
  for (const p of people) {
    const enr = enrichedById.get(p.id);
    const combined: ApolloPerson = {
      ...p,
      ...(enr ?? {}),
      organization: enr?.organization ?? p.organization,
    };
    merged.set(p.id, combined);
  }

  const seenEmails = new Set<string>();
  let inserted = 0;
  for (const p of merged.values()) {
    const email = p.email?.toLowerCase().trim() || null;
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);

    await db.prospect.upsert({
      where: {
        campaignId_apolloPersonId: { campaignId, apolloPersonId: p.id },
      },
      create: {
        campaignId,
        apolloPersonId: p.id,
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        email,
        title: p.title ?? null,
        seniority: p.seniority ?? null,
        linkedinUrl: p.linkedin_url ?? null,
        companyName: p.organization?.name ?? null,
        companyDomain: p.organization?.primary_domain ?? null,
        industry: p.organization?.industry ?? null,
        location: [p.city, p.state, p.country].filter(Boolean).join(", ") || null,
        companySize: p.organization?.estimated_num_employees ?? null,
        raw: p as unknown as object,
      },
      update: {
        email,
        title: p.title ?? undefined,
        seniority: p.seniority ?? undefined,
        linkedinUrl: p.linkedin_url ?? undefined,
        companyName: p.organization?.name ?? undefined,
        companyDomain: p.organization?.primary_domain ?? undefined,
        industry: p.organization?.industry ?? undefined,
        location: [p.city, p.state, p.country].filter(Boolean).join(", ") || undefined,
        companySize: p.organization?.estimated_num_employees ?? undefined,
        raw: p as unknown as object,
      },
    });
    inserted += 1;
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "ready_for_verify" },
  });

  return { count: inserted };
}
