import type { NextRequest } from "next/server";
import { getBookableSlots } from "@/server/availability";
import { readStaffParam } from "@/server/staff-param";
import { error, json } from "@/server/http";

// GET /api/availability/month?month=YYYY-MM&staff_id=N — admin calendar view
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const month = q.get("month");
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return error("month must be YYYY-MM", 400);
  const staff = await readStaffParam(q);
  if (!staff) return error("staff_id required", 400);

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = await getBookableSlots(staff, `${month}-01`, `${month}-${String(lastDay).padStart(2, "0")}`);

  return json(
    days.map((d) => ({
      date: d.date,
      slots: d.plan.slots,
      is_custom: d.plan.custom,
      note: d.plan.note,
      booked: [...d.booked.entries()].filter(([, n]) => n > 0).map(([p]) => p),
      bookable: d.slots.filter((s) => s.available).map((s) => s.time),
    })),
  );
}
