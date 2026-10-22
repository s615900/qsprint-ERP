import type { NextRequest } from "next/server";
import { getBookableSlots, getBookableSlotsAnyPhotographer } from "@/server/availability";
import { readStaffParam } from "@/server/staff-param";
import { DATE_RE, error, json } from "@/server/http";

// GET /api/availability/slots
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const date = q.get("date");
  if (!date || !DATE_RE.test(date)) {
    return error("date must be YYYY-MM-DD", 400);
  }
  const staff = await readStaffParam(q);
  if (staff === null) return error("Unknown staff_id", 400);

  const [day] = staff ? await getBookableSlots(staff, date, date) : await getBookableSlotsAnyPhotographer(date, date);
  return json(day?.slots ?? []);
}
