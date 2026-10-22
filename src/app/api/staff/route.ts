import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { CreateStaffBody } from "@/lib/api-zod";
import { ensureStaffSeeded, isUniqueViolation, selectStaff, selectStaffMember } from "@/server/staff";
import { error, json, readJson } from "@/server/http";

// GET /api/staff
export async function GET(req: NextRequest) {
  await ensureStaffSeeded();
  const all = req.nextUrl.searchParams.get("include_inactive") === "true";
  return json(await selectStaff(all ? {} : { active: true }));
}

// POST /api/staff
export async function POST(req: Request) {
  const parsed = CreateStaffBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const name = parsed.data.name.trim();
  if (!name) return error("name required", 400);

  try {
    const row = await db.staff.insert({
      name,
      role: parsed.data.role?.trim() || "攝影師",
      phone: parsed.data.phone?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    });
    return json(await selectStaffMember(row.id), 201);
  } catch (err) {
    if (isUniqueViolation(err)) return error("已有同名人員", 409);
    throw err;
  }
}
