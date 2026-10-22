import "server-only";
import { db, type Order } from "@/server/db";

type Filter = Record<string, unknown>;

// paid_amount is derived from the ledger: every income row linked to the order.
async function paidByOrder(orderIds: number[]): Promise<Map<number, number>> {
  if (!orderIds.length) return new Map();
  const col = await db.transactions.col();
  const rows = await col
    .aggregate<{ _id: number; paid: number }>([
      { $match: { type: "收入", order_id: { $in: orderIds } } },
      { $group: { _id: "$order_id", paid: { $sum: "$amount" } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.paid]));
}

async function decorate(rows: Order[]) {
  const quoteIds = [...new Set(rows.map((o) => o.quote_id).filter((x): x is number => x !== null))];
  const bookingIds = [...new Set(rows.map((o) => o.booking_id).filter((x): x is number => x !== null))];
  const [paid, quotes, bookings] = await Promise.all([
    paidByOrder(rows.map((o) => o.id)),
    quoteIds.length ? db.quotes.find({ id: { $in: quoteIds } }) : [],
    bookingIds.length ? db.bookings.find({ id: { $in: bookingIds } }) : [],
  ]);
  const quoteNo = new Map(quotes.map((q) => [q.id, q.quote_number]));
  const bookingNo = new Map(bookings.map((b) => [b.id, b.booking_number]));
  return rows.map((order) => {
    const paid_amount = paid.get(order.id) ?? 0;
    return {
      ...order,
      quote_number: order.quote_id !== null ? (quoteNo.get(order.quote_id) ?? null) : null,
      booking_number: order.booking_id !== null ? (bookingNo.get(order.booking_id) ?? null) : null,
      paid_amount,
      balance: order.total - paid_amount,
    };
  });
}

export async function selectOrders(filter: Filter = {}) {
  return decorate(await db.orders.find(filter, { sort: { created_at: -1 } }));
}

export async function selectOrder(id: number) {
  const [row] = await selectOrders({ id });
  return row;
}

// Outstanding = non-cancelled orders whose payments haven't covered the total.
export async function selectOutstandingOrders() {
  const rows = await selectOrders({ status: { $ne: "已取消" } });
  return rows.filter((o) => o.total > o.paid_amount);
}
