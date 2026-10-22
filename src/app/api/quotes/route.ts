import type { NextRequest } from "next/server";
import { db, dailyNumber, computeAmounts } from "@/server/db";
import { CreateQuoteBody, ListQuotesQueryParams } from "@/lib/api-zod";
import { DATE_RE, error, json, readJson } from "@/server/http";
import { escapeRegex } from "@/server/search";

// GET /api/quotes
export async function GET(req: NextRequest) {
  const parsed = ListQuotesQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { status, search, customer_id } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ contact_name: rx }, { title: rx }, { quote_number: rx }];
  }

  const rows = await db.quotes.find(filter, { sort: { created_at: -1 } });
  // Signature images are only returned on the detail endpoint.
  return json(rows.map((r) => ({ ...r, signature_image: null })));
}

// POST /api/quotes
export async function POST(req: Request) {
  const parsed = CreateQuoteBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { items, discount = 0, tax_mode = "含稅", tax_rate = 5, valid_until, ...rest } = parsed.data;
  if (valid_until && !DATE_RE.test(valid_until)) return error("valid_until must be YYYY-MM-DD", 400);

  const row = await db.quotes.insert({
    ...rest,
    quote_number: await dailyNumber("Q"),
    items,
    discount,
    tax_mode,
    tax_rate,
    ...computeAmounts(items, discount, tax_mode, tax_rate),
    valid_until: valid_until || null,
  });
  return json({ ...row, signature_image: null }, 201);
}
