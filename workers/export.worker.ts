import fs from "node:fs/promises";
import path from "node:path";
import type { Job } from "bullmq";
import { db } from "../lib/db";
import { isSheetsConfigured } from "../lib/google-sheets/client";
import { exportProspects } from "../lib/google-sheets/export";
import { toCsv } from "../lib/csv";

export type ExportJobData = {
  campaignId: string;
  includeUnknown?: boolean;
};

const CSV_HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Title",
  "Company",
  "Industry",
  "Location",
  "LinkedIn",
  "Email Status",
];

export async function runExport(job: Job<ExportJobData>): Promise<{
  count: number;
  csvPath: string;
  sheetUrl: string | null;
}> {
  const { campaignId, includeUnknown = false } = job.data;
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error(`campaign ${campaignId} not found`);

  const acceptable = includeUnknown ? ["valid", "unknown"] : ["valid"];
  const prospects = await db.prospect.findMany({
    where: {
      campaignId,
      includeForOutreach: true,
      email: { not: null },
      emailStatus: { in: acceptable },
    },
    orderBy: { companyName: "asc" },
  });

  // CSV (always)
  const rows = [
    CSV_HEADERS,
    ...prospects.map((p) => [
      p.firstName ?? "",
      p.lastName ?? "",
      p.email ?? "",
      p.title ?? "",
      p.companyName ?? "",
      p.industry ?? "",
      p.location ?? "",
      p.linkedinUrl ?? "",
      p.emailStatus ?? "",
    ]),
  ];
  const dir = path.resolve(process.cwd(), "storage/exports");
  await fs.mkdir(dir, { recursive: true });
  const csvPath = path.join(dir, `${campaignId}.csv`);
  await fs.writeFile(csvPath, toCsv(rows), "utf8");

  // Google Sheets (if configured)
  let sheetUrl: string | null = null;
  let sheetId: string | null = null;
  if (isSheetsConfigured()) {
    try {
      const out = await exportProspects(prospects, campaign.name);
      sheetId = out.sheetId;
      sheetUrl = out.url;
    } catch (e) {
      console.error("Google Sheets export failed (CSV still saved):", e);
    }
  } else {
    console.log("Google Sheets not configured — skipping sheet export");
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: {
      status: "exported",
      csvPath,
      sheetId: sheetId ?? campaign.sheetId,
      sheetUrl: sheetUrl ?? campaign.sheetUrl,
    },
  });

  return { count: prospects.length, csvPath, sheetUrl };
}
