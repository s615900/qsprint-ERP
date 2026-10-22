// Booking periods offered to customers. 整天 overlaps the other three.
export const PERIODS = ["早上", "下午", "晚上", "整天"] as const;
export type Period = (typeof PERIODS)[number];
const HALF_DAY: Period[] = ["早上", "下午", "晚上"];

// Map a stored time_slot to its period; legacy "HH:MM" bookings fall into
// the period their start hour belongs to.
export function periodOf(slot: string): Period | null {
  if ((PERIODS as readonly string[]).includes(slot)) return slot as Period;
  const hour = Number(slot.slice(0, 2));
  if (Number.isNaN(hour)) return null;
  return hour < 12 ? "早上" : hour < 18 ? "下午" : "晚上";
}

// Normalize stored slots (incl. legacy hourly "HH:MM" settings) to periods.
export function toPeriods(slots: string[]): Period[] {
  const found = new Set(slots.map(periodOf));
  return PERIODS.filter((p) => found.has(p));
}

// Chronological sort key for any time_slot value.
export function slotSortKey(slot: string): string {
  const i = (PERIODS as readonly string[]).indexOf(slot);
  return i >= 0 ? `${i}` : `${PERIODS.indexOf(periodOf(slot) ?? "整天")}${slot}`;
}

// Which open periods can still be booked, given how many bookings each
// period already holds. 整天 blocks everything and vice versa.
export function bookablePeriods(open: string[], bookedCount: Map<Period, number>, maxPerSlot: number) {
  const fullDayTaken = (bookedCount.get("整天") ?? 0) > 0;
  const anyHalfTaken = HALF_DAY.some((p) => (bookedCount.get(p) ?? 0) > 0);
  return open.map((time) => {
    const p = time as Period;
    const own = bookedCount.get(p) ?? 0;
    const available = p === "整天" ? own < maxPerSlot && !anyHalfTaken : own < maxPerSlot && !fullDayTaken;
    return { time, available };
  });
}
