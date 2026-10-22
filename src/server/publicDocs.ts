import "server-only";
import { rawCollection, type Quote, type Contract } from "@/server/db";

async function studioName(): Promise<string> {
  const col = await rawCollection("company_settings");
  const row = await col.findOne({ id: 1 });
  return row?.name || "青春止秒攝影工作室";
}

// What the customer sees on the public sign pages — no internal ids, notes about
// other customers, or signature images.
export async function publicQuote(q: Quote) {
  return {
    kind: "quote" as const,
    number: q.quote_number,
    title: q.title,
    client_name: q.contact_name,
    tax_id: null,
    date: q.created_at.toISOString().slice(0, 10),
    valid_until: q.valid_until,
    items: q.items,
    discount: q.discount,
    tax_mode: q.tax_mode,
    tax_rate: q.tax_rate,
    tax_amount: q.tax_amount,
    total: q.total,
    terms: q.terms,
    nda: null,
    notes: q.notes,
    signed: !!q.signed_at,
    signer_name: q.signer_name,
    signed_at: q.signed_at,
    studio_name: await studioName(),
  };
}

export async function publicContract(c: Contract) {
  return {
    kind: "contract" as const,
    number: c.contract_number,
    title: c.title,
    client_name: c.contact_name,
    tax_id: c.tax_id,
    date: c.created_at.toISOString().slice(0, 10),
    valid_until: c.end_date,
    items: c.items,
    discount: c.discount,
    tax_mode: c.tax_mode,
    tax_rate: c.tax_rate,
    tax_amount: c.tax_amount,
    total: c.total,
    terms: c.terms,
    nda: c.nda,
    notes: c.notes,
    signed: !!c.customer_signed_at,
    signer_name: c.customer_signer_name,
    signed_at: c.customer_signed_at,
    studio_name: await studioName(),
  };
}
