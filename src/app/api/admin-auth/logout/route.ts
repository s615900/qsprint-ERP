import { clearAdminSession } from "@/server/adminSession";
import { json } from "@/server/http";

// POST /api/admin-auth/logout
export async function POST() {
  await clearAdminSession();
  return json({ success: true });
}
