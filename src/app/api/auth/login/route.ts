import { db } from "@/server/db";
import { LoginCustomerAccountBody } from "@/lib/api-zod";
import { verifyPassword } from "@/server/password";
import { setCustomerSessionCookie } from "@/server/session";
import { error, json, readJson } from "@/server/http";

// POST /api/auth/login
export async function POST(req: Request) {
  const parsed = LoginCustomerAccountBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { phone, password } = parsed.data;

  const account = await db.customerAccounts.findOne({ phone });
  if (!account || !account.password_hash || !verifyPassword(password, account.password_hash)) {
    return error("手機號碼或密碼錯誤", 401);
  }

  const customer = await db.customers.get(account.customer_id);
  if (!customer) return error("手機號碼或密碼錯誤", 401);

  await setCustomerSessionCookie(customer.id);
  return json(customer);
}
