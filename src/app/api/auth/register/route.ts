import { error } from "@/server/http";

// POST /api/auth/register — closed: only customers the studio created can become members,
// through the invite link (see /api/auth/invite).
export async function POST() {
  return error("目前僅開放工作室建立的會員，請向工作室索取邀請連結", 403);
}
