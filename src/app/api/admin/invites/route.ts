import { randomBytes } from "node:crypto";
import { appOrigin } from "@/server/line";
import { db } from "@/server/db";
import { json } from "@/server/http";

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

// POST /api/admin/invites — create a 24-hour one-time link for a new admin
export async function POST(req: Request) {
  const token = randomBytes(24).toString("base64url");
  const expires_at = new Date(Date.now() + INVITE_TTL_MS);
  await db.adminInvites.insert({ token, expires_at });
  return json({ url: `${appOrigin(req)}/admin-login?invite=${token}`, expires_at }, 201);
}
