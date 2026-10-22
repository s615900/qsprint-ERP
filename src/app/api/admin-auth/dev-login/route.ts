import { setAdminSession } from "@/server/adminSession";
import { error, json } from "@/server/http";

// POST /api/admin-auth/dev-login — only exists under `next dev`; production builds refuse it
export async function POST() {
  if (process.env.NODE_ENV !== "development") return error("Not found", 404);
  await setAdminSession("dev-local", "本機開發");
  return json({ success: true });
}
