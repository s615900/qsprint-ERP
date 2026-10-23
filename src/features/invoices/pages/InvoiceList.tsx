"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Receipt, Search, Download, ListOrdered } from "lucide-react";
import { format } from "date-fns";
import { useListInvoices, useListInvoiceTracks } from "@/lib/api-client";
import { PeriodPicker, currentPeriod } from "@/components/PeriodPicker";
import { formatTWD } from "@/lib/money";
import { INVOICE_KINDS, periodLabel } from "@/lib/tax";
import { btnOutline, btnPrimaryLg, cardCls, filterSelectCls } from "@/lib/ui";
import { IssueInvoiceDialog } from "../components/IssueInvoiceDialog";
import { INVOICE_STATUS_COLOR } from "../constants";

export function InvoiceList() {
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState(false);

  const { data: invoices, isLoading } = useListInvoices({ period, ...(search && { search }), ...(kind && { kind }) });
  const { data: tracks } = useListInvoiceTracks({ period });

  const live = invoices?.filter((i) => i.status === "已開立") ?? [];
  const sales = live.reduce((s, i) => s + i.sales_amount, 0);
  const tax = live.reduce((s, i) => s + i.tax_amount, 0);
  const remaining = tracks?.reduce((s, t) => s + t.remaining, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">發票管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">開立銷項發票、作廢與折讓，資料會自動帶進營業稅 401 申報。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/accounting?tab=tracks" className={`${btnOutline} h-10 px-3`}><ListOrdered className="w-4 h-4" /> 字軌配號</Link>
          <button onClick={() => setOpen(true)} className={btnPrimaryLg}><Plus className="w-4 h-4" /> 開立發票</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PeriodPicker value={period} onChange={setPeriod} />
        <span className="text-sm text-muted-foreground">{periodLabel(period)}期</span>
        <a href={`/api/tax/export?period=${period}&type=sales`} className={`${btnOutline} ml-auto`}>
          <Download className="w-4 h-4" /> 匯出本期銷項 CSV
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "本期開立", value: `${live.length} 張` },
          { label: "銷售額（未稅）", value: formatTWD(sales) },
          { label: "銷項稅額", value: formatTWD(tax) },
          { label: "字軌剩餘號碼", value: tracks ? `${remaining} 組` : "-" },
        ].map((c) => (
          <div key={c.label} className={`${cardCls} p-5`}>
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{isLoading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : c.value}</div>
          </div>
        ))}
      </div>

      <div className={`${cardCls} flex flex-col`}>
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="搜尋發票號碼、買受人或統編..."
              className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className={filterSelectCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">所有格式</option>
            {INVOICE_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : invoices?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <Receipt className="w-10 h-10 text-muted-foreground/40" />
            {search || kind ? "沒有符合條件的發票" : "這一期還沒有開立發票"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 sm:px-6 py-3 font-medium">發票號碼</th>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">格式</th>
                  <th className="px-4 py-3 font-medium">買受人</th>
                  <th className="px-4 py-3 font-medium text-right">銷售額</th>
                  <th className="px-4 py-3 font-medium text-right">稅額</th>
                  <th className="px-4 py-3 font-medium text-right">總計</th>
                  <th className="px-4 sm:px-6 py-3 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices?.map((i) => (
                  <tr key={i.id} className={`hover:bg-muted/30 transition-colors ${i.status === "已作廢" ? "text-muted-foreground" : ""}`}>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                      <Link href={`/accounting/invoices/${i.id}`} className={`font-mono text-xs text-primary hover:underline ${i.status === "已作廢" ? "line-through" : ""}`}>{i.invoice_number}</Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(i.invoice_date), "MM/dd")}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{i.kind}</td>
                    <td className="px-4 py-3">
                      <div>{i.buyer_name}</div>
                      {i.buyer_tax_id && <div className="text-xs text-muted-foreground">統編 {i.buyer_tax_id}</div>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{i.sales_amount.toLocaleString("zh-TW")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{i.tax_amount.toLocaleString("zh-TW")}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {i.total.toLocaleString("zh-TW")}
                      {i.allowance_total > 0 && <div className="text-xs font-normal text-amber-600">折讓 −{i.allowance_total.toLocaleString("zh-TW")}</div>}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${INVOICE_STATUS_COLOR[i.status]}`}>{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <IssueInvoiceDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
