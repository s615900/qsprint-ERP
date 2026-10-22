import { db, dailyNumber } from "@/server/db";
import { ConvertQuoteToOrderParams } from "@/lib/api-zod";
import { selectOrder } from "@/server/orders";
import { isUniqueViolation } from "@/server/staff";
import { error, json } from "@/server/http";

// POST /api/quotes/:id/convert
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ConvertQuoteToOrderParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const quote = await db.quotes.get(params.data.id);
  if (!quote) return error("Quote not found", 404);
  if (quote.order_id) return error("此報價單已轉為訂單", 409);

  // A unique index on orders.quote_id means a double-click can't create two orders from one quote.
  let order;
  try {
    order = await db.orders.insert({
      order_number: await dailyNumber("O"),
      customer_id: quote.customer_id,
      quote_id: quote.id,
      contact_name: quote.contact_name,
      contact_phone: quote.contact_phone,
      contact_email: quote.contact_email,
      title: quote.title,
      items: quote.items,
      discount: quote.discount,
      tax_mode: quote.tax_mode,
      tax_rate: quote.tax_rate,
      tax_amount: quote.tax_amount,
      total: quote.total,
      notes: quote.notes,
    });
  } catch (err) {
    if (isUniqueViolation(err)) return error("此報價單已轉為訂單", 409);
    throw err;
  }
  await db.quotes.update(quote.id, { status: "已接受", order_id: order.id });
  return json(await selectOrder(order.id), 201);
}
