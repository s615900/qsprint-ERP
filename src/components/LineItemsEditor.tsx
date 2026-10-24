"use client";

import { Plus, Trash2, Package as PackageIcon } from "lucide-react";
import { useListPackages, type LineItem } from "@/lib/api-client";
import { formatTWD, subtotalOf, amountsOf, TAX_MODES, type TaxModeValue } from "@/lib/money";

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const emptyItem = (): LineItem => ({ name: "", description: "", quantity: 1, unit_price: 0 });

// Editable item rows + discount + live totals, shared by quote and order forms.
export function LineItemsEditor({
  items,
  onItemsChange,
  discount,
  onDiscountChange,
  tax,
}: {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  // When given, a tax-mode selector and the tax breakdown are shown.
  tax?: { mode: TaxModeValue; rate: number; onModeChange: (m: TaxModeValue) => void; onRateChange: (r: number) => void };
}) {
  const { data: packages } = useListPackages();
  const subtotal = subtotalOf(items);
  const amounts = amountsOf(items, discount, tax?.mode ?? "含稅", tax?.rate ?? 0);
  const total = tax ? amounts.total : Math.max(0, subtotal - discount);

  const update = (index: number, patch: Partial<LineItem>) =>
    onItemsChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const addPackage = (id: string) => {
    const pkg = packages?.find((p) => String(p.id) === id);
    if (!pkg) return;
    const row = { name: pkg.name, description: pkg.features?.join("、") ?? pkg.description, quantity: 1, unit_price: pkg.price };
    // Replace a blank starter row instead of appending after it.
    const blank = items.length === 1 && !items[0].name && !items[0].unit_price;
    onItemsChange(blank ? [row] : [...items, row]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <PackageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value=""
            onChange={(e) => addPackage(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">從拍攝套組加入...</option>
            {packages?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{formatTWD(p.price)}）
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onItemsChange([...items, emptyItem()])}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
        >
          <Plus className="w-4 h-4" /> 新增自訂項目
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={item.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="項目名稱 *"
                className={`${inputCls} font-medium`}
                required
              />
              <button
                type="button"
                aria-label="移除項目"
                disabled={items.length === 1}
                onClick={() => onItemsChange(items.filter((_, j) => j !== i))}
                className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              value={item.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="內容說明（選填）"
              className={`${inputCls} text-muted-foreground`}
            />
            <div className="grid grid-cols-3 gap-2 items-end">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">數量</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className={inputCls}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">單價</span>
                <input
                  type="number"
                  min={0}
                  value={item.unit_price}
                  onChange={(e) => update(i, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                  className={inputCls}
                />
              </label>
              <div className="text-right pb-2 text-sm font-medium tabular-nums">
                {formatTWD(item.quantity * item.unit_price)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ml-auto w-full sm:w-72 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>小計</span>
          <span className="tabular-nums">{formatTWD(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center gap-3 text-muted-foreground">
          <span>折扣</span>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => onDiscountChange(Math.max(0, Number(e.target.value) || 0))}
            className={`${inputCls} w-32 text-right`}
          />
        </div>
        {tax && (
          <>
            <div className="flex justify-between items-center gap-3 text-muted-foreground">
              <span>稅別</span>
              <div className="flex items-center gap-2">
                <select
                  value={tax.mode}
                  onChange={(e) => tax.onModeChange(e.target.value as TaxModeValue)}
                  className={`${inputCls} w-24`}
                >
                  {TAX_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
                {tax.mode !== "免稅" && (
                  <span className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(tax.rate)}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => tax.onRateChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className={`${inputCls} !w-20 shrink-0 text-right tabular-nums text-foreground`}
                    />
                    %
                  </span>
                )}
              </div>
            </div>
            {tax.mode !== "免稅" && (
              <div className="flex justify-between text-muted-foreground">
                <span>{tax.mode === "含稅" ? "其中營業稅" : "營業稅"}</span>
                <span className="tabular-nums">{formatTWD(amounts.tax)}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground/80 text-right">
              {tax.mode === "含稅" ? "上方單價已含稅" : tax.mode === "未稅" ? "稅額另外加在總計" : "本單不課營業稅"}
            </p>
          </>
        )}
        <div className="flex justify-between pt-2 border-t border-border text-base font-semibold">
          <span>總計</span>
          <span className="tabular-nums text-primary">{formatTWD(total)}</span>
        </div>
      </div>
    </div>
  );
}

// Read-only table for detail pages and print.
export function LineItemsTable({
  items,
  discount,
  total,
  taxMode,
  taxRate,
  taxAmount,
}: {
  items: LineItem[];
  discount: number;
  total: number;
  taxMode?: string;
  taxRate?: number;
  taxAmount?: number;
}) {
  return (
    <div className="space-y-4">
      {/* Phone: one stacked card per item so long names don't get squeezed into a narrow column */}
      <ul className="sm:hidden divide-y divide-border/60 border-y border-border/60">
        {items.map((item, i) => (
          <li key={i} className="py-3 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-sm break-words min-w-0">{item.name}</span>
              <span className="font-semibold text-sm tabular-nums shrink-0">{(item.quantity * item.unit_price).toLocaleString("zh-TW")}</span>
            </div>
            {item.description && <div className="text-xs text-muted-foreground break-words">{item.description}</div>}
            <div className="text-xs text-muted-foreground tabular-nums">
              {item.unit_price.toLocaleString("zh-TW")} × {item.quantity}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium py-2 pr-4">項目</th>
              <th className="text-right font-medium py-2 px-2 w-16">數量</th>
              <th className="text-right font-medium py-2 px-2 w-28">單價</th>
              <th className="text-right font-medium py-2 pl-2 w-32">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {items.map((item, i) => (
              <tr key={i} className="align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium">{item.name}</div>
                  {item.description && <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>}
                </td>
                <td className="py-3 px-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3 px-2 text-right tabular-nums">{item.unit_price.toLocaleString("zh-TW")}</td>
                <td className="py-3 pl-2 text-right tabular-nums">{(item.quantity * item.unit_price).toLocaleString("zh-TW")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto w-full sm:w-64 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>小計</span>
          <span className="tabular-nums">{formatTWD(subtotalOf(items))}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>折扣</span>
            <span className="tabular-nums">- {formatTWD(discount)}</span>
          </div>
        )}
        {taxMode && taxMode !== "免稅" && (
          <div className="flex justify-between text-muted-foreground">
            <span>{taxMode === "含稅" ? `其中營業稅 ${taxRate}%` : `營業稅 ${taxRate}%`}</span>
            <span className="tabular-nums">{formatTWD(taxAmount ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-border text-base font-semibold">
          <span>總計{taxMode === "含稅" ? "（含稅）" : taxMode === "未稅" ? "（含稅）" : ""}</span>
          <span className="tabular-nums">{formatTWD(total)}</span>
        </div>
      </div>
    </div>
  );
}
