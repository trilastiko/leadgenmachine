import type { Job } from "bullmq";
import { db } from "../lib/db";
import { mapToEmailStatus, verifyBatch } from "../lib/reoon/verify";

export type VerifyJobData = { campaignId: string };

const CHUNK = 1_000;

export async function runVerify(job: Job<VerifyJobData>): Promise<{
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
}> {
  const { campaignId } = job.data;

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "verifying" },
  });

  const targets = await db.prospect.findMany({
    where: {
      campaignId,
      includeForOutreach: true,
      email: { not: null },
      OR: [{ emailStatus: null }, { emailStatus: "" }],
    },
    select: { id: true, email: true },
  });

  if (targets.length === 0) {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "verified" },
    });
    return { total: 0, valid: 0, invalid: 0, risky: 0, unknown: 0 };
  }

  let valid = 0;
  let invalid = 0;
  let risky = 0;
  let unknown = 0;

  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const emails = chunk.map((t) => t.email!.toLowerCase());
    const results = await verifyBatch(emails, {
      taskName: `lgm-${campaignId.slice(0, 8)}`,
    });

    await db.$transaction(
      chunk.map((t) => {
        const r = results[t.email!.toLowerCase()];
        if (!r) {
          unknown += 1;
          return db.prospect.update({
            where: { id: t.id },
            data: { emailStatus: "unknown" },
          });
        }
        const status = mapToEmailStatus(r.status);
        if (status === "valid") valid += 1;
        else if (status === "invalid") invalid += 1;
        else if (status === "risky") risky += 1;
        else unknown += 1;
        return db.prospect.update({
          where: { id: t.id },
          data: { emailStatus: status },
        });
      }),
    );
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "verified" },
  });

  return { total: targets.length, valid, invalid, risky, unknown };
}
