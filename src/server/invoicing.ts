import "server-only";
import { db, rawCollection, type CompanySettings, type InvoiceTrack, type TaxFiling } from "@/server/db";
import { filingDeadline, isValidTaxId, periodOf, periodRange, previousPeriod } from "@/lib/tax";
import { computePeriod, settle } from "@/lib/taxReport";

type Filter = Record<string, unknown>;
const NO_ID = { projection: { _id: 0 } } as const;

export const DEFAULT_COMPANY = {
  name: "",
  tax_id: "",
  tax_reg_number: "",
  owner: "",
  address: "",
  phone: "",
  email: "",
  bank_account: "",
  tax_rate: 5,
};

export async function getCompany(): Promise<CompanySettings> {
  const col = await rawCollection("company_settings");
  const row = (await col.findOne({ id: 1 }, NO_ID)) as unknown as CompanySettings | null;
  return row ?? { id: 1, ...DEFAULT_COMPANY, updated_at: new Date() };
}

export async function getFiling(period: string): Promise<TaxFiling> {
  const col = await rawCollection("tax_filings");
  const row = (await col.findOne({ period }, NO_ID)) as unknown as TaxFiling | null;
  return row ?? { period, status: "未申報", filed_at: null, carry_in_override: null, note: null, updated_at: new Date() };
}

// A period that has been filed is frozen: no new invoices, voids, allowances or voucher edits.
export async function isPeriodFiled(date: string): Promise<boolean> {
  const col = await rawCollection("tax_filings");
  const row = await col.findOne({ period: periodOf(date) });
  return row?.status === "已申報";
}

export const PERIOD_FILED_MESSAGE = "這一期營業稅已申報，不能再新增或異動；如需更正請先到「營業稅申報」撤銷申報狀態。";

export function trackStats(t: InvoiceTrack) {
  return { ...t, used: t.next_number - t.range_start, remaining: Math.max(0, t.range_end - t.next_number + 1) };
}

export function formatInvoiceNumber(prefix: string, n: number): string {
  return `${prefix.toUpperCase()}${String(n).padStart(8, "0")}`;
}

// Invoices with the order number and the allowance total attached.
export async function selectInvoices(filter: Filter = {}) {
  const rows = await db.invoices.find(filter, { sort: { invoice_date: -1, id: -1 } });
  const ids = rows.map((i) => i.id);
  const orderIds = [...new Set(rows.map((i) => i.order_id).filter((x): x is number => x !== null))];
  const [orders, allowances] = await Promise.all([
    orderIds.length ? db.orders.find({ id: { $in: orderIds } }) : [],
    ids.length ? db.invoiceAllowances.find({ invoice_id: { $in: ids }, status: "有效" }) : [],
  ]);
  const orderNo = new Map(orders.map((o) => [o.id, o.order_number]));
  const allowed = new Map<number, number>();
  for (const a of allowances) allowed.set(a.invoice_id, (allowed.get(a.invoice_id) ?? 0) + a.total);
  return rows.map((invoice) => ({
    ...invoice,
    order_number: invoice.order_id !== null ? (orderNo.get(invoice.order_id) ?? null) : null,
    allowance_total: allowed.get(invoice.id) ?? 0,
  }));
}

export async function selectAllowances(filter: Filter = {}) {
  const rows = await db.invoiceAllowances.find(filter, { sort: { allowance_date: -1, id: -1 } });
  const invoices = rows.length ? await db.invoices.find({ id: { $in: [...new Set(rows.map((a) => a.invoice_id))] } }) : [];
  const invoiceNo = new Map(invoices.map((i) => [i.id, i.invoice_number]));
  return rows
    .filter((a) => invoiceNo.has(a.invoice_id))
    .map((allowance) => ({ ...allowance, invoice_number: invoiceNo.get(allowance.invoice_id)! }));
}

async function loadPeriod(period: string) {
  const { start, end } = periodRange(period);
  const voucherDay = (t: { voucher_date: string | null; date: string }) => t.voucher_date ?? t.date;
  const [invoices, allowances, purchaseRows, missing] = await Promise.all([
    selectInvoices({ period }),
    selectAllowances({ period }),
    db.transactions.find({
      type: "支出",
      voucher_type: { $ne: null },
      $or: [
        { voucher_date: { $ne: null, $gte: start, $lte: end } },
        { voucher_date: null, date: { $gte: start, $lte: end } },
      ],
    }),
    db.transactions.find(
      { type: "支出", voucher_type: null, category: { $ne: "人事薪資" }, date: { $gte: start, $lte: end } },
      { sort: { date: 1, id: 1 } },
    ),
  ]);
  const purchases = purchaseRows.sort((a, b) => voucherDay(a).localeCompare(voucherDay(b)) || a.id - b.id);
  return { invoices, allowances, purchases, missing };
}

// The invoice an allowance belongs to decides which sales bucket it reduces.
async function allowancesWithTaxType(period: string) {
  const list = await selectAllowances({ period });
  const invoiceRows = list.length ? await db.invoices.find({ id: { $in: [...new Set(list.map((a) => a.invoice_id))] } }) : [];
  const taxTypeOf = new Map(invoiceRows.map((i) => [i.id, i.tax_type]));
  return { list, forReport: list.map((a) => ({ ...a, invoice_tax_type: taxTypeOf.get(a.invoice_id) ?? "應稅" })) };
}

// Credit carried into `period`: the manual override if set, else last period's carry-out.
const MAX_CARRY_CHAIN = 12;
async function carryInFor(period: string, depth = 0): Promise<number> {
  const filing = await getFiling(period);
  if (filing.carry_in_override !== null) return filing.carry_in_override;
  if (depth >= MAX_CARRY_CHAIN) return 0;
  const prev = previousPeriod(period);
  const core = await periodCore(prev, depth + 1);
  return core.carry_out;
}

async function periodCore(period: string, depth = 0) {
  const data = await loadPeriod(period);
  const { forReport } = await allowancesWithTaxType(period);
  const figures = computePeriod({ invoices: data.invoices, allowances: forReport, purchases: data.purchases });
  const carry_in = await carryInFor(period, depth);
  const settled = settle(figures.taxable_tax, figures.input_deductible_tax, carry_in);
  return { ...figures, carry_in, ...settled, data };
}

export async function buildTaxReport(period: string) {
  const [core, company, filing, allowanceInfo] = await Promise.all([
    periodCore(period),
    getCompany(),
    getFiling(period),
    allowancesWithTaxType(period),
  ]);
  const { start, end } = periodRange(period);
  const { data } = core;

  const warnings: string[] = [];
  if (!company.tax_id) warnings.push("尚未填寫營業人統一編號，請到「設定 → 營業人資料」補上。");
  const badBuyers = data.invoices.filter((i) => i.status === "已開立" && i.kind === "三聯式" && !isValidTaxId(i.buyer_tax_id ?? ""));
  if (badBuyers.length) warnings.push(`有 ${badBuyers.length} 張三聯式發票的買受人統編格式不正確。`);
  if (data.missing.length) warnings.push(`本期有 ${data.missing.length} 筆支出尚未填寫憑證資訊，確認是否有可扣抵的進項發票。`);
  const noTax = data.purchases.filter((p) => p.deduct_code && p.deduct_code <= 2 && p.tax_amount === 0);
  if (noTax.length) warnings.push(`有 ${noTax.length} 筆標示「可扣抵」的進項憑證稅額為 0，請確認。`);

  const { data: _data, ...figures } = core;
  void _data;
  return {
    period,
    start,
    end,
    deadline: filingDeadline(period),
    filing: { ...filing, filed_at: filing.filed_at },
    company,
    ...figures,
    output_tax: core.taxable_tax,
    input_tax: core.input_deductible_tax,
    invoices: data.invoices,
    allowance_list: allowanceInfo.list,
    purchases: data.purchases,
    missing_vouchers: data.missing,
    warnings,
  };
}

export async function summarizePeriod(period: string) {
  const core = await periodCore(period);
  const filing = await getFiling(period);
  return {
    period,
    status: filing.status,
    sales_total: core.sales_total,
    output_tax: core.taxable_tax,
    input_tax: core.input_deductible_tax,
    payable: core.payable,
    carry_out: core.carry_out,
    invoice_count: core.data.invoices.length,
    deadline: filingDeadline(period),
  };
}
