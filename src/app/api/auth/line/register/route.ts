import { z } from "zod/v4";
import { db, dailyNumber } from "@/server/db";
import { clearPendingProfile, getPendingProfile } from "@/server/line";
import { hashPassword } from "@/server/password";
import { setCustomerSessionCookie } from "@/server/session";
import { isUniqueViolation } from "@/server/staff";
import { error, json, readJson } from "@/server/http";

const Body = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  password: z.string().min(1).optional(),
});

// GET /api/auth/line/register — who is waiting to finish registering (for the form header)
export async function GET() {
  const pending = await getPendingProfile();
  if (!pending) return error("LINE 登入已逾時，請重新操作", 401);
  return json({ display_name: pending.displayName });
}

// POST /api/auth/line/register — finish sign-up for a LINE user with no member account yet
export async function POST(req: Request) {
  const pending = await getPendingProfile();
  if (!pending) return error("LINE 登入已逾時，請重新操作", 401);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫姓名與手機號碼", 400);
  const { name, phone, email, password } = parsed.data;

  if (await db.customerAccounts.findOne({ phone })) {
    return error("此手機號碼已有會員帳號，請先用手機與密碼登入，再到會員中心綁定 LINE", 409);
  }
  if (await db.customers.findOne({ line_user_id: pending.userId })) return error("此 LINE 帳號已綁定其他會員", 409);

  const lineFields = { line_user_id: pending.userId, line_display_name: pending.displayName, line_bound: true };
  try {
    const existing = await db.customers.findOne({ phone });
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
    await db.customerAccounts.insert({
      customer_id: customer.id,
      phone,
      password_hash: password ? hashPassword(password) : null,
    });

    await clearPendingProfile();
    await setCustomerSessionCookie(customer.id);
    return json(customer, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return error("這個手機號碼或 LINE 帳號已經註冊過了", 409);
    throw err;
  }
}
