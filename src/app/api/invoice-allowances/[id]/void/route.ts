import { db } from "@/server/db";
import { VoidInvoiceAllowanceParams } from "@/lib/api-zod";
import { PERIOD_FILED_MESSAGE, isPeriodFiled, selectAllowances } from "@/server/invoicing";
import { error, json } from "@/server/http";

// POST /api/invoice-allowances/:id/void
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = VoidInvoiceAllowanceParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const row = await db.invoiceAllowances.get(params.data.id);
  if (!row) return error("Allowance not found", 404);
  if (row.status === "作廢") return error("這張折讓單已經作廢", 409);
  if (await isPeriodFiled(row.allowance_date)) return error(PERIOD_FILED_MESSAGE, 409);

  await db.invoiceAllowances.update(row.id, { status: "作廢" });
  const [full] = await selectAllowances({ id: row.id });
  return json(full);
}
