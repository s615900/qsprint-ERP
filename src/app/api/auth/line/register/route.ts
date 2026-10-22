import { z } from "zod/v4";
import { db, dailyNumber } from "@/server/db";
import { clearPendingProfile, getPendingProfile } from "@/server/line";
import { ensureAccount } from "@/server/memberInvite";
import { setCustomerSessionCookie } from "@/server/session";
import { isUniqueViolation } from "@/server/staff";
import { error, json, readJson } from "@/server/http";

const Body = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  email: z.string().trim().optional(),
});

// GET /api/auth/line/register — who is waiting to finish registering (for the form header)
export async function GET() {
  const pending = await getPendingProfile();
  if (!pending) return error("LINE 登入已逾時，請重新操作", 401);
  return json({ display_name: pending.displayName });
}

// POST /api/auth/line/register — finish sign-up for a LINE user: becomes a member right away
export async function POST(req: Request) {
  const pending = await getPendingProfile();
  if (!pending) return error("LINE 登入已逾時，請重新操作", 401);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫姓名與手機號碼", 400);
  const { name, phone, email } = parsed.data;

  if (await db.customers.findOne({ line_user_id: pending.userId })) return error("此 LINE 帳號已經是會員", 409);

  const lineFields = { line_user_id: pending.userId, line_display_name: pending.displayName, line_bound: true };
  try {
    // A customer the studio already created with this phone number (and no LINE yet) is linked, not duplicated.
    const existing = await db.customers.findOne({ phone });
    if (existing?.line_user_id) return error("這個手機號碼已綁定其他 LINE 帳號，請聯絡工作室", 409);
    const customer = existing
      ? (await db.customers.update(existing.id, lineFields))!
      : await db.customers.insert({
          customer_number: await dailyNumber("C"),
          name,
          phone,
          email: email || null,
          source: "LINE",
          category: "個人寫真",
          member_tier: "一般",
          tags: [],
          ...lineFields,
        });
    await ensureAccount(customer);
    await clearPendingProfile();
    await setCustomerSessionCookie(customer.id);
    return json(customer, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return error("這個手機號碼或 LINE 帳號已經註冊過了", 409);
    throw err;
  }
}
