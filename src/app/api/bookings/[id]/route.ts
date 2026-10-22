import { db } from "@/server/db";
import {
  GetBookingParams,
  UpdateBookingParams,
  UpdateBookingBody,
  DeleteBookingParams,
} from "@/lib/api-zod";
import { error, json, noContent, readJson } from "@/server/http";
import { toBookingResponses } from "@/server/bookings";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/bookings/:id
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetBookingParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.bookings.get(params.data.id);
  if (!row) return error("Booking not found", 404);
  const [full] = await toBookingResponses([row]);
  return json(full);
}

// PUT /api/bookings/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateBookingParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateBookingBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);

  const { date, ...updateRest } = parsed.data;
  const row = await db.bookings.update(params.data.id, {
    ...updateRest,
    ...(date !== undefined && {
      date: date instanceof Date ? date.toISOString().slice(0, 10) : date,
    }),
  });
  if (!row) return error("Booking not found", 404);
  const [full] = await toBookingResponses([row]);
  return json(full);
}

// DELETE /api/bookings/:id — orders and projects made from it keep their data, minus the link
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteBookingParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.bookings.remove(params.data.id);
  if (!row) return error("Booking not found", 404);
  await Promise.all([
    db.orders.updateMany({ booking_id: row.id }, { booking_id: null }),
    db.projects.updateMany({ booking_id: row.id }, { booking_id: null }),
  ]);
  return noContent();
}
