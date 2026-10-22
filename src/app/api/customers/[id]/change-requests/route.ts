import { db } from "@/server/db";
import { ListCustomerChangeRequestsParams } from "@/lib/api-zod";
import { error, json } from "@/server/http";

// GET /api/customers/:id/change-requests
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ListCustomerChangeRequestsParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  return json(await db.changeRequests.find({ customer_id: params.data.id }, { sort: { created_at: -1 } }));
}
