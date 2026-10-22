import { db } from "@/server/db";
import { CreateMyChangeRequestBody } from "@/lib/api-zod";
import { getCustomerId } from "@/server/session";
import { error, json, readJson } from "@/server/http";

// GET /api/auth/change-requests
export async function GET() {
  const customerId = await getCustomerId();
  if (customerId === undefined) return error("Not logged in", 401);
  return json(await db.changeRequests.find({ customer_id: customerId }));
}

// POST /api/auth/change-requests
export async function POST(req: Request) {
  const customerId = await getCustomerId();
  if (customerId === undefined) return error("Not logged in", 401);
  const parsed = CreateMyChangeRequestBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const row = await db.changeRequests.insert({ customer_id: customerId, ...parsed.data });
  return json(row, 201);
}
