import { db } from "@/server/db";
import { envAdminIds } from "@/server/adminSession";
import { json } from "@/server/http";

// GET /api/admin/admins — admins added through invites, plus how many come from ADMIN_LINE_USER_IDS
export async function GET() {
  const rows = await db.adminUsers.find({}, { sort: { created_at: -1 } });
  return json({ admins: rows, env_admin_count: envAdminIds().length });
}
