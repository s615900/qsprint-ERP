import { db } from "@/server/db";
import { UpdateTransactionParams, UpdateTransactionBody, DeleteTransactionParams } from "@/lib/api-zod";
import { selectTransactions, normalizeVoucher } from "@/server/transactions";
import { PERIOD_FILED_MESSAGE, isPeriodFiled } from "@/server/invoicing";
import { DATE_RE, error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/transactions/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateTransactionParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateTransactionBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  if (!DATE_RE.test(parsed.data.date)) return error("date must be YYYY-MM-DD", 400);

  const voucher = normalizeVoucher(parsed.data);
  if ("error" in voucher) return error(voucher.error, 400);
  const existing = await db.transactions.get(params.data.id);
  if (!existing) return error("Transaction not found", 404);
  // A voucher counted in a filed period can neither move into nor out of it.
  for (const d of [existing.voucher_type ? (existing.voucher_date ?? existing.date) : null, voucher.fields.voucher_date]) {
    if (d && (await isPeriodFiled(d))) return error(PERIOD_FILED_MESSAGE, 409);
  }

  const row = await db.transactions.update(params.data.id, { ...parsed.data, ...voucher.fields });
  if (!row) return error("Transaction not found", 404);

  const [full] = await selectTransactions({ id: row.id });
  return json(full);
}

// DELETE /api/transactions/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteTransactionParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const existing = await db.transactions.get(params.data.id);
  if (!existing) return error("Transaction not found", 404);
  if (existing.voucher_type && (await isPeriodFiled(existing.voucher_date ?? existing.date))) {
    return error(PERIOD_FILED_MESSAGE, 409);
  }
  const row = await db.transactions.remove(params.data.id);
  if (!row) return error("Transaction not found", 404);
  return noContent();
}
