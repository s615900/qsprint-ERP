import { db } from "@/server/db";
import { getCustomerId } from "@/server/session";
import { error, json } from "@/server/http";

// GET /api/auth/me
export async function GET() {
  const customerId = await getCustomerId();
  if (customerId === undefined) return error("Not logged in", 401);

  const customer = await db.customers.get(customerId);
  if (!customer) return error("Not logged in", 401);

  return json(customer);
}
