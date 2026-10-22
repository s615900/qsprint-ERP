import { db } from "@/server/db";
import { VoidInvoiceParams, VoidInvoiceBody } from "@/lib/api-zod";
import { PERIOD_FILED_MESSAGE, isPeriodFiled, selectInvoices } from "@/server/invoicing";
import { error, json, readJson } from "@/server/http";

// POST /api/invoices/:id/void
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = VoidInvoiceParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = VoidInvoiceBody.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫作廢原因", 400);

  const invoice = await db.invoices.get(params.data.id);
  if (!invoice) return error("Invoice not found", 404);
  if (invoice.status === "已作廢") return error("這張發票已經作廢", 409);
  if (await isPeriodFiled(invoice.invoice_date)) return error(PERIOD_FILED_MESSAGE, 409);
  if (await db.invoiceAllowances.findOne({ invoice_id: invoice.id, status: "有效" })) {
    return error("這張發票已開立折讓單，請先作廢折讓單再作廢發票", 409);
  }

  // Conditional update so a double-click can't void twice.
  const voided = await db.invoices.update(
    { id: invoice.id, status: "已開立" },
    { status: "已作廢", void_reason: parsed.data.reason.trim(), voided_at: new Date() },
  );
  if (!voided) return error("這張發票已經作廢", 409);
  const [row] = await selectInvoices({ id: params.data.id });
  return json(row);
}
