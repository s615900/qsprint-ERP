"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Printer, Lock, Unlock, CheckCircle2, Info } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetTaxReport, useListTaxFilings, useUpdateTaxFiling, type TaxAmountRow } from "@/lib/api-client";
import { PeriodPicker, currentPeriod } from "@/components/PeriodPicker";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { formatTWD } from "@/lib/money";
import { periodLabel } from "@/lib/tax";
import { btnOutline, btnPrimary, cardCls, inputCls } from "@/lib/ui";
import { INVOICE_STATUS_COLOR } from "@/features/invoices/constants";

const n = (v: number) => v.toLocaleString("zh-TW");

function SectionRow({ title }: { title: string }) {
  return (
    <tr className="bg-muted/50">
      <td colSpan={4} className="px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground">{title}</td>
    </tr>
  );
}

function AmountLine({ row, negative, bold }: { row: TaxAmountRow; negative?: boolean; bold?: boolean }) {
  const sign = negative && (row.amount || row.tax) ? "−" : "";
  return (
    <tr className={bold ? "font-semibold" : undefined}>
      <td className="px-4 py-2">{row.label}</td>
      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{row.count || ""}</td>
      <td className="px-4 py-2 text-right tabular-nums">{sign}{n(row.amount)}</td>
      <td className="px-4 py-2 text-right tabular-nums">{sign}{n(row.tax)}</td>
    </tr>
  );
}

function TotalLine({ label, amount, tax }: { label: string; amount?: number | null; tax?: number | null }) {
  return (
    <tr className="border-t border-border bg-muted/20 font-semibold">
      <td className="px-4 py-2" colSpan={2}>{label}</td>
      <td className="px-4 py-2 text-right tabular-nums">{amount == null ? "" : n(amount)}</td>
      <td className="px-4 py-2 text-right tabular-nums">{tax == null ? "" : n(tax)}</td>
    </tr>
  );
}

export function TaxReport() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod);
  const [carryDraft, setCarryDraft] = useState<string | null>(null);

  const { data: r, isLoading } = useGetTaxReport({ period });
  const year = Number(period.slice(0, 4));
  const { data: yearSummary } = useListTaxFilings({ year });
  const updateFiling = useUpdateTaxFiling();
  const refresh = () => invalidateApi(queryClient, "/api/tax");

  const filed = r?.filing.status === "已申報";
  const daysLeft = r ? differenceInCalendarDays(new Date(r.deadline), new Date()) : null;

  const setFiled = (status: "已申報" | "未申報") => {
    const msg =
      status === "已申報"
        ? `將 ${periodLabel(period)} 期標記為已申報？\n\n標記後這一期的發票、折讓與進項憑證都會鎖定，不能再新增、作廢或修改。\n請先確認已在財政部電子申報繳稅服務網（或請會計師）完成實際申報。`
        : "撤銷申報狀態後，這一期可以再次異動。確定嗎？";
    if (!confirm(msg)) return;
    updateFiling.mutate(
      { period, data: { status } },
      { onSuccess: () => { toast.success(status === "已申報" ? "已標記為已申報" : "已撤銷申報狀態"); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e, "更新失敗")) },
    );
  };

  const saveCarry = (value: number | null) =>
    updateFiling.mutate(
      { period, data: { carry_in_override: value } },
      { onSuccess: () => { toast.success("已更新上期留抵稅額"); setCarryDraft(null); refresh(); }, onError: (e) => toast.error(apiErrorMessage(e, "更新失敗")) },
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">營業稅申報（401）</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          依本期開立的發票、折讓與進項憑證，自動彙整 401 申報書各欄數字，申報時照著填入即可。
        </p>
      </div>

      {/* Six periods of the year at a glance */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {yearSummary?.map((p) => (
          <button
            key={p.period}
            onClick={() => setPeriod(p.period)}
            className={`text-left rounded-xl border p-3 transition-colors ${p.period === period ? "border-primary bg-primary/5" : "bg-card hover:border-primary/40"}`}
          >
            <div className="text-xs text-muted-foreground">{Number(p.period.slice(5))}-{Number(p.period.slice(5)) + 1} 月</div>
            <div className="text-sm font-semibold tabular-nums mt-1">
              {p.payable > 0 ? `應繳 ${n(p.payable)}` : p.carry_out > 0 ? `留抵 ${n(p.carry_out)}` : p.invoice_count ? "稅額 0" : "—"}
            </div>
            <div className={`text-[11px] mt-1 ${p.status === "已申報" ? "text-emerald-600" : "text-muted-foreground"}`}>{p.status}</div>
          </button>
        ))}
      </div>

      <div className="print:hidden flex flex-wrap items-center gap-3">
        <PeriodPicker value={period} onChange={setPeriod} />
        {r && (
          <>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${filed ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
              {filed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}{r.filing.status}
            </span>
            <span className="text-sm text-muted-foreground">
              申報期限 {format(new Date(r.deadline), "yyyy/MM/dd")}（遇假日順延）
              {!filed && daysLeft !== null && (daysLeft < 0 ? <span className="text-destructive">・已逾期 {-daysLeft} 天</span> : daysLeft <= 14 ? <span className="text-amber-700">・剩 {daysLeft} 天</span> : null)}
            </span>
          </>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`/api/tax/export?period=${period}&type=summary`} className={btnOutline}><Download className="w-4 h-4" /> 彙總 CSV</a>
          <a href={`/api/tax/export?period=${period}&type=sales`} className={btnOutline}><Download className="w-4 h-4" /> 銷項明細</a>
          <a href={`/api/tax/export?period=${period}&type=purchases`} className={btnOutline}><Download className="w-4 h-4" /> 進項明細</a>
          <button onClick={() => window.print()} className={btnOutline}><Printer className="w-4 h-4" /> 列印</button>
        </div>
      </div>

      {isLoading || !r ? (
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className={`${cardCls} overflow-hidden print:border-0 print:shadow-none`}>
          <div className="px-4 sm:px-6 py-5 border-b border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">營業人銷售額與稅額申報書（401）</h2>
                <p className="text-sm text-muted-foreground">所屬期間 {periodLabel(period)}（{r.start} ～ {r.end}）</p>
              </div>
              <div className="text-sm text-muted-foreground sm:text-right">
                <div>{r.company.name || "（尚未設定營業人名稱）"}</div>
                <div>統編 {r.company.tax_id || "—"}　稅籍編號 {r.company.tax_reg_number || "—"}</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">項目</th>
                  <th className="px-4 py-2 text-right font-medium w-16">份數</th>
                  <th className="px-4 py-2 text-right font-medium w-32">銷售額／金額</th>
                  <th className="px-4 py-2 text-right font-medium w-28">稅額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <SectionRow title="銷項（銷售額）" />
                {r.output_rows.map((row) => <AmountLine key={row.key} row={{ ...row, label: `應稅・${row.label}` }} />)}
                <AmountLine row={r.allowances} negative />
                <TotalLine label="應稅銷售額合計" amount={r.taxable_sales} tax={r.taxable_tax} />
                <AmountLine row={r.zero_rate} />
                <AmountLine row={r.exempt} />
                <TotalLine label="銷售額總計" amount={r.sales_total} />

                <SectionRow title="進項（得扣抵）" />
                {r.input_rows.map((row) => <AmountLine key={row.key} row={row} />)}
                <TotalLine label="得扣抵進項金額／稅額合計" amount={r.input_deductible_amount} tax={r.input_deductible_tax} />
                {r.non_deductible.count > 0 && (
                  <tr className="text-muted-foreground">
                    <td className="px-4 py-2">{r.non_deductible.label}（不計入扣抵，僅供對照）</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.non_deductible.count}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{n(r.non_deductible.amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{n(r.non_deductible.tax)}</td>
                  </tr>
                )}

                <SectionRow title="稅額計算" />
                <tr><td className="px-4 py-2" colSpan={3}>① 本期銷項稅額合計</td><td className="px-4 py-2 text-right tabular-nums">{n(r.output_tax)}</td></tr>
                <tr><td className="px-4 py-2" colSpan={3}>② 得扣抵進項稅額合計</td><td className="px-4 py-2 text-right tabular-nums">{n(r.input_tax)}</td></tr>
                <tr>
                  <td className="px-4 py-2" colSpan={3}>
                    ③ 上期累積留抵稅額
                    <span className="print:hidden text-xs text-muted-foreground ml-2">
                      {r.filing.carry_in_override !== null ? "（手動設定）" : "（自動帶入上期的申報留抵）"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {carryDraft !== null ? (
                      <span className="print:hidden inline-flex items-center gap-1.5">
                        <input type="number" min={0} value={carryDraft} onChange={(e) => setCarryDraft(e.target.value)} className={`${inputCls} h-8 w-28 text-right`} autoFocus />
                        <button className="text-xs text-primary hover:underline" onClick={() => saveCarry(Math.max(0, Number(carryDraft) || 0))}>儲存</button>
                        <button className="text-xs text-muted-foreground hover:underline" onClick={() => setCarryDraft(null)}>取消</button>
                      </span>
                    ) : (
                      <>
                        {n(r.carry_in)}
                        {!filed && (
                          <span className="print:hidden ml-2">
                            <button className="text-xs text-primary hover:underline" onClick={() => setCarryDraft(String(r.carry_in))}>修改</button>
                            {r.filing.carry_in_override !== null && (
                              <button className="text-xs text-muted-foreground hover:underline ml-2" onClick={() => saveCarry(null)}>改回自動</button>
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-4 py-3" colSpan={3}>本期應實繳稅額　（① − ② − ③ ，大於 0 才需繳）</td>
                  <td className="px-4 py-3 text-right tabular-nums text-lg">{formatTWD(r.payable)}</td>
                </tr>
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-4 py-3" colSpan={3}>本期申報留抵稅額　（小於 0 時，留待下期扣抵）</td>
                  <td className="px-4 py-3 text-right tabular-nums text-lg">{formatTWD(r.carry_out)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {r && (
        <div className="print:hidden space-y-6">
          <div className={`${cardCls} p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between`}>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>本頁負責整理數字，實際申報請到財政部電子申報繳稅服務網（或交給會計師）。完成後再標記「已申報」，這一期就會鎖定避免被誤改。</span>
            </div>
            {filed ? (
              <button onClick={() => setFiled("未申報")} className={`${btnOutline} shrink-0`}><Unlock className="w-4 h-4" /> 撤銷申報（更正用）</button>
            ) : (
              <button onClick={() => setFiled("已申報")} disabled={updateFiling.isPending} className={`${btnPrimary} shrink-0`}><CheckCircle2 className="w-4 h-4" /> 標記為已申報</button>
            )}
          </div>

          <div className={cardCls}>
            <div className="p-4 border-b border-border font-semibold">本期銷項發票（{r.invoices.length} 張）</div>
            {r.invoices.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">沒有發票</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {r.invoices.map((i) => (
                      <tr key={i.id} className={i.status === "已作廢" ? "text-muted-foreground" : ""}>
                        <td className="px-4 py-2 whitespace-nowrap"><Link href={`/accounting/invoices/${i.id}`} className="font-mono text-xs text-primary hover:underline">{i.invoice_number}</Link></td>
                        <td className="px-4 py-2 whitespace-nowrap">{format(new Date(i.invoice_date), "MM/dd")}</td>
                        <td className="px-4 py-2">{i.kind}</td>
                        <td className="px-4 py-2">{i.buyer_name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{n(i.sales_amount)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{n(i.tax_amount)}</td>
                        <td className="px-4 py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${INVOICE_STATUS_COLOR[i.status]}`}>{i.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
