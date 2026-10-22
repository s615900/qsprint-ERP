import type { TaxMode } from "@/server/db";
import { db, computeAmounts } from "@/server/db";
import { GetQuoteParams, UpdateQuoteParams, UpdateQuoteBody, DeleteQuoteParams } from "@/lib/api-zod";
import { DATE_RE, error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/quotes/:id
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetQuoteParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.quotes.get(params.data.id);
  if (!row) return error("Quote not found", 404);
  return json(row);
}

// PUT /api/quotes/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateQuoteParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateQuoteBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { valid_until } = parsed.data;
  if (valid_until && !DATE_RE.test(valid_until)) return error("valid_until must be YYYY-MM-DD", 400);

  const current = await db.quotes.get(params.data.id);
  if (!current) return error("Quote not found", 404);

  const changesContent = ["items", "discount", "tax_mode", "tax_rate", "terms"].some((k) => k in parsed.data);
  if (current.signed_at && changesContent) return error("客戶已簽署此報價單，內容已鎖定", 409);

  const items = parsed.data.items ?? current.items;
  const discount = parsed.data.discount ?? current.discount;
  const taxMode = parsed.data.tax_mode ?? (current.tax_mode as TaxMode);
  const taxRate = parsed.data.tax_rate ?? current.tax_rate;
  const updated = await db.quotes.update(current.id, {
    ...parsed.data,
    ...(valid_until !== undefined && { valid_until: valid_until || null }),
    ...computeAmounts(items, discount, taxMode, taxRate),
  });
  return json(updated);
}

// DELETE /api/quotes/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteQuoteParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.quotes.remove(params.data.id);
  if (!row) return error("Quote not found", 404);
  await Promise.all([
    db.orders.updateMany({ quote_id: row.id }, { quote_id: null }),
    db.contracts.updateMany({ quote_id: row.id }, { quote_id: null }),
  ]);
  return noContent();
}
