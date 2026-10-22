"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { Transaction, TransactionInput, TransactionType } from "@/lib/api-client";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/ledger";
import { DEDUCT_CODES, EXPENSE_TAX_HINTS, NON_DEDUCTIBLE_VOUCHERS, VOUCHER_TYPES, VAT_RATE, isValidTaxId, periodLabel, periodOf } from "@/lib/tax";

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EntryForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: Transaction;
  isPending: boolean;
  onSubmit: (data: TransactionInput) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "支出");
  const categories = type === "收入" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [category, setCategory] = useState<string>(initial?.category ?? categories[0]);
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState(initial?.method ?? PAYMENT_METHODS[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  // 進項憑證: the purchase voucher that feeds the 401 return's input tax.
  const [voucherType, setVoucherType] = useState<string>(initial?.voucher_type ?? "");
  const [voucherNumber, setVoucherNumber] = useState(initial?.voucher_number ?? "");
  const [voucherDate, setVoucherDate] = useState(initial?.voucher_date ?? "");
  const [counterparty, setCounterparty] = useState(initial?.counterparty_name ?? "");
  const [counterpartyTaxId, setCounterpartyTaxId] = useState(initial?.counterparty_tax_id ?? "");
  const [taxAmount, setTaxAmount] = useState(initial?.tax_amount ?? 0);
  const [deductCode, setDeductCode] = useState<number>(initial?.deduct_code ?? 1);
  const [voucherError, setVoucherError] = useState("");

  const hasVoucher = type === "支出" && voucherType !== "";
  const noTaxVoucher = NON_DEDUCTIBLE_VOUCHERS.includes(voucherType);
  const suggestedTax = amount - Math.round((amount * 100) / (100 + VAT_RATE));

  const switchType = (t: TransactionType) => {
    setType(t);
    setCategory((t === "收入" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (amount <= 0) return;
        setVoucherError("");
        if (hasVoucher && !noTaxVoucher) {
          if (voucherType !== "海關代徵") {
            if (!/^[A-Za-z]{2}-?\d{8}$/.test(voucherNumber.trim())) return setVoucherError("發票號碼格式應為 2 碼英文 + 8 碼數字，例如 AB12345678");
            if (!isValidTaxId(counterpartyTaxId.trim())) return setVoucherError("進項發票需要正確的賣方統一編號");
          }
          if (taxAmount > amount) return setVoucherError("稅額不能大於含稅金額");
        }
        onSubmit({
          type,
          category,
          amount,
          date,
          method: method || null,
          order_id: initial?.order_id ?? null,
          description: description.trim() || null,
          ...(type === "支出" && {
            voucher_type: (voucherType || null) as TransactionInput["voucher_type"],
            voucher_number: hasVoucher ? voucherNumber.trim() || null : null,
            voucher_date: hasVoucher ? voucherDate || date : null,
            counterparty_name: hasVoucher ? counterparty.trim() || null : null,
            counterparty_tax_id: hasVoucher ? counterpartyTaxId.trim() || null : null,
            tax_amount: hasVoucher && !noTaxVoucher ? taxAmount : 0,
            deduct_code: (hasVoucher && !noTaxVoucher ? deductCode : null) as TransactionInput["deduct_code"],
          }),
        });
      }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md border border-input bg-background p-0.5">
          {(["支出", "收入"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={!!initial?.order_id}
              onClick={() => switchType(t)}
              className={`px-4 h-8 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed ${type === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} aria-label="取消" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">金額 *</span>
          <input type="number" min={1} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} className={inputCls} required autoFocus />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">日期 *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">類別</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {/* Keep a legacy category selectable when editing. */}
            {!(categories as readonly string[]).includes(category) && <option>{category}</option>}
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">付款方式</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
      </div>
      {type === "支出" && (
        <div className="rounded-lg border border-border bg-background p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="flex items-center gap-2 text-sm font-medium shrink-0">
              進項憑證
              <select
                value={voucherType}
                onChange={(e) => {
                  setVoucherType(e.target.value);
                  if (e.target.value && !taxAmount && !NON_DEDUCTIBLE_VOUCHERS.includes(e.target.value)) setTaxAmount(suggestedTax);
                }}
                className={`${inputCls} w-44`}
              >
                <option value="">沒有憑證 / 不申報</option>
                {VOUCHER_TYPES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">{EXPENSE_TAX_HINTS[category] ?? "取得統一發票時填寫，營業稅申報（401）才能扣抵進項稅額。"}</p>
          </div>
          {hasVoucher && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">憑證日期（歸屬 {periodLabel(periodOf(voucherDate || date))}）</span>
                <input type="date" value={voucherDate || date} onChange={(e) => setVoucherDate(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">{noTaxVoucher ? "收據號碼（選填）" : voucherType === "海關代徵" ? "報單號碼" : "發票號碼 *"}</span>
                <input value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value.toUpperCase())} placeholder="AB12345678" className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">賣方名稱</span>
                <input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">賣方統編{!noTaxVoucher && voucherType !== "海關代徵" && " *"}</span>
                <input value={counterpartyTaxId} onChange={(e) => setCounterpartyTaxId(e.target.value)} maxLength={8} inputMode="numeric" className={inputCls} />
              </label>
              {!noTaxVoucher && (
                <>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      其中營業稅額
                      <button type="button" className="ml-2 text-primary hover:underline" onClick={() => setTaxAmount(suggestedTax)}>依 5% 計算</button>
                    </span>
                    <input type="number" min={0} value={taxAmount} onChange={(e) => setTaxAmount(Number(e.target.value) || 0)} className={inputCls} />
                  </label>
                  <label className="space-y-1 col-span-2">
                    <span className="text-xs text-muted-foreground">扣抵方式</span>
                    <select value={deductCode} onChange={(e) => setDeductCode(Number(e.target.value))} className={inputCls}>
                      {Object.entries(DEDUCT_CODES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}
          {voucherError && <p className="text-sm text-destructive">{voucherError}</p>}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="說明（例：新購 85mm 鏡頭）" className={inputCls} />
        <button type="submit" disabled={isPending || amount <= 0} className="shrink-0 inline-flex items-center justify-center h-9 px-5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {isPending ? "儲存中..." : initial ? "儲存變更" : "新增"}
        </button>
      </div>
    </form>
  );
}
