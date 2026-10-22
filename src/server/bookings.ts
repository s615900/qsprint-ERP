import "server-only";
import { db, type Booking } from "@/server/db";

// Shape the API returns for a booking, including the order made from it.
export async function toBookingResponses(rows: Booking[]) {
  const ids = rows.map((r) => r.id);
  const orders = ids.length ? await db.orders.find({ booking_id: { $in: ids } }, { sort: { id: 1 } }) : [];
  const orderMap = new Map<number, number>();
  for (const o of orders) if (o.booking_id !== null && !orderMap.has(o.booking_id)) orderMap.set(o.booking_id, o.id);
  return rows.map((b) => ({
    ...b,
    customer_name: b.contact_name,
    customer_phone: b.contact_phone,
    order_id: orderMap.get(b.id) ?? null,
  }));
}
