"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Ban, ReceiptText, Camera, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInvoice,
  useVoidInvoice,
  useListInvoiceAllowances,
  useCreateInvoiceAllowance,
  useVoidInvoiceAllowance,
  useGetCompanySettings,
} from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { formatTWD } from "@/lib/money";
import { periodLabel } from "@/lib/tax";
import { inputCls, btnOutline, btnPrimary, btnDanger, cardCls } from "@/lib/ui";
import { INVOICE_STATUS_COLOR } from "../constants";

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const queryClient = useQueryClient();
  const [voidOpen, setVoidOpen] = useState(false);
  const [allowOpen, setAllowOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [allowTotal, setAllowTotal] = useState(0);
  const [allowDate, setAllowDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [allowReason, setAllowReason] = useState("");

  const { data: invoice, isLoading } = useGetInvoice(invoiceId, { query: { enabled: !!invoiceId } });
  const { data: allowances } = useListInvoiceAllowances({ invoice_id: invoiceId }, { query: { enabled: !!invoiceId, queryKey: ["/api/invoice-allowances", { invoice_id: invoiceId }] } });
  const { data: company } = useGetCompanySettings();
  const voidInvoice = useVoidInvoice();
  const createAllowance = useCreateInvoiceAllowance();
  const voidAllowance = useVoidInvoiceAllowance();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!invoice) return <div className="p-8 text-center text-destructive">找不到此發票</div>;

  const refresh = () => invalidateApi(queryClient, "/api/invoices", "/api/invoice-allowances", "/api/tax");
  const active = allowances?.filter((a) => a.status === "有效") ?? [];
  const remaining = invoice.total - invoice.allowance_total;
  const voided = invoice.status === "已作廢";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="print:hidden space-y-4">
        <Link href="/accounting/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回發票管理
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-medium border ${INVOICE_STATUS_COLOR[invoice.status]}`}>{invoice.status}</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className={btnOutline}><Printer className="w-4 h-4" /> 列印</button>
            {!voided && remaining > 0 && (
              <button onClick={() => { setAllowTotal(0); setAllowOpen(true); }} className={btnOutline}><ReceiptText className="w-4 h-4" /> 開立折讓</button>
            )}
            {!voided && (
              <button onClick={() => { setReason(""); setVoidOpen(true); }} className={btnDanger}><Ban className="w-4 h-4" /> 作廢</button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          發票不能刪除或修改：開錯請作廢後重開。已申報的期別會鎖定。這裡是內部留存紀錄，不等同於交給客戶的統一發票。
        </p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-10 space-y-8 print:border-0 print:shadow-none print:p-0 relative">
        {voided && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-bold text-rose-500/15 -rotate-12 border-8 border-rose-500/15 px-6 rounded-xl">作廢</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Camera className="w-5 h-5" />
              <span className="font-semibold tracking-wide">{company?.name || "青春止秒攝影工作室"}</span>
            </div>
            {company?.tax_id && <p className="text-sm text-muted-foreground mt-1">統一編號 {company.tax_id}</p>}
            <h1 className="text-2xl font-bold tracking-tight mt-4">{invoice.kind === "免用發票" ? "收據（免用統一發票）" : `統一發票・${invoice.kind}`}</h1>
            <p className="font-mono text-lg mt-1">{invoice.invoice_number}</p>
          </div>
          <div className="text-sm space-y-1 sm:text-right">
            <div><span className="text-muted-foreground">開立日期　</span>{format(new Date(invoice.invoice_date), "yyyy/MM/dd")}</div>
            <div><span className="text-muted-foreground">申報期別　</span>{periodLabel(invoice.period)}</div>
            <div><span className="text-muted-foreground">課稅別　</span>{invoice.tax_type}</div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 print:bg-transparent print:p-0 space-y-1">
          <p className="text-xs text-muted-foreground">買受人</p>
          <p className="font-medium">{invoice.buyer_name}</p>
          {invoice.buyer_tax_id && <p className="text-sm text-muted-foreground">統一編號 {invoice.buyer_tax_id}</p>}
          {invoice.carrier && <p className="text-sm text-muted-foreground">載具 {invoice.carrier}</p>}
          {invoice.donate_code && <p className="text-sm text-muted-foreground">捐贈碼 {invoice.donate_code}</p>}
          {invoice.order_id && (
            <Link href={`/orders/${invoice.order_id}`} className="print:hidden inline-flex items-center gap-1.5 text-sm text-primary hover:underline pt-1">
              <ShoppingBag className="w-4 h-4" /> 訂單 {invoice.order_number}
            </Link>
          )}
        </div>

        <div className="ml-auto w-full sm:w-72 space-y-2 text-sm tabular-nums">
          <div className="flex justify-between"><span className="text-muted-foreground">銷售額</span><span>{formatTWD(invoice.sales_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">營業稅</span><span>{formatTWD(invoice.tax_amount)}</span></div>
          <div className="flex justify-between pt-2 border-t border-border text-base font-semibold"><span>總計</span><span>{formatTWD(invoice.total)}</span></div>
          {invoice.allowance_total > 0 && (
            <div className="flex justify-between text-amber-700"><span>已折讓</span><span>− {formatTWD(invoice.allowance_total)}</span></div>
          )}
        </div>

        {invoice.note && <p className="text-sm text-muted-foreground border-t border-border pt-4">備註：{invoice.note}</p>}
        {voided && (
          <p className="text-sm text-rose-700 border-t border-border pt-4">
            作廢原因：{invoice.void_reason}（{invoice.voided_at && format(new Date(invoice.voided_at), "yyyy/MM/dd HH:mm")}）
          </p>
        )}
      </div>

      {(allowances?.length ?? 0) > 0 && (
        <div className={`${cardCls} print:hidden`}>
          <div className="p-4 border-b border-border font-semibold">折讓單</div>
          <ul className="divide-y divide-border">
            {allowances?.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs">{a.allowance_number}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(a.allowance_date), "yyyy/MM/dd")}{a.reason && `・${a.reason}`}</div>
                </div>
                <div className={`tabular-nums text-right ${a.status === "作廢" ? "line-through text-muted-foreground" : ""}`}>
                  − {formatTWD(a.total)}
                  <div className="text-xs text-muted-foreground">稅額 {a.tax_amount}</div>
                </div>
                {a.status === "有效" ? (
                  <button
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      if (!confirm("確定要作廢這張折讓單嗎？")) return;
                      voidAllowance.mutate(
                        { id: a.id },
                        { onSuccess: () => { toast.success("折讓單已作廢"); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e, "作廢失敗")) },
                      );
                    }}
                  >
                    作廢
                  </button>
                ) : <span className="text-xs text-muted-foreground">已作廢</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>作廢發票 {invoice.invoice_number}</DialogTitle>
            <DialogDescription>作廢後號碼仍保留在紀錄中，不會再被使用，也不計入營業稅申報。</DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">作廢原因 *</span>
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：買受人統編填錯，重新開立" autoFocus />
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setVoidOpen(false)} className={`${btnOutline} h-10 px-4`}>取消</button>
            <button
              disabled={!reason.trim() || voidInvoice.isPending}
              onClick={() =>
                voidInvoice.mutate(
                  { id: invoice.id, data: { reason: reason.trim() } },
                  {
                    onSuccess: () => { toast.success("發票已作廢"); setVoidOpen(false); refresh(); },
                    onError: (e) => toast.error(apiErrorMessage(e, "作廢失敗")),
                  },
                )
              }
              className={`${btnPrimary} h-10 px-5 bg-destructive hover:bg-destructive/90`}
            >
              確認作廢
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={allowOpen} onOpenChange={setAllowOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>開立折讓</DialogTitle>
            <DialogDescription>部分退款或折價時使用，金額會從開立折讓當期的銷項中扣除。目前最多可折讓 {formatTWD(remaining)}。</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">折讓日期 *</span>
              <input type="date" className={inputCls} value={allowDate} onChange={(e) => setAllowDate(e.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">折讓金額（含稅）*</span>
              <input type="number" min={1} max={remaining} className={inputCls} value={allowTotal || ""} onChange={(e) => setAllowTotal(Number(e.target.value) || 0)} autoFocus />
            </label>
            <label className="space-y-1.5 col-span-2">
              <span className="text-sm font-medium">原因</span>
              <input className={inputCls} value={allowReason} onChange={(e) => setAllowReason(e.target.value)} placeholder="例：客戶取消加購相簿" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAllowOpen(false)} className={`${btnOutline} h-10 px-4`}>取消</button>
            <button
              disabled={allowTotal <= 0 || allowTotal > remaining || createAllowance.isPending}
              onClick={() =>
                createAllowance.mutate(
                  { data: { invoice_id: invoice.id, allowance_date: allowDate, total: allowTotal, reason: allowReason.trim() || null } },
                  {
                    onSuccess: (a) => { toast.success(`已開立折讓單 ${a.allowance_number}`); setAllowOpen(false); refresh(); },
                    onError: (e) => toast.error(apiErrorMessage(e, "開立失敗")),
                  },
                )
              }
              className={`${btnPrimary} h-10 px-5`}
            >
              開立折讓單
            </button>
          </div>
          {active.length > 0 && <p className="text-xs text-muted-foreground">這張發票已有 {active.length} 張折讓單。</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
