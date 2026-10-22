import type { LineItem } from "@/lib/api-client";

export function formatTWD(amount: number): string {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}

export function subtotalOf(items: Pick<LineItem, "quantity" | "unit_price">[]): number {
  return items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0), 0);
}

export const TAX_MODES = ["含稅", "未稅", "免稅"] as const;
export type TaxModeValue = (typeof TAX_MODES)[number];

// Mirror of the server's computeAmounts so forms preview exactly what will be stored.
export function amountsOf(
  items: Pick<LineItem, "quantity" | "unit_price">[],
  discount: number,
  taxMode: TaxModeValue,
  taxRate: number,
): { net: number; tax: number; total: number } {
  const net = Math.max(0, subtotalOf(items) - discount);
  if (taxMode === "免稅") return { net, tax: 0, total: net };
  if (taxMode === "未稅") {
    const tax = Math.round((net * taxRate) / 100);
    return { net, tax, total: net + tax };
  }
  const tax = net - Math.round((net * 100) / (100 + taxRate));
  return { net, tax, total: net };
}
