import { db } from "@/server/db";
import { lineBotConfigured, lineLoginConfigured } from "@/server/line";
import { getCustomerId } from "@/server/session";
import { error, json } from "@/server/http";

// GET /api/auth/line/status — what the account page needs to show the LINE section
export async function GET() {
  const customerId = await getCustomerId();
  if (customerId === undefined) return error("Not logged in", 401);
  const c = await db.customers.get(customerId);
  if (!c) return error("Not logged in", 401);
  return json({
    bound: !!c.line_user_id,
    display_name: c.line_display_name,
    login_enabled: lineLoginConfigured(),
    code_enabled: lineBotConfigured(),
    oa_id: process.env.LINE_OA_ID ?? null,
  });
}
