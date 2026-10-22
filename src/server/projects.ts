import "server-only";
import { db, type Project } from "@/server/db";

// Projects with the number of the order they came from.
export async function withOrderNumbers(rows: Project[]) {
  const orderIds = [...new Set(rows.map((p) => p.order_id).filter((x): x is number => x !== null))];
  const orders = orderIds.length ? await db.orders.find({ id: { $in: orderIds } }) : [];
  const orderNo = new Map(orders.map((o) => [o.id, o.order_number]));
  return rows.map((p) => ({ ...p, order_number: p.order_id !== null ? (orderNo.get(p.order_id) ?? null) : null }));
}
