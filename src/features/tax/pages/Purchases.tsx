"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Download, AlertTriangle, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTaxReport,
  useCreateTransaction,
  useUpdateTransaction,
  type Transaction,
  type TransactionInput,
} from "@/lib/api-client";
import { PeriodPicker, currentPeriod } from "@/components/PeriodPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntryForm } from "@/features/accounting/components/EntryForm";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { formatTWD } from "@/lib/money";
import { DEDUCT_CODES, periodLabel } from "@/lib/tax";
import { btnOutline, btnPrimary, cardCls } from "@/lib/ui";

export function Purchases() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: report, isLoading } = useGetTaxReport({ period });
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();

  const locked = report?.filing.status === "已申報";
  const refresh = () => invalidateApi(queryClient, "/api/tax", "/api/transactions", "/api/accounting");
  const open = (t: Transaction | null) => { setEditing(t); setFormOpen(true); };

  const handleSave = (data: TransactionInput) => {
    const done = {
      onSuccess: () => { toast.success("已儲存"); setFormOpen(false); setEditing(null); refresh(); },
      onError: (err: unknown) => toast.error(apiErrorMessage(err, "儲存失敗")),
    };
    if (editing) updateTx.mutate({ id: editing.id, data }, done);
    else createTx.mutate({ data }, done);
  };

  const deductible = report?.purchases.filter((p) => p.deduct_code === 1 || p.deduct_code === 2) ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link href="/accounting" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回會計系統
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">進項憑證</h1>
            <p className="text-muted-foreground mt-1 text-sm">買器材、印刷、租場地取得的統一發票，填好稅額後，401 申報才能扣抵。</p>
          </div>
          <button disabled={locked} onClick={() => open(null)} className={`${btnPrimary} h-10 px-4`}>
            <Plus className="w-4 h-4" /> 新增進項
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PeriodPicker value={period} onChange={setPeriod} />
        <span className="text-sm text-muted-foreground">{periodLabel(period)}期</span>
        {locked && <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border">已申報・已鎖定</span>}
        <a href={`/api/tax/export?period=${period}&type=purchases`} className={`${btnOutline} ml-auto`}>
          <Download className="w-4 h-4" /> 匯出 CSV
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "進項憑證", value: `${report?.purchases.length ?? 0} 筆` },
          { label: "可扣抵進項稅額", value: formatTWD(report?.input_tax ?? 0) },
          { label: "不得扣抵稅額", value: formatTWD(report?.non_deductible.tax ?? 0) },
          { label: "尚未填憑證的支出", value: `${report?.missing_vouchers.length ?? 0} 筆` },
        ].map((c) => (
          <div key={c.label} className={`${cardCls} p-5`}>
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{isLoading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : c.value}</div>
          </div>
        ))}
      </div>

      {(report?.missing_vouchers.length ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50">
          <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="w-4 h-4" /> 這些支出還沒有憑證資訊，有拿到發票的話請補上
          </div>
          <ul className="divide-y divide-amber-200/70">
            {report!.missing_vouchers.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-12 text-amber-800/80 tabular-nums">{format(new Date(t.date), "MM/dd")}</span>
                <span className="flex-1 min-w-0 truncate">{t.category}{t.description && `・${t.description}`}</span>
                <span className="tabular-nums">{formatTWD(t.amount)}</span>
                <button disabled={locked} onClick={() => open(t)} className="text-xs text-primary hover:underline disabled:opacity-40">補填憑證</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={cardCls}>
        <div className="p-4 border-b border-border font-semibold">本期進項憑證明細</div>
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : report?.purchases.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
            這一期還沒有進項憑證
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">憑證</th>
                  <th className="px-4 py-3 font-medium">賣方</th>
                  <th className="px-4 py-3 font-medium">科目</th>
                  <th className="px-4 py-3 font-medium text-right">未稅</th>
                  <th className="px-4 py-3 font-medium text-right">稅額</th>
                  <th className="px-4 py-3 font-medium text-right">含稅</th>
                  <th className="px-4 py-3 font-medium">扣抵</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report?.purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(p.voucher_date ?? p.date), "MM/dd")}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{p.voucher_number || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.voucher_type}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{p.counterparty_name || "—"}</div>
                      {p.counterparty_tax_id && <div className="text-xs text-muted-foreground">統編 {p.counterparty_tax_id}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(p.amount - p.tax_amount).toLocaleString("zh-TW")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.tax_amount.toLocaleString("zh-TW")}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{p.amount.toLocaleString("zh-TW")}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{p.deduct_code ? DEDUCT_CODES[p.deduct_code] : <span className="text-muted-foreground">無稅額</span>}</td>
                    <td className="px-2 py-3">
                      <button disabled={locked} onClick={() => open(p)} aria-label="編輯" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {deductible.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold bg-muted/30">
                    <td colSpan={5} className="px-4 py-3">可扣抵合計</td>
                    <td className="px-4 py-3 text-right tabular-nums">{report!.input_deductible_tax.toLocaleString("zh-TW")}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "編輯支出與憑證" : "新增進項"}</DialogTitle>
          </DialogHeader>
          {formOpen && (
            <EntryForm
              key={editing?.id ?? "new"}
              initial={editing ?? undefined}
              isPending={createTx.isPending || updateTx.isPending}
              onSubmit={handleSave}
              onCancel={() => { setFormOpen(false); setEditing(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
