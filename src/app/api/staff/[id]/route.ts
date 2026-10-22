import { db, rawCollection } from "@/server/db";
import { UpdateStaffParams, UpdateStaffBody, DeleteStaffParams } from "@/lib/api-zod";
import { isUniqueViolation, selectStaffMember } from "@/server/staff";
import { error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/staff/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateStaffParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateStaffBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { name, role, phone, notes, active } = parsed.data;
  if (name !== undefined && !name.trim()) return error("name required", 400);

  try {
    const current = await db.staff.get(params.data.id);
    if (!current) return error("Staff not found", 404);
    const newName = name?.trim();
    await db.staff.update(current.id, {
      ...(newName !== undefined && { name: newName }),
      ...(role !== undefined && { role: role.trim() || "攝影師" }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(active !== undefined && { active }),
    });
    // Bookings store the name, so carry a rename over to them.
    if (newName && newName !== current.name) {
      await db.bookings.updateMany({ assigned_staff: current.name }, { assigned_staff: newName });
    }
  } catch (err) {
    if (isUniqueViolation(err)) return error("已有同名人員", 409);
    throw err;
  }
  return json(await selectStaffMember(params.data.id));
}

// DELETE /api/staff/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteStaffParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const member = await selectStaffMember(params.data.id);
  if (!member) return error("Staff not found", 404);
  if (member.booking_count > 0) return error("這位人員有預約紀錄，請改用停用", 409);

  await db.staff.remove(member.id);
  // Their personal schedule goes with them.
  await Promise.all(
    ["staff_availability_weekly", "staff_availability_overrides"].map(async (name) =>
      (await rawCollection(name)).deleteMany({ staff_id: member.id }),
    ),
  );
  return noContent();
}
