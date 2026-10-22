import "server-only";
import { db, type Customer } from "@/server/db";

// Every member has a login record (their phone, no password: LINE is the only way in).
export async function ensureAccount(customer: Customer) {
  const existing = await db.customerAccounts.findOne({ customer_id: customer.id });
  return existing ?? db.customerAccounts.insert({ customer_id: customer.id, phone: customer.phone, password_hash: null });
}
