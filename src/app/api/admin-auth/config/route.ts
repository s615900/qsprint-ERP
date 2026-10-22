import { lineLoginConfigured } from "@/server/line";
import { json } from "@/server/http";

// GET /api/admin-auth/config — what the login page may offer
export async function GET() {
  return json({
    line_enabled: lineLoginConfigured(),
    // Local development only, so the back office stays usable before LINE keys exist.
    dev_login: process.env.NODE_ENV === "development",
  });
}
