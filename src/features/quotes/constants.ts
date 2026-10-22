export const QUOTE_STATUS_COLOR: Record<string, string> = {
  草稿: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200",
  已送出: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
  已接受: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
  已拒絕: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200",
};

// A sent quote past its valid_until date is flagged in the UI, not stored.
export function isExpired(quote: { status: string; valid_until?: string | null }) {
  if (quote.status !== "已送出" || !quote.valid_until) return false;
  return quote.valid_until < new Date().toISOString().slice(0, 10);
}
