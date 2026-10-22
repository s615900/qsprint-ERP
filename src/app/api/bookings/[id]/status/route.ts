import { db } from "@/server/db";
import { UpdateBookingStatusParams, UpdateBookingStatusBody } from "@/lib/api-zod";
import { error, json, readJson } from "@/server/http";
import { toBookingResponses } from "@/server/bookings";
import { accountLink, pushMessagesToCustomer } from "@/server/line";
import { bookingCard } from "@/server/lineCards";

// PATCH /api/bookings/:id/status
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = UpdateBookingStatusParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateBookingStatusBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);

  const row = await db.bookings.update(params.data.id, { status: parsed.data.status });
  if (!row) return error("Booking not found", 404);

  await pushMessagesToCustomer(row.customer_id, [bookingCard("status", row, accountLink())]);

  const [full] = await toBookingResponses([row]);
  return json(full);
}
