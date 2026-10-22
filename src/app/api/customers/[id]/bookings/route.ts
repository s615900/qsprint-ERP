import { db } from "@/server/db";
import { ListCustomerBookingsParams } from "@/lib/api-zod";
import { error, json } from "@/server/http";

// GET /api/customers/:id/bookings
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ListCustomerBookingsParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const rows = await db.bookings.find({ customer_id: params.data.id }, { sort: { date: -1 } });
  return json(
    rows.map((b) => ({ ...b, customer_name: b.contact_name, customer_phone: b.contact_phone })),
  );
}
