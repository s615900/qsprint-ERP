import "server-only";
import { db, type Customer } from "@/server/db";

// Atomically uses up an invite (one link = one activation) and returns the customer it was made for.
export async function claimMemberInvite(token: string): Promise<Customer | undefined> {
  const invite = await db.memberInvites.update(
    { token, used_at: null, expires_at: { $gt: new Date() } },
    { used_at: new Date() },
  );
  return invite ? db.customers.get(invite.customer_id) : undefined;
}

export async function peekMemberInvite(token: string): Promise<Customer | undefined> {
  const invite = await db.memberInvites.findOne({ token, used_at: null, expires_at: { $gt: new Date() } });
  return invite ? db.customers.get(invite.customer_id) : undefined;
}

// A customer created in the back office has no login yet; give them one (password optional).
// When a password is supplied for an existing account it replaces the old one, so a fresh invite doubles
// as a password reset.
export async function ensureAccount(customer: Customer, passwordHash: string | null) {
  const existing = await db.customerAccounts.findOne({ customer_id: customer.id });
  if (existing) {
    return passwordHash ? ((await db.customerAccounts.update(existing.id, { password_hash: passwordHash })) ?? existing) : existing;
  }
  return db.customerAccounts.insert({ customer_id: customer.id, phone: customer.phone, password_hash: passwordHash });
}
