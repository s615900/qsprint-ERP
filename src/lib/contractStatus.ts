// Contract status is derived from who has signed; only 已結案 and 作廢 are set by hand.

export const CONTRACT_STATUSES = ["草稿", "已發送", "已簽約", "已結案", "作廢"] as const;

export interface ContractSignState {
  status: string;
  customer_signed_at?: string | Date | null;
  staff_signed_at?: string | Date | null;
}

export function isTerminal(status: string): boolean {
  return status === "已結案" || status === "作廢";
}

// Stored status implied by the signatures (terminal statuses stay put).
// `sent` = a customer sign link has been generated (草稿 → 已發送).
export function derivedStoredStatus(c: ContractSignState, opts: { sent?: boolean } = {}): string {
  if (isTerminal(c.status)) return c.status;
  if (c.customer_signed_at && c.staff_signed_at) return "已簽約";
  if (c.customer_signed_at || c.staff_signed_at || opts.sent || c.status === "已發送") return "已發送";
  return "草稿";
}

export function displayContractStatus(c: ContractSignState): { label: string; color: string } {
  if (c.status === "作廢") return { label: "作廢", color: "bg-rose-100 text-rose-700 border-rose-200" };
  if (c.status === "已結案") return { label: "已結案", color: "bg-slate-100 text-slate-600 border-slate-200" };
  if (c.customer_signed_at && c.staff_signed_at) return { label: "已簽約", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (c.customer_signed_at) return { label: "待工作室簽署", color: "bg-amber-100 text-amber-700 border-amber-200" };
  if (c.staff_signed_at || c.status === "已發送") return { label: "待客戶簽署", color: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "草稿", color: "bg-gray-100 text-gray-600 border-gray-200" };
}

// Once the customer has signed, the agreed content is frozen.
export function isContentLocked(c: { customer_signed_at?: string | Date | null }): boolean {
  return !!c.customer_signed_at;
}

export const CONTENT_LOCKED_MESSAGE = "客戶已簽署，合約內容已鎖定；如需修改請使用「作廢並建立新版本」";
