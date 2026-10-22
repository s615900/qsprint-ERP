import { db } from "@/server/db";
import { error, json } from "@/server/http";

// DELETE /api/admin/invites/:id — cancel a pending admin
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  const row = await db.adminInvites.remove({ id, used_at: null });
  return row ? json({ success: true }) : error("Not found", 404);
}
