import { db, dailyNumber } from "@/server/db";
import { RegisterCustomerAccountBody } from "@/lib/api-zod";
import { hashPassword } from "@/server/password";
import { setCustomerSessionCookie } from "@/server/session";
import { isUniqueViolation } from "@/server/staff";
import { error, json, readJson } from "@/server/http";

// POST /api/auth/register
export async function POST(req: Request) {
  const parsed = RegisterCustomerAccountBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { phone, password, name, email } = parsed.data;

  if (await db.customerAccounts.findOne({ phone })) return error("此手機號碼已註冊過帳號", 409);

  let customer = await db.customers.findOne({ phone });
  if (!customer) {
    customer = await db.customers.insert({
      customer_number: await dailyNumber("C"),
      name,
      phone,
      email,
      source: "官網",
      category: "個人寫真",
      member_tier: "一般",
      tags: [],
      line_bound: false,
    });
  }

  try {
    await db.customerAccounts.insert({ customer_id: customer.id, phone, password_hash: hashPassword(password) });
  } catch (err) {
    if (isUniqueViolation(err)) return error("此手機號碼已註冊過帳號", 409);
    throw err;
  }

  await setCustomerSessionCookie(customer.id);
  return json(customer, 201);
}
