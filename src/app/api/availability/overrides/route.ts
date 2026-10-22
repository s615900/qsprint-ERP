import { SetAvailabilityOverridesBody } from "@/lib/api-zod";
import { getPhotographer, normalizeSlots, setOverrides } from "@/server/availability";
import { DATE_RE, error, noContent, readJson } from "@/server/http";

// PUT /api/availability/overrides — slots: null restores the weekly default.
export async function PUT(req: Request) {
  const parsed = SetAvailabilityOverridesBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { staff_id, dates, note } = parsed.data;
  if (!dates.every((d) => DATE_RE.test(d))) return error("dates must be YYYY-MM-DD", 400);
  const staff = await getPhotographer(staff_id);
  if (!staff) return error("Unknown staff_id", 400);

  let slots: string[] | null = null;
  if (parsed.data.slots != null) {
    slots = normalizeSlots(parsed.data.slots);
    if (!slots) return error("unknown slot", 400);
  }
  await setOverrides(staff.id, [...new Set(dates)], slots, note?.trim() || null);
  return noContent();
}
