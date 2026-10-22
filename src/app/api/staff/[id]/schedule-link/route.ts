import { getPhotographer } from "@/server/availability";
import { signDocToken } from "@/server/tokens";
import { error, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/staff/:id/schedule-link — personal link a photographer uses to manage their own open slots.
export async function GET(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return error("invalid id", 400);
  const staff = await getPhotographer(id);
  if (!staff) return error("not found", 404);
  return json({ path: `/my-schedule?token=${signDocToken("staff", staff.id)}` });
}
