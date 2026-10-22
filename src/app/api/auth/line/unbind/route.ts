import { error } from "@/server/http";

// POST /api/auth/line/unbind — closed: LINE is the only way to sign in, so unbinding would lock the member out.
// To change the LINE account, ask the studio.
export async function POST() {
  return error("LINE 是唯一的登入方式，無法自行解除。如需更換 LINE 帳號，請聯絡工作室", 403);
}
