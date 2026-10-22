import type { NextRequest } from "next/server";
import { db, dailyNumber } from "@/server/db";
import { ListCustomersQueryParams, CreateCustomerBody } from "@/lib/api-zod";
import { isValidTaxId } from "@/lib/tax";
import { error, json, readJson } from "@/server/http";

// GET /api/customers
export async function GET(req: NextRequest) {
  const parsed = ListCustomersQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { search, category, member_tier, tag } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (member_tier) filter.member_tier = member_tier;
  let result = await db.customers.find(filter, { sort: { created_at: -1 } });

  // In-memory filter for search and tag (fast enough for studio scale)
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.customer_number.toLowerCase().includes(s),
    );
  }
  if (tag) {
    result = result.filter((c) => c.tags.includes(tag));
  }
  return json(result);
}

// POST /api/customers
export async function POST(req: Request) {
  const parsed = CreateCustomerBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { tags, ...rest } = parsed.data;
  if (rest.tax_id && !isValidTaxId(rest.tax_id)) return error("統一編號格式不正確（8 碼數字，且需通過檢查碼）", 400);

  const row = await db.customers.insert({
    ...rest,
    customer_number: await dailyNumber("C"),
    tags: tags ?? [],
    line_bound: false,
  });
  return json(row, 201);
}
