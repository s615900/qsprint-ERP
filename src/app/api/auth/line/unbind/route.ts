import { db } from "@/server/db";
import { getCustomerId } from "@/server/session";
import { error, json } from "@/server/http";

// POST /api/auth/line/unbind
export async function POST() {
  const customerId = await getCustomerId();
  if (customerId === undefined) return error("Not logged in", 401);
  await db.customers.update(customerId, { line_user_id: null, line_display_name: null, line_bound: false });
  return json({ success: true });
}
