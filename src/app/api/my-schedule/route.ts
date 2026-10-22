import type { NextRequest } from "next/server";
import { getPhotographer } from "@/server/availability";
import { verifyDocToken } from "@/server/tokens";
import { error, json } from "@/server/http";

// GET /api/my-schedule?token=… — who the personal schedule link belongs to.
export async function GET(req: NextRequest) {
  const id = verifyDocToken("staff", req.nextUrl.searchParams.get("token") ?? "");
  const staff = id ? await getPhotographer(id) : undefined;
  if (!staff) return error("連結無效或已失效", 404);
  return json(staff);
}
