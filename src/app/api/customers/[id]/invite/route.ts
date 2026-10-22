import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { appOrigin } from "@/server/line";
import { error, json } from "@/server/http";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// POST /api/customers/:id/invite — one-time link (7 days) for this customer to activate their member account
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  if (!(await db.customers.get(id))) return error("Customer not found", 404);

  await db.memberInvites.removeMany({ customer_id: id, used_at: null }); // newest link replaces older ones
  const token = randomBytes(24).toString("base64url");
  const expires_at = new Date(Date.now() + INVITE_TTL_MS);
  await db.memberInvites.insert({ token, customer_id: id, expires_at });
  return json({ url: `${appOrigin(req)}/register?invite=${token}`, expires_at }, 201);
}
