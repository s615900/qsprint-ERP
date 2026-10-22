import { db } from "@/server/db";
import { issueAdminCode, revokeAdminAccess } from "@/server/adminAccess";
import { getAdminSession } from "@/server/adminSession";
import { lineBotConfigured } from "@/server/line";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/staff/:id/admin-access — open back-office access: issue a binding code to send to the official LINE
export async function POST(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  const staff = await db.staff.get(id);
  if (!staff) return error("Staff not found", 404);
  if (!lineBotConfigured()) return error("LINE 官方帳號尚未設定，無法使用綁定碼", 503);
  const invite = await issueAdminCode(staff);
  return json({ code: invite.code, expires_at: invite.expires_at }, 201);
}

// DELETE /api/staff/:id/admin-access — close access (linked LINE and unused code)
export async function DELETE(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  const me = await getAdminSession();
  const linked = await db.adminUsers.findOne({ staff_id: id });
  if (me && linked && linked.line_user_id === me.u) return error("不能關閉自己的後台權限", 400);
  await revokeAdminAccess(id);
  return json({ success: true });
}
