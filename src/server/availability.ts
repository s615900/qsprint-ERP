import "server-only";
import { db, rawCollection, type WeeklySlots, type DateOverride, type StudioWeekly } from "@/server/db";
import { DEFAULT_SLOTS, MAX_BOOKINGS_PER_SLOT } from "@/app/api/availability/slots/constants";
import { PERIODS, bookablePeriods, periodOf, toPeriods, type Period } from "@/lib/periods";

const NO_ID = { projection: { _id: 0 } } as const;

export type Photographer = { id: number; name: string; avatar?: string | null };

// Active staff customers can book: role 攝影師.
export async function listPhotographers(): Promise<Photographer[]> {
  const rows = await db.staff.find({ active: true, role: "攝影師" }, { sort: { id: 1 } });
  return rows.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar ?? null }));
}

export async function getPhotographer(id: number): Promise<Photographer | undefined> {
  const row = await db.staff.get(id);
  return row ? { id: row.id, name: row.name } : undefined;
}

// Weekly template for one photographer: their own rows, else the old
// studio-wide template, else everything open.
export async function getWeeklyTemplate(staffId: number): Promise<string[][]> {
  const [ownCol, studioCol] = await Promise.all([
    rawCollection("staff_availability_weekly"),
    rawCollection("availability_weekly"),
  ]);
  const [own, studio] = await Promise.all([
    ownCol.find({ staff_id: staffId }, NO_ID).toArray() as unknown as Promise<WeeklySlots[]>,
    studioCol.find({}, NO_ID).toArray() as unknown as Promise<StudioWeekly[]>,
  ]);
  const ownMap = new Map(own.map((r) => [r.weekday, toPeriods(r.slots)]));
  const studioMap = new Map(studio.map((r) => [r.weekday, toPeriods(r.slots)]));
  return Array.from({ length: 7 }, (_, d) => ownMap.get(d) ?? studioMap.get(d) ?? DEFAULT_SLOTS);
}

type DayPlan = { slots: string[]; custom: boolean; note: string | null };

// Open periods for every date in [start, end] (YYYY-MM-DD, inclusive).
async function getDayPlans(staffId: number, start: string, end: string): Promise<Map<string, DayPlan>> {
  // No default schedule: a day is open only if the photographer set it explicitly.
  const col = await rawCollection("staff_availability_overrides");
  const overrides = (await col
    .find({ staff_id: staffId, date: { $gte: start, $lte: end } }, NO_ID)
    .toArray()) as unknown as DateOverride[];
  const overrideMap = new Map(overrides.map((o) => [o.date, o]));

  const result = new Map<string, DayPlan>();
  // Iterate in UTC so toISOString() never shifts the date in non-UTC server timezones
  const endD = new Date(end + "T00:00:00Z");
  for (let d = new Date(start + "T00:00:00Z"); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const o = overrideMap.get(dateStr);
    result.set(dateStr, o ? { slots: toPeriods(o.slots), custom: true, note: o.note } : { slots: [], custom: false, note: null });
  }
  return result;
}

// Active (not 結案) bookings assigned to this photographer, counted by period.
async function getBookedPeriods(staffName: string, start: string, end: string, excludeBookingId?: number) {
  const rows = await db.bookings.find({
    date: { $gte: start, $lte: end },
    status: { $ne: "結案" },
    assigned_staff: staffName,
    ...(excludeBookingId ? { id: { $ne: excludeBookingId } } : {}),
  });
  const booked = new Map<string, Map<Period, number>>();
  for (const row of rows) {
    const p = periodOf(row.time_slot);
    if (!p) continue;
    if (!booked.has(row.date)) booked.set(row.date, new Map());
    const day = booked.get(row.date)!;
    day.set(p, (day.get(p) ?? 0) + 1);
  }
  return booked;
}

export async function getBookableSlots(staff: Photographer, start: string, end: string) {
  const [plans, booked] = await Promise.all([getDayPlans(staff.id, start, end), getBookedPeriods(staff.name, start, end)]);
  return [...plans.entries()].map(([date, plan]) => {
    const day = booked.get(date) ?? new Map<Period, number>();
    return { date, plan, booked: day, slots: bookablePeriods(plan.slots, day, MAX_BOOKINGS_PER_SLOT) };
  });
}

// No photographer chosen: a period is open if any photographer can take it.
export async function getBookableSlotsAnyPhotographer(start: string, end: string) {
  const photographers = await listPhotographers();
  const perStaff = await Promise.all(photographers.map((p) => getBookableSlots(p, start, end)));
  const dates = perStaff[0]?.map((d) => d.date) ?? [];
  return dates.map((date, i) => {
    const days = perStaff.map((s) => s[i]);
    const open = PERIODS.filter((p) => days.some((d) => d.plan.slots.includes(p)));
    const free = new Set(days.flatMap((d) => d.slots.filter((s) => s.available).map((s) => s.time)));
    const bookedCount = days.reduce((sum, d) => sum + [...d.booked.values()].reduce((a, b) => a + b, 0), 0);
    return { date, bookedCount, slots: open.map((time) => ({ time, available: free.has(time) })) };
  });
}

// Used when a booking is created/moved, so two people can't grab the same period.
export async function isBookable(staffName: string, date: string, slot: string, excludeBookingId?: number) {
  const staff = await db.staff.findOne({ name: staffName });
  if (!staff) return false;
  const [plans, booked] = await Promise.all([
    getDayPlans(staff.id, date, date),
    getBookedPeriods(staff.name, date, date, excludeBookingId),
  ]);
  const plan = plans.get(date)!;
  return bookablePeriods(plan.slots, booked.get(date) ?? new Map(), MAX_BOOKINGS_PER_SLOT).some(
    (s) => s.time === slot && s.available,
  );
}

export async function loadSchedule(staffId: number) {
  const weekly = await getWeeklyTemplate(staffId);
  return {
    weekly: weekly.map((slots, weekday) => ({ weekday, slots })),
    slot_choices: [...PERIODS],
  };
}

// Dedupe, keep only known periods, and store them in display order.
export function normalizeSlots(slots: string[]): string[] | null {
  if (!slots.every((s) => (PERIODS as readonly string[]).includes(s))) return null;
  return PERIODS.filter((p) => slots.includes(p));
}

export async function setWeekly(staffId: number, days: { weekday: number; slots: string[] }[]) {
  if (days.length === 0) return;
  const col = await rawCollection("staff_availability_weekly");
  await col.bulkWrite(
    days.map((d) => ({
      updateOne: {
        filter: { staff_id: staffId, weekday: d.weekday },
        update: { $set: { slots: d.slots, updated_at: new Date() } },
        upsert: true,
      },
    })),
  );
}

export async function setOverrides(staffId: number, dates: string[], slots: string[] | null, note: string | null) {
  const col = await rawCollection("staff_availability_overrides");
  if (slots === null) {
    await col.deleteMany({ staff_id: staffId, date: { $in: dates } });
    return;
  }
  await col.bulkWrite(
    dates.map((date) => ({
      updateOne: {
        filter: { staff_id: staffId, date },
        update: { $set: { slots, note, updated_at: new Date() } },
        upsert: true,
      },
    })),
  );
}
