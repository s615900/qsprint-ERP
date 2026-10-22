import { z } from "zod/v4";
import { hashPassword } from "@/server/password";
import { claimMemberInvite, ensureAccount, peekMemberInvite } from "@/server/memberInvite";
import { setCustomerSessionCookie } from "@/server/session";
import { error, json, readJson } from "@/server/http";

// GET /api/auth/invite?token=… — who an invite link is for (just the name, to greet them)
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const customer = token ? await peekMemberInvite(token) : undefined;
  if (!customer) return error("邀請連結無效或已過期，請向工作室索取新的連結", 404);
  return json({ name: customer.name });
}

const Body = z.object({ token: z.string().min(1), password: z.string().min(6, "密碼至少 6 個字") });

// POST /api/auth/invite — activate the account with a password instead of LINE
export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "請輸入密碼", 400);
  const customer = await claimMemberInvite(parsed.data.token);
  if (!customer) return error("邀請連結無效或已過期，請向工作室索取新的連結", 404);
  await ensureAccount(customer, hashPassword(parsed.data.password));
  await setCustomerSessionCookie(customer.id);
  return json(customer, 201);
}
