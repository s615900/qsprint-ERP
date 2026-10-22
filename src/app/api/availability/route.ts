import type { NextRequest } from "next/server";
import { getBookableSlots, getBookableSlotsAnyPhotographer } from "@/server/availability";
import { readStaffParam } from "@/server/staff-param";
import { DATE_RE, error, json } from "@/server/http";

// GET /api/availability
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const start_date = q.get("start_date");
  const end_date = q.get("end_date");
  if (!start_date || !end_date || !DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
    return error("start_date and end_date must be YYYY-MM-DD", 400);
  }
  const staff = await readStaffParam(q);
  if (staff === null) return error("Unknown staff_id", 400);

  if (!staff) {
    const days = await getBookableSlotsAnyPhotographer(start_date, end_date);
    return json(days.map((d) => ({ date: d.date, available_slots: d.slots.filter((s) => s.available).length, booked_count: d.bookedCount })));
  }
  const days = await getBookableSlots(staff, start_date, end_date);
  return json(
    days.map((d) => ({
      date: d.date,
      available_slots: d.slots.filter((s) => s.available).length,
      booked_count: [...d.booked.values()].reduce((s, n) => s + n, 0),
    })),
  );
}
