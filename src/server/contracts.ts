import "server-only";
import { db, type Contract } from "@/server/db";

type Filter = Record<string, unknown>;

// List and detail share this shape; signature images are only included for detail.
export async function selectContracts(filter: Filter = {}, withSignatures = false) {
  const rows = await db.contracts.find(filter, { sort: { id: -1 } });
  const quoteIds = [...new Set(rows.map((c) => c.quote_id).filter((x): x is number => x !== null))];
  const orderIds = [...new Set(rows.map((c) => c.order_id).filter((x): x is number => x !== null))];
  const [quotes, orders] = await Promise.all([
    quoteIds.length ? db.quotes.find({ id: { $in: quoteIds } }) : [],
    orderIds.length ? db.orders.find({ id: { $in: orderIds } }) : [],
  ]);
  const quoteNo = new Map(quotes.map((q) => [q.id, q.quote_number]));
  const orderNo = new Map(orders.map((o) => [o.id, o.order_number]));
  return rows.map((contract: Contract) => ({
    ...contract,
    ...(withSignatures ? {} : { customer_signature: null, staff_signature: null }),
    quote_number: contract.quote_id !== null ? (quoteNo.get(contract.quote_id) ?? null) : null,
    order_number: contract.order_id !== null ? (orderNo.get(contract.order_id) ?? null) : null,
  }));
}

export async function selectContract(id: number) {
  const [row] = await selectContracts({ id }, true);
  return row;
}
