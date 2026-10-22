import type { NextRequest } from "next/server";
import { db, dailyNumber, computeAmounts } from "@/server/db";
import { CreateContractBody, ListContractsQueryParams } from "@/lib/api-zod";
import { selectContract, selectContracts } from "@/server/contracts";
import { sanitizeHtml } from "@/server/html";
import { DATE_RE, error, json, readJson } from "@/server/http";
import { escapeRegex } from "@/server/search";

// GET /api/contracts
export async function GET(req: NextRequest) {
  const parsed = ListContractsQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { status, search, customer_id } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ contact_name: rx }, { title: rx }, { contract_number: rx }];
  }
  return json(await selectContracts(filter));
}

// POST /api/contracts
export async function POST(req: Request) {
  const parsed = CreateContractBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { items, discount = 0, tax_mode = "含稅", tax_rate = 5, start_date, end_date, terms, nda, ...rest } = parsed.data;
  for (const d of [start_date, end_date]) {
    if (d && !DATE_RE.test(d)) return error("dates must be YYYY-MM-DD", 400);
  }

  const inserted = await db.contracts.insert({
    ...rest,
    contract_number: await dailyNumber("K"),
    terms: sanitizeHtml(terms),
    nda: sanitizeHtml(nda),
    items,
    discount,
    tax_mode,
    tax_rate,
    ...computeAmounts(items, discount, tax_mode, tax_rate),
    start_date: start_date || null,
    end_date: end_date || null,
  });
  return json(await selectContract(inserted.id), 201);
}
