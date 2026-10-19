import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!c.csvPath) {
    return NextResponse.json(
      { error: "no_csv", message: "Run export first" },
      { status: 404 },
    );
  }

  // Defensive: ensure the path is inside our storage dir.
  const safe = path.resolve(c.csvPath);
  const root = path.resolve(process.cwd(), "storage/exports");
  if (!safe.startsWith(root + path.sep) && safe !== root) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const buf = await fs.readFile(safe);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${id}.csv"`,
    },
  });
}
