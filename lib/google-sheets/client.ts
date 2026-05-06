import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import type { sheets_v4, drive_v3 } from "googleapis";
import { env } from "../env";

let cached: {
  sheets: sheets_v4.Sheets;
  drive: drive_v3.Drive;
} | null = null;

function loadServiceAccount(): {
  client_email: string;
  private_key: string;
} | null {
  const p = env().GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON points to ${abs} but the file is missing.`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as {
    client_email: string;
    private_key: string;
  };
  return raw;
}

export function googleClients(): {
  sheets: sheets_v4.Sheets;
  drive: drive_v3.Drive;
} {
  if (cached) return cached;
  const sa = loadServiceAccount();
  if (!sa) {
    throw new Error(
      "Google Sheets export not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in .env.",
    );
  }
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  cached = {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
  return cached;
}

export function isSheetsConfigured(): boolean {
  try {
    return Boolean(env().GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    return false;
  }
}
