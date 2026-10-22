import type { NextRequest } from "next/server";
import { ListTaxFilingsQueryParams } from "@/lib/api-zod";
import { summarizePeriod } from "@/server/invoicing";
import { periodsOfYear } from "@/lib/tax";
import { error, json } from "@/server/http";

// GET /api/tax/filings?year=YYYY
export async function GET(req: NextRequest) {
  const parsed = ListTaxFilingsQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const periods = periodsOfYear(parsed.data.year);
  const rows = [];
  for (const p of periods) rows.push(await summarizePeriod(p)); // sequential: each period reads the previous one's carry-out
  return json(rows);
}
