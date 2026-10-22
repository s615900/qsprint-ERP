import { db } from "@/server/db";
import { UpdateBookingStatusParams, UpdateBookingStatusBody } from "@/lib/api-zod";
import { error, json, readJson } from "@/server/http";
import { toBookingResponses } from "@/server/bookings";
import { pushToCustomer } from "@/server/line";

// PATCH /api/bookings/:id/status
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = UpdateBookingStatusParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateBookingStatusBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);

  const row = await db.bookings.update(params.data.id, { status: parsed.data.status });
  if (!row) return error("Booking not found", 404);

  await pushToCustomer(
    row.customer_id,
    `您的預約狀態更新為「${row.status}」\n單號：${row.booking_number}\n服務：${row.service_type}（${row.date} ${row.time_slot}）`,
  );

  const [full] = await toBookingResponses([row]);
  return json(full);
}
