import "server-only";
import { db, taipeiDate, type Staff } from "@/server/db";

type Filter = Record<string, unknown>;

export async function selectStaff(filter: Filter = {}) {
  const [rows, bookings] = await Promise.all([db.staff.find(filter), db.bookings.find({ assigned_staff: { $ne: null } })]);
  const today = taipeiDate();
  const counts = new Map<string, { total: number; upcoming: number }>();
  for (const b of bookings) {
    const c = counts.get(b.assigned_staff!) ?? { total: 0, upcoming: 0 };
    c.total++;
    if (b.date >= today && b.status !== "結案") c.upcoming++;
    counts.set(b.assigned_staff!, c);
  }
  return rows
    .sort((a: Staff, b: Staff) => Number(b.active) - Number(a.active) || a.id - b.id)
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      phone: s.phone,
      notes: s.notes,
      active: s.active,
      booking_count: counts.get(s.name)?.total ?? 0,
      upcoming_count: counts.get(s.name)?.upcoming ?? 0,
    }));
}

export async function selectStaffMember(id: number) {
  const [row] = await selectStaff({ id });
  return row;
}

// The roster that used to be hard-coded in the booking pages.
const INITIAL_STAFF = ["陳攝影師", "林攝影師", "王攝影師", "張攝影師"];

// First run: carry over the old hard-coded roster plus anyone already
// assigned on a booking, so existing assignments stay selectable.
export async function ensureStaffSeeded() {
  if ((await db.staff.count()) > 0) return;
  const used = await db.bookings.find({ assigned_staff: { $nin: [null, ""] } });
  const names = [...new Set([...INITIAL_STAFF, ...used.map((u) => u.assigned_staff!)])];
  for (const name of names) {
    try {
      await db.staff.insert({ name });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // a concurrent request seeded it first
    }
  }
}

export function isUniqueViolation(err: unknown) {
  return (err as { code?: number })?.code === 11000;
}
