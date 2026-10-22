import { UpdateWeeklyScheduleBody } from "@/lib/api-zod";
import { getPhotographer, loadSchedule, normalizeSlots, setWeekly } from "@/server/availability";
import { error, json, readJson } from "@/server/http";

// PUT /api/availability/weekly
export async function PUT(req: Request) {
  const parsed = UpdateWeeklyScheduleBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const staff = await getPhotographer(parsed.data.staff_id);
  if (!staff) return error("Unknown staff_id", 400);

  const days = [];
  for (const d of parsed.data.days) {
    const slots = normalizeSlots(d.slots);
    if (!slots) return error("unknown slot", 400);
    days.push({ weekday: d.weekday, slots });
  }
  await setWeekly(staff.id, days);
  return json(await loadSchedule(staff.id));
}
