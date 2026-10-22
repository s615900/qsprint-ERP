import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { selectTransactions, normalizeVoucher } from "@/server/transactions";
import { PERIOD_FILED_MESSAGE, isPeriodFiled } from "@/server/invoicing";
import { periodRange } from "@/lib/tax";
import { CreateTransactionBody, ListTransactionsQueryParams } from "@/lib/api-zod";
import { DATE_RE, error, json, readJson } from "@/server/http";

const MONTH_RE = /^\d{4}-\d{2}$/;

// GET /api/transactions
export async function GET(req: NextRequest) {
  const parsed = ListTransactionsQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { type, month, order_id, period } = parsed.data;
  if (month && !MONTH_RE.test(month)) return error("month must be YYYY-MM", 400);

  const and: Record<string, unknown>[] = [];
  if (type) and.push({ type });
  if (order_id) and.push({ order_id });
  if (month) and.push({ date: { $regex: `^${month}-` } });
  if (period) {
    const { start, end } = periodRange(period);
    and.push({ date: { $gte: start, $lte: end } });
  }
  return json(await selectTransactions(and.length ? { $and: and } : {}));
}

// POST /api/transactions
export async function POST(req: Request) {
  const parsed = CreateTransactionBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  if (!DATE_RE.test(parsed.data.date)) return error("date must be YYYY-MM-DD", 400);

  const voucher = normalizeVoucher(parsed.data);
  if ("error" in voucher) return error(voucher.error, 400);
  if (voucher.fields.voucher_type && (await isPeriodFiled(voucher.fields.voucher_date!))) {
    return error(PERIOD_FILED_MESSAGE, 409);
  }

  const row = await db.transactions.insert({ ...parsed.data, ...voucher.fields });
  const [full] = await selectTransactions({ id: row.id });
  return json(full, 201);
}
