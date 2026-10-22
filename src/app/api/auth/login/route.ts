import { error } from "@/server/http";

// POST /api/auth/login — closed: members sign in with LINE only (/api/auth/line/start).
export async function POST() {
  return error("會員僅能使用 LINE 登入", 403);
}
