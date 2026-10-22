import { error } from "@/server/http";

// POST /api/auth/register — closed: members sign up with LINE (/api/auth/line/start).
export async function POST() {
  return error("會員註冊請使用 LINE 登入", 403);
}
