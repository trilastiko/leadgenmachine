import { apolloPost } from "./client";
import type {
  ApolloFilters,
  ApolloPerson,
  ApolloSearchResponse,
} from "./types";

export type SearchOpts = {
  page?: number;
  perPage?: number; // max 100
};

export async function searchPeople(
  filters: ApolloFilters,
  opts: SearchOpts = {},
): Promise<ApolloSearchResponse> {
  const body = {
    ...filters,
    page: opts.page ?? 1,
    per_page: Math.min(opts.perPage ?? 100, 100),
  };
  return apolloPost<ApolloSearchResponse>("/mixed_people/search", body);
}

/** Paginate `searchPeople` until we have at least `target` people or no more pages. */
export async function searchPeoplePaginated(
  filters: ApolloFilters,
  target: number,
): Promise<ApolloPerson[]> {
  const out: ApolloPerson[] = [];
  const perPage = 100;
  let page = 1;

  while (out.length < target) {
    const res = await searchPeople(filters, { page, perPage });
    const batch = res.people ?? [];
    if (batch.length === 0) break;
    out.push(...batch);
    const totalPages = res.pagination?.total_pages ?? page;
    if (page >= totalPages) break;
    page += 1;
  }

  return out.slice(0, target);
}
