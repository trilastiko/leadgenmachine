import { googleClients } from "./client";
import { env } from "../env";

const HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Title",
  "Company",
  "Industry",
  "Location",
  "LinkedIn",
  "Email Status",
  "Sent",
  "Opened",
  "Replied",
  "Reply Tag",
  "Notes",
];

export type ProspectRow = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  title?: string | null;
  companyName?: string | null;
  industry?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  emailStatus?: string | null;
};

export async function exportProspects(
  prospects: ProspectRow[],
  campaignName: string,
): Promise<{ sheetId: string; url: string }> {
  const { sheets, drive } = googleClients();

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `${campaignName} – ${new Date().toISOString().slice(0, 10)}`,
      },
      sheets: [{ properties: { title: "Prospects" } }],
    },
  });

  const sheetId = created.data.spreadsheetId;
  if (!sheetId) throw new Error("Failed to create Google Sheet");

  const rows = [
    HEADERS,
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
      "", // Sent
      "", // Opened
      "", // Replied
      "", // Reply Tag
      "", // Notes
    ]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Prospects!A1",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });

  const ownerEmail = env().GOOGLE_SHEETS_OWNER_EMAIL;
  if (ownerEmail) {
    await drive.permissions.create({
      fileId: sheetId,
      sendNotificationEmail: false,
      requestBody: { type: "user", role: "writer", emailAddress: ownerEmail },
    });
  }

  return {
    sheetId,
    url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
  };
}
