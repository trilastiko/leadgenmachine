/**
 * Minimal ReachInbox types — the surface we use.
 * NOTE: ReachInbox does not publish a comprehensive REST reference at the time
 * of writing. Field names follow common patterns (id, status, name, etc.).
 * Exact field names should be confirmed against live API responses during smoke tests.
 */

export type RICampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "stopped";

export type RICampaign = {
  id: string;
  name: string;
  status: RICampaignStatus;
  created_at?: string;
};

export type RILead = {
  id: string;
  campaign_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  status?: string; // active|bounced|unsubscribed|replied|...
  attributes?: Record<string, string | number | boolean>;
};

export type RICampaignAnalytics = {
  campaign_id: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
};

export type RIReply = {
  id: string;
  campaign_id: string;
  lead_id: string;
  lead_email: string;
  received_at: string;
  subject?: string;
  body: string;
  thread_id?: string;
};

export type RISequenceStep = {
  step: number;
  /** Days to wait after the previous step (0 for the initial email). */
  delay_days: number;
  subject: string;
  body: string;
};
