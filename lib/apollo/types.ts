/**
 * Apollo.io API types — narrow subset of fields we use.
 * Reference: https://docs.apollo.io/reference/people-api-search
 */

export type ApolloFilters = {
  person_titles?: string[];
  person_seniorities?: string[];
  person_locations?: string[];
  organization_locations?: string[];
  organization_industries?: string[];
  organization_num_employees_ranges?: string[]; // e.g. "50,300"
  q_organization_domains_list?: string[];
  organization_ids?: string[];
};

export type ApolloPerson = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  title?: string | null;
  seniority?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  organization?: ApolloOrganization | null;
};

export type ApolloOrganization = {
  id?: string;
  name?: string | null;
  primary_domain?: string | null;
  website_url?: string | null;
  industry?: string | null;
  estimated_num_employees?: number | null;
};

export type ApolloSearchResponse = {
  people?: ApolloPerson[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
};

export type ApolloBulkMatchResponse = {
  matches?: ApolloPerson[];
};
