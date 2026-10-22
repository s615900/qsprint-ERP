import { listPhotographers } from "@/server/availability";
import { ensureStaffSeeded } from "@/server/staff";
import { json } from "@/server/http";

// GET /api/photographers — public, names only
export async function GET() {
  await ensureStaffSeeded();
  return json(await listPhotographers());
}
