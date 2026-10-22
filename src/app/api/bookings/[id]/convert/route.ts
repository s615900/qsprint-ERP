import { db, dailyNumber, computeTotal } from "@/server/db";
import { ConvertBookingToOrderParams } from "@/lib/api-zod";
import { selectOrder } from "@/server/orders";
import { isUniqueViolation } from "@/server/staff";
import { error, json } from "@/server/http";

// POST /api/bookings/:id/convert
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ConvertBookingToOrderParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const booking = await db.bookings.get(params.data.id);
  if (!booking) return error("Booking not found", 404);
  const existing = await db.orders.findOne({ booking_id: booking.id });
  if (existing) return Response.json({ error: "此預約已建立訂單", order_id: existing.id }, { status: 409 });

  // Price from the package the customer booked; unknown services start at 0
  // so the studio fills in the amount on the order.
  const pkg = await db.products.findOne({ name: booking.service_type });
  const items = [
    {
      name: booking.service_type,
      description: pkg ? pkg.features.join("、") : null,
      quantity: 1,
      unit_price: pkg?.price ?? 0,
    },
  ];
  // The unique index on orders.booking_id stops a double-click from creating two orders.
  let order;
  try {
    order = await db.orders.insert({
      order_number: await dailyNumber("O"),
      customer_id: booking.customer_id,
      booking_id: booking.id,
      contact_name: booking.contact_name,
      contact_phone: booking.contact_phone,
      contact_email: booking.contact_email,
      title: `${booking.contact_name} ${booking.service_type}`,
      items,
      discount: 0,
      total: computeTotal(items, 0),
      notes: booking.notes,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const dup = await db.orders.findOne({ booking_id: booking.id });
      return Response.json({ error: "此預約已建立訂單", order_id: dup?.id }, { status: 409 });
    }
    throw err;
  }
  return json(await selectOrder(order.id), 201);
}
