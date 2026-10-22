"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Plus, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListOrders, useUpdateOrder, OrderStatus, type ListOrdersParams, type Order } from "@/lib/api-client";
import { StatusMenu } from "@/components/StatusMenu";
import { formatTWD } from "@/lib/money";
import { invalidateApi } from "@/lib/invalidate";
import { ORDER_STATUS_COLOR, paymentState } from "../constants";

const STATUSES = Object.values(OrderStatus);

function PaymentCell({ order }: { order: Order }) {
  const state = paymentState(order);
  const pct = order.total > 0 ? Math.min(100, Math.round((order.paid_amount / order.total) * 100)) : 0;
  return (
    <div className="min-w-[8rem]">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${state.cls}`}>{state.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function OrderList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [unpaid, setUnpaid] = useState(false);
  const queryClient = useQueryClient();

  const params: ListOrdersParams = {};
  if (search) params.search = search;
  if (status) params.status = status;
  if (unpaid) params.unpaid = true;
  const { data: orders, isLoading } = useListOrders(params);
  const updateOrder = useUpdateOrder();

  const handleStatus = (id: number, s: OrderStatus) =>
    updateOrder.mutate(
      { id, data: { status: s } },
      {
        onSuccess: () => {
          toast.success("狀態已更新");
          invalidateApi(queryClient, "/api/orders", "/api/accounting");
        },
        onError: () => toast.error("更新失敗"),
      },
    );

  const active = orders?.filter((o) => o.status !== "已結案" && o.status !== "已取消") ?? [];
  const outstanding = orders?.filter((o) => o.status !== "已取消" && o.balance > 0) ?? [];
  const filtered = !!(search || status || unpaid);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">訂單管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">追蹤每筆訂單的製作進度與收款狀況。</p>
        </div>
        <Link href="/orders/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover-elevate">
          <Plus className="w-4 h-4" /> 新增訂單
        </Link>
      </div>

      {!filtered && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "進行中訂單", value: `${active.length} 筆`, sub: formatTWD(active.reduce((s, o) => s + o.total, 0)) },
            { label: "已收款", value: formatTWD(orders?.reduce((s, o) => s + o.paid_amount, 0) ?? 0), sub: "所有訂單累計" },
            { label: "待收款", value: formatTWD(outstanding.reduce((s, o) => s + o.balance, 0)), sub: `${outstanding.length} 筆尚未付清`, warn: outstanding.length > 0 },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border bg-card shadow-sm p-5">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className={`text-2xl font-bold mt-1 tabular-nums ${card.warn ? "text-rose-600" : ""}`}>
                {isLoading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 tabular-nums">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜尋客戶、訂單名稱或訂單編號..."
              className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
            >
              <option value="">所有狀態</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="h-10 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={unpaid} onChange={(e) => setUnpaid(e.target.checked)} className="accent-[hsl(var(--primary))]" />
              只看未付清
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
        ) : orders?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
            {filtered ? "沒有找到符合條件的訂單" : "還沒有訂單。可以從報價單轉入，或點右上角「新增訂單」"}
          </div>
        ) : (
          <>
            <div className="lg:hidden p-3 sm:p-4 grid gap-3 md:grid-cols-2">
              {orders?.map((o) => (
                <div key={o.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/orders/${o.id}`} className="font-medium text-foreground hover:text-primary">{o.title}</Link>
                      <div className="text-sm text-muted-foreground">{o.contact_name}</div>
                    </div>
                    <StatusMenu value={o.status} options={STATUSES} colors={ORDER_STATUS_COLOR} onChange={(s) => handleStatus(o.id, s)} />
                  </div>
                  <PaymentCell order={o} />
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
                    <span className="font-semibold tabular-nums">{formatTWD(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">訂單編號</th>
                    <th className="px-6 py-4 font-medium">訂單名稱</th>
                    <th className="px-6 py-4 font-medium">客戶</th>
                    <th className="px-6 py-4 font-medium text-right">金額</th>
                    <th className="px-6 py-4 font-medium">收款</th>
                    <th className="px-6 py-4 font-medium">交件日</th>
                    <th className="px-6 py-4 font-medium">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders?.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/orders/${o.id}`} className="font-mono text-xs text-primary hover:underline">{o.order_number}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/orders/${o.id}`} className="font-medium text-foreground hover:text-primary">{o.title}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {o.customer_id ? (
                          <Link href={`/customers/${o.customer_id}`} className="text-primary hover:underline">{o.contact_name}</Link>
                        ) : (
                          o.contact_name
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="font-semibold tabular-nums">{formatTWD(o.total)}</div>
                        {o.balance > 0 && o.status !== "已取消" && (
                          <div className="text-xs text-rose-600 tabular-nums">尚欠 {o.balance.toLocaleString("zh-TW")}</div>
                        )}
                      </td>
                      <td className="px-6 py-4"><PaymentCell order={o} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {o.delivery_date ? format(new Date(o.delivery_date), "yyyy/MM/dd") : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusMenu value={o.status} options={STATUSES} colors={ORDER_STATUS_COLOR} onChange={(s) => handleStatus(o.id, s)} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
