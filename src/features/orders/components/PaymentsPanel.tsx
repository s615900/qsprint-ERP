"use client";

import { useState } from "react";
import { Wallet, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListTransactions, useCreateTransaction, useDeleteTransaction, type Order } from "@/lib/api-client";
import { INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/ledger";
import { formatTWD } from "@/lib/money";
import { invalidateApi } from "@/lib/invalidate";

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Payments are income ledger rows linked to the order, so they show up in
// accounting automatically.
export function PaymentsPanel({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const { data: payments, isLoading } = useListTransactions({ order_id: order.id });
  const createTx = useCreateTransaction();
  const deleteTx = useDeleteTransaction();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [description, setDescription] = useState("");

  const refresh = () => invalidateApi(queryClient, "/api/orders", "/api/transactions", "/api/accounting");

  const startNew = () => {
    const first = (payments?.length ?? 0) === 0;
    // First payment defaults to a 30% deposit, later ones to the remaining balance.
    setAmount(first ? Math.round(order.total * 0.3) : Math.max(0, order.balance));
    setCategory(first ? "訂金" : "尾款");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setDescription("");
    setOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return toast.error("請輸入收款金額");
    createTx.mutate(
      { data: { type: "收入", category, amount, date, method, order_id: order.id, description: description.trim() || null } },
      {
        onSuccess: () => {
          toast.success("已記錄收款");
          setOpen(false);
          refresh();
        },
        onError: () => toast.error("記錄失敗"),
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("確定要刪除這筆收款紀錄嗎？會計帳也會一併刪除。")) return;
    deleteTx.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("收款紀錄已刪除");
          refresh();
        },
        onError: () => toast.error("刪除失敗"),
      },
    );
  };

  const pct = order.total > 0 ? Math.min(100, (order.paid_amount / order.total) * 100) : 0;

  return (
    <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-8 space-y-5 print:hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> 收款紀錄
        </h2>
        {!open && (
          <button onClick={startNew} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> 記錄收款
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">訂單總額</div>
            <div className="font-semibold tabular-nums">{formatTWD(order.total)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">已收</div>
            <div className="font-semibold tabular-nums text-emerald-700">{formatTWD(order.paid_amount)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{order.balance < 0 ? "溢收" : "尚欠"}</div>
            <div className={`font-semibold tabular-nums ${order.balance > 0 ? "text-rose-600" : ""}`}>{formatTWD(Math.abs(order.balance))}</div>
          </div>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">新增收款</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="取消" className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">金額 *</span>
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className={inputCls} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">日期 *</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">款項</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">付款方式</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="備註（例：匯款末五碼 12345）" className={inputCls} />
          <div className="flex justify-end">
            <button type="submit" disabled={createTx.isPending} className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createTx.isPending ? "儲存中..." : "儲存收款"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="h-12 bg-muted animate-pulse rounded" />
      ) : payments?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">尚未收到任何款項</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {payments?.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.category}</span>
                  {p.method && <span className="text-xs text-muted-foreground">{p.method}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(p.date), "yyyy/MM/dd")}
                  {p.description && `・${p.description}`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold tabular-nums text-emerald-700">+{p.amount.toLocaleString("zh-TW")}</span>
                <button onClick={() => handleDelete(p.id)} aria-label="刪除收款" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
