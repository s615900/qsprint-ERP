import { db, dailyNumber } from "@/server/db";
import { ReviseContractParams } from "@/lib/api-zod";
import { selectContract } from "@/server/contracts";
import { error, json } from "@/server/http";

// POST /api/contracts/:id/revise — void this contract, start a clean draft copy
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ReviseContractParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const old = await db.contracts.get(params.data.id);
  if (!old) return error("Contract not found", 404);

  const copy = await db.contracts.insert({
    contract_number: await dailyNumber("K"),
    customer_id: old.customer_id,
    quote_id: old.quote_id,
    order_id: old.order_id,
    previous_contract_id: old.id,
    contact_name: old.contact_name,
    contact_phone: old.contact_phone,
    contact_email: old.contact_email,
    tax_id: old.tax_id,
    address: old.address,
    title: old.title,
    items: old.items,
    discount: old.discount,
    tax_mode: old.tax_mode,
    tax_rate: old.tax_rate,
    tax_amount: old.tax_amount,
    total: old.total,
    start_date: old.start_date,
    end_date: old.end_date,
    terms: old.terms,
    nda: old.nda,
    notes: old.notes,
  });
  await db.contracts.update(old.id, { status: "作廢" });
  return json(await selectContract(copy.id), 201);
}
