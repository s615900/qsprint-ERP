import { getAdminSession } from "@/server/adminSession";
import { error, json } from "@/server/http";

// GET /api/admin-auth/me
export async function GET() {
  const s = await getAdminSession();
  if (!s) return error("Not logged in", 401);
  return json({ line_user_id: s.u, name: s.n });
}
