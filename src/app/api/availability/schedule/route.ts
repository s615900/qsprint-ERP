import type { NextRequest } from "next/server";
import { loadSchedule } from "@/server/availability";
import { readStaffParam } from "@/server/staff-param";
import { error, json } from "@/server/http";

// GET /api/availability/schedule?staff_id=N
export async function GET(req: NextRequest) {
  const staff = await readStaffParam(req.nextUrl.searchParams);
  if (!staff) return error("staff_id required", 400);
  return json(await loadSchedule(staff.id));
}
