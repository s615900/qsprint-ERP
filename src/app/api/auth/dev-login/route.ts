import { db, dailyNumber } from "@/server/db";
import { ensureAccount } from "@/server/memberAccount";
import { setCustomerSessionCookie } from "@/server/session";
import { error, json } from "@/server/http";

const TEST_PHONE = "0900-000-000";

// POST /api/auth/dev-login — only exists under `next dev`: signs in as a throwaway test member, no LINE needed.
export async function POST() {
  if (process.env.NODE_ENV !== "development") return error("Not found", 404);
  const customer =
    (await db.customers.findOne({ phone: TEST_PHONE })) ??
    (await db.customers.insert({
      customer_number: await dailyNumber("C"),
      name: "本機測試會員",
      phone: TEST_PHONE,
      email: null,
      source: "開發測試",
      category: "個人寫真",
      member_tier: "一般",
      tags: ["test-data"],
      line_bound: false,
    }));
  await ensureAccount(customer);
  await setCustomerSessionCookie(customer.id);
  return json(customer);
}
