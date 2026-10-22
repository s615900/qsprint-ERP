import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { CreateInvoiceTrackBody, ListInvoiceTracksQueryParams } from "@/lib/api-zod";
import { trackStats } from "@/server/invoicing";
import { error, json, readJson } from "@/server/http";

const FIRST_MONTH_RE = /^\d{4}-(01|03|05|07|09|11)$/;

// GET /api/invoice-tracks
export async function GET(req: NextRequest) {
  const parsed = ListInvoiceTracksQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const rows = await db.invoiceTracks.find(parsed.data.period ? { period: parsed.data.period } : {}, {
    sort: { period: 1, id: 1 },
  });
  return json(rows.map(trackStats));
}

// POST /api/invoice-tracks
export async function POST(req: Request) {
  const parsed = CreateInvoiceTrackBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { period, kind, range_start, range_end } = parsed.data;
  const prefix = parsed.data.prefix.toUpperCase();
  if (!FIRST_MONTH_RE.test(period)) return error("期別應為單月起始，例如 2026-01（1-2月）", 400);
  if (range_start > range_end) return error("起始號碼不能大於結束號碼", 400);

  // An invoice number (prefix + number) must belong to exactly one block.
  const clash = await db.invoiceTracks.findOne({
    prefix,
    range_start: { $lte: range_end },
    range_end: { $gte: range_start },
  });
  if (clash) return error(`字軌 ${prefix} 的號碼區間與既有配號重疊`, 409);

  const row = await db.invoiceTracks.insert({ period, kind, prefix, range_start, range_end, next_number: range_start });
  return json(trackStats(row), 201);
}
