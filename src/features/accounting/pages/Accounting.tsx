"use client";

import { filterSelectCls } from "@/lib/ui";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, TrendingUp, TrendingDown, Scale, Receipt, Pencil, Trash2, BookOpen, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAccountingSummary,
  useListTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type Transaction,
  type TransactionType,
} from "@/lib/api-client";
import { formatTWD } from "@/lib/money";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { MonthlyChart } from "../components/MonthlyChart";
import { EntryForm } from "../components/EntryForm";
import { INCOME_COLOR, EXPENSE_COLOR } from "../constants";

function CategoryBreakdown({ title, rows, color }: { title: string; rows: Transaction[]; color: string }) {
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.category, (map.get(r.category) ?? 0) + r.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const max = totals[0]?.[1] ?? 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {totals.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">本月沒有紀錄</p>
      ) : (
        totals.map(([cat, amt]) => (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{cat}</span>
              <span className="tabular-nums text-muted-foreground">{formatTWD(amt)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(amt / max) * 100}%`, background: color }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function Accounting() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const year = Number(month.slice(0, 4));
  const { data: summary, isLoading: summaryLoading } = useGetAccountingSummary({ year });
  const { data: entries, isLoading } = useListTransactions({ month });
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  const income = entries?.filter((e) => e.type === "收入") ?? [];
  const expense = entries?.filter((e) => e.type === "支出") ?? [];
  const incomeTotal = income.reduce((s, e) => s + e.amount, 0);
  const expenseTotal = expense.reduce((s, e) => s + e.amount, 0);
  const visible = typeFilter ? entries?.filter((e) => e.type === typeFilter) : entries;

  const refresh = () => invalidateApi(queryClient, "/api/transactions", "/api/accounting", "/api/orders");

  const handleSave = (data: Parameters<typeof createTx.mutate>[0]["data"]) => {
    const done = {
      onSuccess: () => {
        toast.success(editing ? "已更新" : "已新增");
        setFormOpen(false);
        setEditing(null);
        refresh();
      },
      onError: (err: unknown) => toast.error(apiErrorMessage(err, "儲存失敗")),
    };
    if (editing) updateTx.mutate({ id: editing.id, data }, done);
    else createTx.mutate({ data }, done);
  };

  const handleDelete = (entry: Transaction) => {
    const extra = entry.order_id ? `\n\n這是訂單 ${entry.order_number} 的收款，刪除後訂單的已收金額也會減少。` : "";
    if (!confirm(`確定要刪除這筆紀錄嗎？${extra}`)) return;
    deleteTx.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          toast.success("已刪除");
          refresh();
        },
        onError: (err) => toast.error(apiErrorMessage(err, "刪除失敗")),
      },
    );
  };

  const monthLabel = `${Number(month.slice(5))}月`;
  const cards = [
    { label: `${monthLabel}收入`, value: formatTWD(incomeTotal), icon: TrendingUp, color: "text-teal-700", bg: "bg-teal-100" },
    { label: `${monthLabel}支出`, value: formatTWD(expenseTotal), icon: TrendingDown, color: "text-orange-700", bg: "bg-orange-100" },
    {
      label: `${monthLabel}淨利`,
      value: formatTWD(incomeTotal - expenseTotal),
      icon: Scale,
      color: "text-amber-700",
      bg: "bg-amber-100",
      valueCls: incomeTotal - expenseTotal < 0 ? "text-rose-600" : undefined,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">會計系統</h1>
          <p className="text-muted-foreground mt-1 text-sm">記錄工作室收支，訂單收款會自動入帳。</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 shadow-sm hover-elevate"
          >
            <Plus className="w-4 h-4" /> 記一筆
          </button>
        </div>
      </div>

      {formOpen && (
        <EntryForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          isPending={createTx.isPending || updateTx.isPending}
          onSubmit={handleSave}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card shadow-sm p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <span className={`w-8 h-8 rounded-full ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </span>
            </div>
            <div className={`text-2xl font-bold mt-2 tabular-nums ${card.valueCls ?? ""}`}>
              {isLoading ? <div className="h-8 w-28 bg-muted animate-pulse rounded" /> : card.value}
            </div>
          </div>
        ))}
        <Link href="/orders" className="rounded-xl border bg-card shadow-sm p-5 hover:border-primary/40 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">應收帳款</span>
            <span className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-rose-600" />
            </span>
          </div>
          <div className="text-2xl font-bold mt-2 tabular-nums">
            {summaryLoading ? <div className="h-8 w-28 bg-muted animate-pulse rounded" /> : formatTWD(summary?.receivables ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary">
            {summary?.receivable_orders ?? 0} 筆訂單未付清 <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm p-6">
          <h2 className="font-semibold mb-4">{year} 年每月收支</h2>
          {summaryLoading ? (
            <div className="h-64 bg-muted animate-pulse rounded" />
          ) : (
            <MonthlyChart months={summary?.months ?? []} selected={month} onSelect={setMonth} />
          )}
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
          <h2 className="font-semibold">{monthLabel}分類</h2>
          <CategoryBreakdown title="收入" rows={income} color={INCOME_COLOR} />
          <CategoryBreakdown title="支出" rows={expense} color={EXPENSE_COLOR} />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-semibold">{monthLabel}明細</h2>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | "")}
            className={filterSelectCls}
          >
            <option value="">收入＋支出</option>
            <option value="收入">只看收入</option>
            <option value="支出">只看支出</option>
          </select>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : visible?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
            這個月還沒有紀錄，點右上角「記一筆」開始記帳
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible?.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-4 sm:px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-12 text-center shrink-0">
                  <div className="text-lg font-bold leading-none">{format(new Date(e.date), "d")}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(e.date), "M月")}</div>
                </div>
                <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: e.type === "收入" ? INCOME_COLOR : EXPENSE_COLOR }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{e.category}</span>
                    <span className="text-xs text-muted-foreground">{e.type}{e.method && `・${e.method}`}</span>
                    {e.voucher_type && e.voucher_type !== "收據/無憑證" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                        進項憑證{e.tax_amount > 0 ? ` 稅 ${e.tax_amount.toLocaleString("zh-TW")}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {e.order_id && (
                      <Link href={`/orders/${e.order_id}`} className="text-primary hover:underline mr-1.5">{e.order_number}</Link>
                    )}
                    {e.description}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums whitespace-nowrap">
                  {e.type === "收入" ? "+" : "−"}{e.amount.toLocaleString("zh-TW")}
                </div>
                <div className="flex shrink-0">
                  <button
                    onClick={() => { setEditing(e); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    aria-label="編輯"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(e)} aria-label="刪除" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
