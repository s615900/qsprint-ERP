import { db } from "@/server/db";
import { getAdminSession } from "@/server/adminSession";
import { error, json } from "@/server/http";

// DELETE /api/admin/admins/:id — remove an admin (their current session expires within 12 hours)
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  const me = await getAdminSession();
  const target = await db.adminUsers.get(id);
  if (!target) return error("Not found", 404);
  if (me && target.line_user_id === me.u) return error("不能移除自己", 400);
  await db.adminUsers.remove(id);
  return json({ success: true });
}
