// Taiwan business-tax helpers shared by client and server.
// 營業稅 is filed every two months: 1-2月, 3-4月 … 11-12月. A period is
// identified by the YYYY-MM of its first month (always an odd month).

export const VAT_RATE = 5;

export function periodOf(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const first = m % 2 === 0 ? m - 1 : m;
  return `${y}-${String(first).padStart(2, "0")}`;
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${y - 1911} 年 ${m}-${m + 1} 月`;
}

export function periodRange(period: string): { start: string; end: string } {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m + 1, 0).getDate(); // day 0 of the next month = last day of the second month
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 1 ? `${y - 1}-11` : `${y}-${String(m - 2).padStart(2, "0")}`;
}

export function periodsOfYear(year: number): string[] {
  return [1, 3, 5, 7, 9, 11].map((m) => `${year}-${String(m).padStart(2, "0")}`);
}

// The return is due on the 15th of the month after the period ends
// (postponed to the next working day when it falls on a holiday).
export function filingDeadline(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const dueMonth = m + 2;
  return dueMonth > 12 ? `${y + 1}-01-15` : `${y}-${String(dueMonth).padStart(2, "0")}-15`;
}

// Split a tax-inclusive total into sales amount and VAT.
export function splitTotal(total: number, taxType: string, rate = VAT_RATE) {
  if (taxType !== "應稅") return { sales_amount: total, tax_amount: 0, total };
  const sales_amount = Math.round((total * 100) / (100 + rate));
  return { sales_amount, tax_amount: total - sales_amount, total };
}

// 統一編號 checksum (the post-2023 rule: divisor 5, and the 7th-digit-is-7 exception).
export function isValidTaxId(id: string): boolean {
  if (!/^\d{8}$/.test(id)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  const sum = [...id].reduce((acc, ch, i) => {
    const p = Number(ch) * weights[i];
    return acc + Math.floor(p / 10) + (p % 10);
  }, 0);
  return sum % 5 === 0 || (id[6] === "7" && (sum + 1) % 5 === 0);
}

export const INVOICE_KINDS = ["三聯式", "二聯式", "電子發票", "免用發票"] as const;
export const TRACK_KINDS = ["三聯式", "二聯式", "電子發票"] as const;
export const TAX_TYPES = ["應稅", "零稅率", "免稅"] as const;

export const VOUCHER_TYPES = ["三聯式進項發票", "二聯式進項發票", "電子發票", "海關代徵", "收據/無憑證"] as const;
export const DEDUCT_CODES: Record<number, string> = {
  1: "可扣抵 進貨及費用",
  2: "可扣抵 固定資產",
  3: "不得扣抵 進貨及費用",
  4: "不得扣抵 固定資產",
};
// Vouchers that can never carry deductible input tax.
export const NON_DEDUCTIBLE_VOUCHERS: readonly string[] = ["收據/無憑證"];

// Photographer-specific reminders shown next to the expense category.
export const EXPENSE_TAX_HINTS: Record<string, string> = {
  器材: "相機、鏡頭、燈光等：單價較高、可用 2 年以上的屬固定資產，請選「可扣抵 固定資產」。",
  場地租金: "房東若是個人通常只開收據、沒有稅額，不能扣抵；向公司承租才有統一發票。",
  人事薪資: "薪資不是進項憑證，不用填憑證資訊。",
  外包修圖: "付給個人屬於執行業務報酬，需另行處理扣繳憑單，不是進項發票；對方是公司且開統一發票才可扣抵。",
  服裝道具: "取得統一發票才可扣抵；市集或網拍的收據不行。",
  印刷相冊: "印刷廠開立三聯式發票時請填統編，可扣抵。",
  行銷廣告: "Meta／Google 等境外平台通常沒有統一發票，請與會計師確認處理方式。",
  交通: "計程車收據、車票沒有可扣抵稅額；自用乘人小客車的油料、維修不得扣抵。",
};
