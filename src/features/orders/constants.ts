export const ORDER_STATUS_COLOR: Record<string, string> = {
  已成立: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
  製作中: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
  已交付: "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200",
  已結案: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200",
  已取消: "bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100",
};

export function paymentState(order: { total: number; paid_amount: number }) {
  if (order.total > 0 && order.paid_amount >= order.total)
    return { label: "已付清", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (order.paid_amount > 0) return { label: "部分付款", cls: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "未付款", cls: "text-rose-600 bg-rose-50 border-rose-200" };
}
