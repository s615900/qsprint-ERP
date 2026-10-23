"use client";

import { useState } from "react";
import { Trash2, Plus, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListInvoiceTracks, useCreateInvoiceTrack, useDeleteInvoiceTrack } from "@/lib/api-client";
import { PeriodPicker, currentPeriod } from "@/components/PeriodPicker";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { TRACK_KINDS, periodLabel } from "@/lib/tax";
import { inputCls, btnPrimary, cardCls } from "@/lib/ui";

export function InvoiceTracks() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod);
  const [kind, setKind] = useState<(typeof TRACK_KINDS)[number]>("二聯式");
  const [prefix, setPrefix] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const { data: tracks, isLoading } = useListInvoiceTracks();
  const create = useCreateInvoiceTrack();
  const remove = useDeleteInvoiceTrack();
  const refresh = () => invalidateApi(queryClient, "/api/invoice-tracks");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { data: { period, kind, prefix: prefix.trim(), range_start: Number(start), range_end: Number(end) } },
      {
        onSuccess: () => { toast.success("字軌已登錄"); setPrefix(""); setStart(""); setEnd(""); refresh(); },
        onError: (err) => toast.error(apiErrorMessage(err, "登錄失敗，請檢查欄位")),
      },
    );
  };

  const grouped = new Map<string, NonNullable<typeof tracks>>();
  for (const t of tracks ?? []) grouped.set(t.period, [...(grouped.get(t.period) ?? []), t]);
  const periods = [...grouped.keys()].sort().reverse();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">字軌配號</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          登錄稅捐機關或電子發票平台配給的發票號碼區間（每兩個月一期），開立發票時系統會依序自動取號。
        </p>
      </div>

      <form onSubmit={submit} className={`${cardCls} p-5 space-y-4`}>
        <h2 className="font-semibold">新增一組字軌</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="space-y-1.5 col-span-2">
            <span className="text-sm font-medium">期別</span>
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">格式</span>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {TRACK_KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">字軌（2 碼英文）</span>
            <input className={inputCls} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={2} placeholder="AB" required pattern="[A-Za-z]{2}" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">起始號碼</span>
            <input className={inputCls} value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ""))} maxLength={8} inputMode="numeric" placeholder="12345000" required />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">結束號碼</span>
            <input className={inputCls} value={end} onChange={(e) => setEnd(e.target.value.replace(/\D/g, ""))} maxLength={8} inputMode="numeric" placeholder="12345049" required />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">將登錄為 {periodLabel(period)} 期・{kind}。每本發票通常 50 號。</p>
          <button type="submit" disabled={create.isPending} className={`${btnPrimary} h-10 px-4`}><Plus className="w-4 h-4" /> 登錄</button>
        </div>
      </form>

      {isLoading ? (
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      ) : periods.length === 0 ? (
        <div className={`${cardCls} py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3`}>
          <ListOrdered className="w-10 h-10 text-muted-foreground/40" />
          還沒有登錄任何字軌
        </div>
      ) : (
        periods.map((p) => (
          <div key={p} className={cardCls}>
            <div className="p-4 border-b border-border font-semibold">{periodLabel(p)} 期</div>
            <ul className="divide-y divide-border">
              {grouped.get(p)!.map((t) => {
                const total = t.range_end - t.range_start + 1;
                return (
                  <li key={t.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="sm:w-28 text-sm font-medium">{t.kind}</div>
                    <div className="font-mono text-xs sm:w-64">{t.prefix}{String(t.range_start).padStart(8, "0")} ~ {t.prefix}{String(t.range_end).padStart(8, "0")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(t.used / total) * 100}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">已用 {t.used} / 剩餘 {t.remaining}</div>
                    </div>
                    <button
                      disabled={t.used > 0}
                      title={t.used > 0 ? "已經開過發票，不能刪除" : "刪除"}
                      aria-label="刪除"
                      onClick={() => {
                        if (!confirm("確定要刪除這組字軌嗎？")) return;
                        remove.mutate({ id: t.id }, { onSuccess: () => { toast.success("已刪除"); refresh(); }, onError: (err) => toast.error(apiErrorMessage(err, "刪除失敗")) });
                      }}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
