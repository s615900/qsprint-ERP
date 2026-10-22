import type { TaxMode } from "@/server/db";
import { db, computeAmounts } from "@/server/db";
import { GetOrderParams, UpdateOrderParams, UpdateOrderBody, DeleteOrderParams } from "@/lib/api-zod";
import { selectOrder } from "@/server/orders";
import { DATE_RE, error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/orders/:id
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetOrderParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await selectOrder(params.data.id);
  if (!row) return error("Order not found", 404);
  return json(row);
}

// PUT /api/orders/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateOrderParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateOrderBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { delivery_date } = parsed.data;
  if (delivery_date && !DATE_RE.test(delivery_date)) return error("delivery_date must be YYYY-MM-DD", 400);

  const current = await db.orders.get(params.data.id);
  if (!current) return error("Order not found", 404);
  const items = parsed.data.items ?? current.items;
  const discount = parsed.data.discount ?? current.discount;
  const taxMode = parsed.data.tax_mode ?? (current.tax_mode as TaxMode);
  const taxRate = parsed.data.tax_rate ?? current.tax_rate;
  await db.orders.update(current.id, {
    ...parsed.data,
    ...(delivery_date !== undefined && { delivery_date: delivery_date || null }),
    ...computeAmounts(items, discount, taxMode, taxRate),
  });
  return json(await selectOrder(params.data.id));
}

// DELETE /api/orders/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteOrderParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.orders.remove(params.data.id);
  if (!row) return error("Order not found", 404);
  // Free the source quote so it can be converted again; other records only lose the link.
  await Promise.all([
    db.quotes.updateMany({ order_id: row.id }, { order_id: null }),
    db.contracts.updateMany({ order_id: row.id }, { order_id: null }),
    db.projects.updateMany({ order_id: row.id }, { order_id: null }),
    db.transactions.updateMany({ order_id: row.id }, { order_id: null }),
    db.invoices.updateMany({ order_id: row.id }, { order_id: null }),
  ]);
  return noContent();
}
