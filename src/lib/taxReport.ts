// Pure 401 (營業稅申報書) arithmetic. Takes the already-loaded rows of one period
// and returns the figures; no I/O so it can be reasoned about on its own.
import { INVOICE_KINDS } from "./tax";

export interface ReportInvoice {
  kind: string;
  tax_type: string;
  status: string;
  sales_amount: number;
  tax_amount: number;
}
export interface ReportAllowance {
  invoice_tax_type: string;
  status: string;
  sales_amount: number;
  tax_amount: number;
}
export interface ReportPurchase {
  voucher_type: string | null;
  amount: number;
  tax_amount: number;
  deduct_code: number | null;
}

export interface AmountRow {
  key: string;
  label: string;
  count: number;
  amount: number;
  tax: number;
}

const INVOICE_FAMILY = ["三聯式進項發票", "電子發票"];

const OUTPUT_LABELS: Record<string, string> = {
  三聯式: "三聯式發票、電子計算機統一發票",
  電子發票: "收銀機發票（三聯式）及電子發票",
  二聯式: "二聯式發票、收銀機發票（二聯式）",
  免用發票: "免用發票",
};

const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((s, r) => s + pick(r), 0);

export function computePeriod(data: { invoices: ReportInvoice[]; allowances: ReportAllowance[]; purchases: ReportPurchase[] }) {
  const live = data.invoices.filter((i) => i.status === "已開立");
  const allowances = data.allowances.filter((a) => a.status === "有效");

  const output_rows: AmountRow[] = INVOICE_KINDS.map((kind) => {
    const rows = live.filter((i) => i.tax_type === "應稅" && i.kind === kind);
    return { key: kind, label: OUTPUT_LABELS[kind], count: rows.length, amount: sum(rows, (r) => r.sales_amount), tax: sum(rows, (r) => r.tax_amount) };
  });

  const allowRows = (taxType: string) => allowances.filter((a) => a.invoice_tax_type === taxType);
  const taxableAllow = allowRows("應稅");
  const allowancesRow: AmountRow = {
    key: "allowances",
    label: "減：退回及折讓",
    count: taxableAllow.length,
    amount: sum(taxableAllow, (r) => r.sales_amount),
    tax: sum(taxableAllow, (r) => r.tax_amount),
  };

  const special = (taxType: string, key: string, label: string): AmountRow => {
    const rows = live.filter((i) => i.tax_type === taxType);
    const allow = allowRows(taxType);
    return { key, label, count: rows.length, amount: sum(rows, (r) => r.sales_amount) - sum(allow, (r) => r.sales_amount), tax: 0 };
  };
  const zero_rate = special("零稅率", "zero", "零稅率銷售額");
  const exempt = special("免稅", "exempt", "免稅銷售額");

  const taxable_sales = sum(output_rows, (r) => r.amount) - allowancesRow.amount;
  const taxable_tax = sum(output_rows, (r) => r.tax) - allowancesRow.tax;
  const sales_total = taxable_sales + zero_rate.amount + exempt.amount;

  const withVoucher = data.purchases.filter((p) => p.voucher_type && p.deduct_code);
  const deductible = withVoucher.filter((p) => p.deduct_code === 1 || p.deduct_code === 2);
  const inputRow = (key: string, label: string, family: "invoice" | "other", code: 1 | 2): AmountRow => {
    const rows = deductible.filter(
      (p) => p.deduct_code === code && INVOICE_FAMILY.includes(p.voucher_type!) === (family === "invoice"),
    );
    return { key, label, count: rows.length, amount: sum(rows, (r) => r.amount - r.tax_amount), tax: sum(rows, (r) => r.tax_amount) };
  };
  const input_rows: AmountRow[] = [
    inputRow("invoice-1", "統一發票扣抵聯（三聯式、電子發票）— 進貨及費用", "invoice", 1),
    inputRow("invoice-2", "統一發票扣抵聯（三聯式、電子發票）— 固定資產", "invoice", 2),
    inputRow("other-1", "二聯式及載有稅額之其他憑證（含海關代徵）— 進貨及費用", "other", 1),
    inputRow("other-2", "二聯式及載有稅額之其他憑證（含海關代徵）— 固定資產", "other", 2),
  ];
  const notDeductible = withVoucher.filter((p) => p.deduct_code === 3 || p.deduct_code === 4);
  const non_deductible: AmountRow = {
    key: "non-deductible",
    label: "不得扣抵之進項",
    count: notDeductible.length,
    amount: sum(notDeductible, (r) => r.amount - r.tax_amount),
    tax: sum(notDeductible, (r) => r.tax_amount),
  };

  return {
    output_rows,
    allowances: allowancesRow,
    taxable_sales,
    taxable_tax,
    zero_rate,
    exempt,
    sales_total,
    input_rows,
    input_deductible_amount: sum(input_rows, (r) => r.amount),
    input_deductible_tax: sum(input_rows, (r) => r.tax),
    non_deductible,
    voided_count: data.invoices.length - live.length,
  };
}

// Output tax − deductible input tax − credit carried in. Negative = credit carried out.
export function settle(outputTax: number, inputTax: number, carryIn: number) {
  const net_tax = outputTax - inputTax - carryIn;
  return { net_tax, payable: Math.max(0, net_tax), carry_out: Math.max(0, -net_tax) };
}
