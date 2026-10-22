import { randomInt } from "node:crypto";
import { db } from "@/server/db";
import { lineBotConfigured } from "@/server/line";
import { getCustomerId } from "@/server/session";
import { error, json } from "@/server/http";

const CODE_TTL_MS = 10 * 60 * 1000;

// POST /api/auth/line/bind-code — issue a 6-digit code to send to the @LINE official account
export async function POST() {
  const customerId = await getCustomerId();
  if (customerId === undefined) return error("Not logged in", 401);
  if (!lineBotConfigured()) return error("LINE 官方帳號尚未設定", 503);

  await db.lineBindCodes.removeMany({ customer_id: customerId });
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expires_at = new Date(Date.now() + CODE_TTL_MS);
    try {
      await db.lineBindCodes.insert({ code, customer_id: customerId, expires_at });
      return json({ code, expires_at });
    } catch {
      // Code collided with another customer's live code; draw again.
    }
  }
  return error("產生驗證碼失敗，請再試一次", 500);
}
