import type { NextRequest } from "next/server";
import { db, dailyNumber, computeAmounts } from "@/server/db";
import { CreateOrderBody, ListOrdersQueryParams } from "@/lib/api-zod";
import { selectOrders, selectOrder } from "@/server/orders";
import { DATE_RE, error, json, readJson } from "@/server/http";
import { escapeRegex } from "@/server/search";

// GET /api/orders
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  // zod.coerce.boolean() turns "false" into true, so read `unpaid` by hand.
  const unpaid = q.get("unpaid") === "true";
  q.delete("unpaid");
  const parsed = ListOrdersQueryParams.safeParse(Object.fromEntries(q));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { status, search, customer_id } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (unpaid && !status) filter.status = { $ne: "已取消" };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ contact_name: rx }, { title: rx }, { order_number: rx }];
  }

  let rows = await selectOrders(filter);
  // Outstanding = non-cancelled orders whose payments haven't covered the total.
  if (unpaid) rows = rows.filter((o) => o.status !== "已取消" && o.total > o.paid_amount);
  return json(rows);
}

// POST /api/orders
export async function POST(req: Request) {
  const parsed = CreateOrderBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { items, discount = 0, tax_mode = "含稅", tax_rate = 5, delivery_date, ...rest } = parsed.data;
  if (delivery_date && !DATE_RE.test(delivery_date)) return error("delivery_date must be YYYY-MM-DD", 400);

  const inserted = await db.orders.insert({
    ...rest,
    order_number: await dailyNumber("O"),
    items,
    discount,
    tax_mode,
    tax_rate,
    ...computeAmounts(items, discount, tax_mode, tax_rate),
    delivery_date: delivery_date || null,
  });
  return json(await selectOrder(inserted.id), 201);
}
