import { db } from "@/server/db";
import { error, json, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// The browser shrinks the photo to a ~256px JPEG first; this is just a size/format guard.
const MAX_LEN = 150_000;

// PUT /api/staff/:id/avatar  { avatar: "data:image/jpeg;base64,..." | null }
export async function PUT(req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("bad id", 400);
  const body = (await readJson(req)) as { avatar?: string | null } | null;
  const avatar = body?.avatar ?? null;
  if (avatar !== null && (typeof avatar !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) || avatar.length > MAX_LEN)) {
    return error("圖片格式不正確或太大", 400);
  }
  const current = await db.staff.get(id);
  if (!current) return error("Staff not found", 404);
  await db.staff.update(id, { avatar });
  return json({ avatar });
}
