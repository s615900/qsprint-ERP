import { db } from "@/server/db";
import {
  ListCustomerInteractionsParams,
  CreateCustomerInteractionParams,
  CreateCustomerInteractionBody,
} from "@/lib/api-zod";
import { error, json, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/customers/:id/interactions
export async function GET(_req: Request, ctx: Ctx) {
  const params = ListCustomerInteractionsParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  return json(await db.interactions.find({ customer_id: params.data.id }, { sort: { created_at: -1 } }));
}

// POST /api/customers/:id/interactions
export async function POST(req: Request, ctx: Ctx) {
  const params = CreateCustomerInteractionParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = CreateCustomerInteractionBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const row = await db.interactions.insert({ customer_id: params.data.id, ...parsed.data });
  return json(row, 201);
}
