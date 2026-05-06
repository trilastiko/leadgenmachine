import { apolloPost } from "./client";
import type { ApolloBulkMatchResponse, ApolloPerson } from "./types";

/**
 * People search returns no emails. Use bulk_match to enrich up to 10 people
 * per request and reveal emails. Apollo deducts credits per email revealed.
 *
 * Reference: https://docs.apollo.io/reference/bulk-people-enrichment
 */
export type MatchInput =
  | { id?: string }
  | {
      first_name?: string;
      last_name?: string;
      name?: string;
      email?: string;
      organization_name?: string;
      domain?: string;
      linkedin_url?: string;
    };

export async function bulkMatch(
  details: MatchInput[],
  opts: { revealPersonalEmails?: boolean; revealProfessionalEmails?: boolean } = {},
): Promise<ApolloBulkMatchResponse> {
  const body = {
    details: details.slice(0, 10),
    reveal_personal_emails: opts.revealPersonalEmails ?? false,
    reveal_professional_emails: opts.revealProfessionalEmails ?? true,
  };
  return apolloPost<ApolloBulkMatchResponse>("/people/bulk_match", body);
}

/** Enrich an array of people in chunks of 10. */
export async function enrichPeople(
  people: ApolloPerson[],
  opts?: { revealPersonalEmails?: boolean; revealProfessionalEmails?: boolean },
): Promise<ApolloPerson[]> {
  const out: ApolloPerson[] = [];
  for (let i = 0; i < people.length; i += 10) {
    const chunk = people.slice(i, i + 10).map((p) => ({ id: p.id }));
    const res = await bulkMatch(chunk, opts);
    if (res.matches) out.push(...res.matches);
  }
  return out;
}
