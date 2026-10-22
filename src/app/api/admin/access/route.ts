import { db } from "@/server/db";
import { accessByStaff } from "@/server/adminAccess";
import { envAdminIds } from "@/server/adminSession";
import { json } from "@/server/http";

// GET /api/admin/access — back-office access per staff member, plus admins that aren't a staff member
export async function GET() {
  const [access, others] = await Promise.all([accessByStaff(), db.adminUsers.find({ staff_id: null }, { sort: { created_at: 1 } })]);
  return json({
    access: [...access.entries()].map(([staff_id, state]) => ({ staff_id, ...state })),
    other_admins: others.map((a) => ({ id: a.id, display_name: a.display_name })),
    env_admin_count: envAdminIds().length,
    oa_id: process.env.LINE_OA_ID ?? null,
  });
}
