// Shared line-item shape for quotes and orders (stored as jsonb).
export type LineItem = {
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
};

// Totals are always recomputed server-side so the stored total can't drift
// from its items.
export function computeTotal(items: LineItem[], discount: number): number {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  return Math.max(0, subtotal - discount);
}

export type TaxMode = "含稅" | "未稅" | "免稅";

// Total payable and the VAT inside it. 含稅: prices already include tax, so the
// total is unchanged and tax is extracted; 未稅: tax is added on top; 免稅: none.
export function computeAmounts(
  items: LineItem[],
  discount: number,
  taxMode: TaxMode,
  taxRate: number,
): { total: number; tax_amount: number } {
  const net = computeTotal(items, discount);
  if (taxMode === "免稅") return { total: net, tax_amount: 0 };
  if (taxMode === "未稅") {
    const tax = Math.round((net * taxRate) / 100);
    return { total: net + tax, tax_amount: tax };
  }
  return { total: net, tax_amount: net - Math.round((net * 100) / (100 + taxRate)) };
}
