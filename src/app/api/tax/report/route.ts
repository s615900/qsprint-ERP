import type { NextRequest } from "next/server";
import { GetTaxReportQueryParams } from "@/lib/api-zod";
import { buildTaxReport } from "@/server/invoicing";
import { error, json } from "@/server/http";

const PERIOD_RE = /^\d{4}-(01|03|05|07|09|11)$/;

// GET /api/tax/report?period=YYYY-MM
export async function GET(req: NextRequest) {
  const parsed = GetTaxReportQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  if (!PERIOD_RE.test(parsed.data.period)) return error("period 應為單月起始，例如 2026-01", 400);
  return json(await buildTaxReport(parsed.data.period));
}
