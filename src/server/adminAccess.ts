import "server-only";
import { randomInt } from "node:crypto";
import { db, type Staff } from "@/server/db";

const CODE_TTL_MS = 24 * 60 * 60 * 1000;

export type AccessState =
  | { status: "none" }
  | { status: "pending"; code: string; expires_at: Date }
  | { status: "active"; admin_id: number; line_name: string };

// Back-office access of every staff member: none, waiting for the LINE binding code, or linked.
export async function accessByStaff(): Promise<Map<number, AccessState>> {
  const [admins, invites] = await Promise.all([
    db.adminUsers.find({ staff_id: { $ne: null } }),
    db.adminInvites.find({ staff_id: { $ne: null }, used_at: null, expires_at: { $gt: new Date() } }),
  ]);
  const map = new Map<number, AccessState>();
  for (const i of invites) map.set(i.staff_id!, { status: "pending", code: i.code, expires_at: i.expires_at });
  for (const a of admins) map.set(a.staff_id!, { status: "active", admin_id: a.id, line_name: a.display_name });
  return map;
}

// New one-time code (24 h) the person sends to the official LINE; an older unused code is replaced.
export async function issueAdminCode(staff: Staff) {
  await db.adminInvites.removeMany({ staff_id: staff.id, used_at: null });
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `A${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    try {
      return await db.adminInvites.insert({
        name: staff.name,
        staff_id: staff.id,
        code,
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // code collided, draw again
    }
  }
  throw new Error("could not issue an admin code");
}

// Removes back-office access (linked LINE and any unused code) of a staff member.
export async function revokeAdminAccess(staffId: number) {
  await Promise.all([db.adminUsers.removeMany({ staff_id: staffId }), db.adminInvites.removeMany({ staff_id: staffId })]);
}
