import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { GetAccountingSummaryQueryParams } from "@/lib/api-zod";
import { selectOutstandingOrders } from "@/server/orders";
import { error, json } from "@/server/http";

// GET /api/accounting/summary?year=YYYY
export async function GET(req: NextRequest) {
  const parsed = GetAccountingSummaryQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { year } = parsed.data;

  const col = await db.transactions.col();
  const rows = await col
    .aggregate<{ _id: string; income: number; expense: number }>([
      { $match: { date: { $regex: `^${year}-` } } },
      {
        $group: {
          _id: { $substrBytes: ["$date", 5, 2] }, // "MM" of YYYY-MM-DD
          income: { $sum: { $cond: [{ $eq: ["$type", "收入"] }, "$amount", 0] } },
          expense: { $sum: { $cond: [{ $eq: ["$type", "支出"] }, "$amount", 0] } },
        },
      },
    ])
    .toArray();
  const byMonth = new Map(rows.map((r) => [Number(r._id), r]));
  const months = Array.from({ length: 12 }, (_, i) => {
    const r = byMonth.get(i + 1);
    return {
      month: `${year}-${String(i + 1).padStart(2, "0")}`,
      income: r?.income ?? 0,
      expense: r?.expense ?? 0,
    };
  });

  const outstanding = await selectOutstandingOrders();
  return json({
    year,
    months,
    receivables: outstanding.reduce((sum, o) => sum + o.balance, 0),
    receivable_orders: outstanding.length,
  });
}
