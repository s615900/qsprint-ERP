import { GetInvoiceParams } from "@/lib/api-zod";
import { selectInvoices } from "@/server/invoicing";
import { error, json } from "@/server/http";

// GET /api/invoices/:id — there is deliberately no PUT/DELETE: a wrong invoice is voided, not edited.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = GetInvoiceParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const [row] = await selectInvoices({ id: params.data.id });
  if (!row) return error("Invoice not found", 404);
  return json(row);
}
