import { db, dailyNumber } from "@/server/db";
import { CreateContractFromQuoteParams } from "@/lib/api-zod";
import { selectContract } from "@/server/contracts";
import { textToHtml } from "@/server/html";
import { error, json } from "@/server/http";

// POST /api/quotes/:id/contract — draft contract copied from a quote
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = CreateContractFromQuoteParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const quote = await db.quotes.get(params.data.id);
  if (!quote) return error("Quote not found", 404);
  const inserted = await db.contracts.insert({
    contract_number: await dailyNumber("K"),
    customer_id: quote.customer_id,
    quote_id: quote.id,
    order_id: quote.order_id,
    contact_name: quote.contact_name,
    contact_phone: quote.contact_phone,
    contact_email: quote.contact_email,
    title: quote.title,
    items: quote.items,
    discount: quote.discount,
    tax_mode: quote.tax_mode,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    total: quote.total,
    terms: textToHtml(quote.terms),
    notes: quote.notes,
  });
  return json(await selectContract(inserted.id), 201);
}
