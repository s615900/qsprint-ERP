"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateInvoice,
  useListOrders,
  useListInvoices,
  useGetCompanySettings,
  type InvoiceInput,
  type Order,
} from "@/lib/api-client";
import { CustomerPicker } from "@/components/CustomerPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { formatTWD } from "@/lib/money";
import { INVOICE_KINDS, TAX_TYPES, isValidTaxId, splitTotal, periodOf, periodLabel } from "@/lib/tax";
import { inputCls, btnOutline, btnPrimary } from "@/lib/ui";
import { KIND_HINT } from "../constants";

export interface InvoicePreset {
  order_id?: number | null;
  customer_id?: number | null;
  buyer_name?: string;
  buyer_tax_id?: string | null;
  total?: number;
}

export function IssueInvoiceDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: InvoicePreset;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>開立發票</DialogTitle>
          <DialogDescription>號碼會從該期、該格式的字軌自動取下一號；若已在外部平台開好，可改成手動輸入號碼補登。</DialogDescription>
        </DialogHeader>
        {open && <IssueForm preset={preset} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function IssueForm({ preset, onDone }: { preset?: InvoicePreset; onDone: () => void }) {
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();
  const { data: company } = useGetCompanySettings();
  const { data: orders } = useListOrders({});

  const [orderId, setOrderId] = useState<number | null>(preset?.order_id ?? null);
  const [customerId, setCustomerId] = useState<number | null>(preset?.customer_id ?? null);
  const [buyerName, setBuyerName] = useState(preset?.buyer_name ?? "");
  const [buyerTaxId, setBuyerTaxId] = useState(preset?.buyer_tax_id ?? "");
  const [kind, setKind] = useState<(typeof INVOICE_KINDS)[number]>(preset?.buyer_tax_id ? "三聯式" : "二聯式");
  const [taxType, setTaxType] = useState<(typeof TAX_TYPES)[number]>("應稅");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [total, setTotal] = useState(preset?.total ?? 0);
  const [manual, setManual] = useState(false);
  const [number, setNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [donate, setDonate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // How much of the order has already been invoiced, so the default amount is the remainder.
  const { data: orderInvoices } = useListInvoices({ order_id: orderId ?? undefined }, { query: { enabled: !!orderId, queryKey: ["/api/invoices", { order_id: orderId }] } });
  const invoiced = (orderInvoices ?? []).filter((i) => i.status === "已開立").reduce((s, i) => s + i.total - i.allowance_total, 0);

  const pickOrder = (id: number | null) => {
    setOrderId(id);
    const o = orders?.find((x) => x.id === id);
    if (o) fillFromOrder(o);
  };
  const fillFromOrder = (o: Order) => {
    setCustomerId(o.customer_id ?? null);
    setBuyerName(o.contact_name);
    setTotal(o.total);
  };

  const split = splitTotal(total, taxType, company?.tax_rate ?? 5);
  const period = periodOf(date);
  const remaining = orderId ? (orders?.find((o) => o.id === orderId)?.total ?? 0) - invoiced : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (kind === "三聯式" && !isValidTaxId(buyerTaxId.trim())) return setError("三聯式發票需要正確的買受人統一編號");
    const data: InvoiceInput = {
      kind,
      invoice_date: date,
      invoice_number: manual && kind !== "免用發票" ? number.trim() || null : null,
      customer_id: customerId,
      order_id: orderId,
      buyer_name: buyerName.trim(),
      buyer_tax_id: buyerTaxId.trim() || null,
      tax_type: taxType,
      total,
      carrier: kind === "電子發票" ? carrier.trim() || null : null,
      donate_code: kind === "電子發票" ? donate.trim() || null : null,
      note: note.trim() || null,
    };
    createInvoice.mutate(
      { data },
      {
        onSuccess: (inv) => {
          toast.success(`已開立發票 ${inv.invoice_number}`);
          invalidateApi(queryClient, "/api/invoices", "/api/tax");
          onDone();
        },
        onError: (err) => setError(apiErrorMessage(err, "開立失敗，請檢查欄位")),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">對應訂單（選填）</span>
        <select className={inputCls} value={orderId ?? ""} onChange={(e) => pickOrder(e.target.value ? Number(e.target.value) : null)}>
          <option value="">不連結訂單</option>
          {orders?.filter((o) => o.status !== "已取消").map((o) => (
            <option key={o.id} value={o.id}>{o.order_number}・{o.contact_name}・{o.title}（{formatTWD(o.total)}）</option>
          ))}
        </select>
        {remaining !== null && (
          <span className="text-xs text-muted-foreground">
            此訂單已開立 {formatTWD(invoiced)}，尚可開立 {formatTWD(Math.max(0, remaining))}
            {remaining > 0 && (
              <button type="button" className="ml-2 text-primary hover:underline" onClick={() => setTotal(remaining)}>帶入餘額</button>
            )}
          </span>
        )}
      </label>

      <CustomerPicker
        onSelect={(c) => {
          setCustomerId(c.id);
          setBuyerName(c.company_name || c.name);
          setBuyerTaxId(c.tax_id ?? "");
          if (c.tax_id) setKind("三聯式");
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">發票格式 *</span>
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {INVOICE_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">開立日期 *</span>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <p className="col-span-2 -mt-1 text-xs text-muted-foreground">{KIND_HINT[kind]}（歸屬 {periodLabel(period)} 期）</p>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">買受人 *</span>
          <input className={inputCls} value={buyerName} onChange={(e) => { setBuyerName(e.target.value); setCustomerId(null); }} required />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">買受人統編{kind === "三聯式" && " *"}</span>
          <input className={inputCls} value={buyerTaxId ?? ""} onChange={(e) => setBuyerTaxId(e.target.value)} maxLength={8} inputMode="numeric" />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">課稅別</span>
          <select className={inputCls} value={taxType} onChange={(e) => setTaxType(e.target.value as typeof taxType)}>
            {TAX_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">總金額（含稅）*</span>
          <input type="number" min={1} className={inputCls} value={total || ""} onChange={(e) => setTotal(Number(e.target.value) || 0)} required />
        </label>
      </div>

      <div className="rounded-md bg-muted/50 px-4 py-3 text-sm grid grid-cols-3 gap-2 tabular-nums">
        <div><div className="text-xs text-muted-foreground">銷售額</div>{formatTWD(split.sales_amount)}</div>
        <div><div className="text-xs text-muted-foreground">營業稅</div>{formatTWD(split.tax_amount)}</div>
        <div><div className="text-xs text-muted-foreground">總計</div><span className="font-semibold">{formatTWD(split.total)}</span></div>
      </div>

      {kind === "電子發票" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">載具（選填）</span>
            <input className={inputCls} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="/ABC+123" disabled={!!donate} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">捐贈碼（選填）</span>
            <input className={inputCls} value={donate} onChange={(e) => setDonate(e.target.value)} disabled={!!carrier} />
          </label>
        </div>
      )}

      {kind !== "免用發票" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
            手動輸入發票號碼（補登外部平台或紙本發票）
          </label>
          {manual && (
            <input className={inputCls} value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="例：AB12345678" maxLength={10} />
          )}
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">備註</span>
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：婚紗拍攝尾款" />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={`${btnOutline} h-10 px-4`}>取消</button>
        <button type="submit" disabled={createInvoice.isPending || total <= 0} className={`${btnPrimary} h-10 px-5`}>
          {createInvoice.isPending ? "開立中..." : "開立發票"}
        </button>
      </div>
    </form>
  );
}
