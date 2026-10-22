import { randomInt } from "node:crypto";
import { z } from "zod/v4";
import { db } from "@/server/db";
import { getAdminSession } from "@/server/adminSession";
import { lineBotConfigured } from "@/server/line";
import { error, json, readJson } from "@/server/http";

const CODE_TTL_MS = 24 * 60 * 60 * 1000;

// GET /api/admin/invites — admins added but not yet linked to a LINE account
export async function GET() {
  const rows = await db.adminInvites.find({ code: { $type: "string" }, used_at: null, expires_at: { $gt: new Date() } }, { sort: { created_at: -1 } });
  return json({ pending: rows, oa_id: process.env.LINE_OA_ID ?? null });
}

// POST /api/admin/invites {name} — add a new admin and issue a one-time code (24 h).
// The person sends the code to the official LINE account to link their LINE.
export async function POST(req: Request) {
  const parsed = z.object({ name: z.string().trim().min(1) }).safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫人員名稱", 400);
  if (!lineBotConfigured()) return error("LINE 官方帳號尚未設定，無法使用綁定碼", 503);

  const me = await getAdminSession();
  const creator = me ? await db.adminUsers.findOne({ line_user_id: me.u }) : undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `A${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    try {
      const row = await db.adminInvites.insert({
        name: parsed.data.name,
        code,
        created_by: creator?.id ?? null,
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      });
      return json(row, 201);
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // code collided, draw again
    }
  }
  return error("產生綁定碼失敗，請再試一次", 500);
}
