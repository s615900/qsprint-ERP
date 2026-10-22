import { peekMemberInvite } from "@/server/memberInvite";
import { error, json } from "@/server/http";

// GET /api/auth/invite?token=… — who an invite link is for (just the name, to greet them)
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const customer = token ? await peekMemberInvite(token) : undefined;
  if (!customer) return error("邀請連結無效或已過期，請向工作室索取新的連結", 404);
  return json({ name: customer.name });
}
