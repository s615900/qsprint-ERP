import "server-only";
import { db } from "@/server/db";
import { isValidTaxId } from "@/lib/tax";
import { DATE_RE } from "@/server/http";

type Filter = Record<string, unknown>;

export async function selectTransactions(filter: Filter = {}) {
  const rows = await db.transactions.find(filter, { sort: { date: -1, id: -1 } });
  const orderIds = [...new Set(rows.map((t) => t.order_id).filter((x): x is number => x !== null))];
  const orders = orderIds.length ? await db.orders.find({ id: { $in: orderIds } }) : [];
  const orderNo = new Map(orders.map((o) => [o.id, o.order_number]));
  return rows.map((tx) => ({ ...tx, order_number: tx.order_id !== null ? (orderNo.get(tx.order_id) ?? null) : null }));
}

const VOUCHER_NUMBER_RE = /^[A-Z]{2}\d{8}$/;

interface VoucherInput {
  type: string;
  amount: number;
  date: string;
  voucher_type?: string | null;
  voucher_number?: string | null;
  voucher_date?: string | null;
  counterparty_name?: string | null;
  counterparty_tax_id?: string | null;
  tax_amount?: number;
  deduct_code?: number | null;
}

// Income rows and receipts carry no deductible tax. Everything else is validated
// so the 401 return never picks up a malformed voucher.
export function normalizeVoucher(
  input: VoucherInput,
): { error: string } | { fields: Pick<VoucherInput, "voucher_type" | "voucher_number" | "voucher_date" | "counterparty_name" | "counterparty_tax_id" | "deduct_code"> & { tax_amount: number } } {
  const none = {
    voucher_type: null, voucher_number: null, voucher_date: null,
    counterparty_name: null, counterparty_tax_id: null, deduct_code: null, tax_amount: 0,
  };
  if (input.type !== "支出" || !input.voucher_type) return { fields: none };

  const voucher_date = input.voucher_date || input.date;
  if (!DATE_RE.test(voucher_date)) return { error: "憑證日期格式不正確" };
  const counterparty_tax_id = input.counterparty_tax_id?.trim() || null;
  if (counterparty_tax_id && !isValidTaxId(counterparty_tax_id)) return { error: "賣方統一編號格式不正確" };
  const common = {
    voucher_type: input.voucher_type,
    voucher_date,
    counterparty_name: input.counterparty_name?.trim() || null,
    counterparty_tax_id,
  };

  if (input.voucher_type === "收據/無憑證") {
    return { fields: { ...common, voucher_number: input.voucher_number?.trim() || null, deduct_code: null, tax_amount: 0 } };
  }

  const voucher_number = input.voucher_number?.trim().replace(/-/g, "").toUpperCase() || null;
  if (input.voucher_type !== "海關代徵") {
    if (!voucher_number || !VOUCHER_NUMBER_RE.test(voucher_number)) return { error: "發票號碼格式應為 2 碼英文 + 8 碼數字" };
    if (!counterparty_tax_id) return { error: "進項發票必須填寫賣方統一編號" };
  }
  const tax_amount = input.tax_amount ?? 0;
  if (tax_amount > input.amount) return { error: "稅額不能大於含稅金額" };
  return { fields: { ...common, voucher_number, deduct_code: input.deduct_code ?? 1, tax_amount } };
}
