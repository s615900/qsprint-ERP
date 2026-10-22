import { clearCustomerSessionCookie } from "@/server/session";
import { noContent } from "@/server/http";

// POST /api/auth/logout
export async function POST() {
  await clearCustomerSessionCookie();
  return noContent();
}
