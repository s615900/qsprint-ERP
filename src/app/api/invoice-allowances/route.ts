import type { NextRequest } from "next/server";
import { db, dailyNumber } from "@/server/db";
import { CreateInvoiceAllowanceBody, ListInvoiceAllowancesQueryParams } from "@/lib/api-zod";
import { PERIOD_FILED_MESSAGE, isPeriodFiled, selectAllowances } from "@/server/invoicing";
import { periodOf } from "@/lib/tax";
import { DATE_RE, error, json, readJson } from "@/server/http";

// GET /api/invoice-allowances
export async function GET(req: NextRequest) {
  const parsed = ListInvoiceAllowancesQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const filter: Record<string, unknown> = {};
  if (parsed.data.period) filter.period = parsed.data.period;
  if (parsed.data.invoice_id) filter.invoice_id = parsed.data.invoice_id;
  return json(await selectAllowances(filter));
}

// POST /api/invoice-allowances
export async function POST(req: Request) {
  const parsed = CreateInvoiceAllowanceBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { invoice_id, allowance_date, total, reason } = parsed.data;
  if (!DATE_RE.test(allowance_date)) return error("allowance_date must be YYYY-MM-DD", 400);
  if (await isPeriodFiled(allowance_date)) return error(PERIOD_FILED_MESSAGE, 409);

  const invoice = await db.invoices.get(invoice_id);
  if (!invoice) return error("找不到發票", 404);
  if (invoice.status !== "已開立") return error("已作廢的發票不能開折讓", 409);
  if (allowance_date < invoice.invoice_date) return error("折讓日期不能早於發票日期", 400);

  const active = await db.invoiceAllowances.find({ invoice_id: invoice.id, status: "有效" });
  const usedTotal = active.reduce((s, a) => s + a.total, 0);
  const usedTax = active.reduce((s, a) => s + a.tax_amount, 0);
  const remainingTotal = invoice.total - usedTotal;
  if (total > remainingTotal) {
    return error(`折讓金額超過發票剩餘可折讓金額（NT$ ${remainingTotal.toLocaleString("zh-TW")}）`, 409);
  }

  // Spread tax in proportion to the invoice; the last allowance takes whatever tax is left.
  const remainingTax = invoice.tax_amount - usedTax;
  const tax_amount =
    total === remainingTotal ? remainingTax : Math.min(remainingTax, Math.round((total * invoice.tax_amount) / invoice.total));

  const row = await db.invoiceAllowances.insert({
    allowance_number: await dailyNumber("D"),
    invoice_id: invoice.id,
    allowance_date,
    period: periodOf(allowance_date),
    sales_amount: total - tax_amount,
    tax_amount,
    total,
    reason: reason || null,
  });
  const [full] = await selectAllowances({ id: row.id });
  return json(full, 201);
}
