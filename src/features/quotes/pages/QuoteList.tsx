"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListQuotes, useUpdateQuote, QuoteStatus, type ListQuotesParams, type Quote } from "@/lib/api-client";
import { StatusMenu } from "@/components/StatusMenu";
import { formatTWD } from "@/lib/money";
import { invalidateApi } from "@/lib/invalidate";
import { QUOTE_STATUS_COLOR, isExpired } from "../constants";

const STATUSES = Object.values(QuoteStatus);

export function QuoteList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const queryClient = useQueryClient();

  const params: ListQuotesParams = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const { data: quotes, isLoading } = useListQuotes(params);
  const updateQuote = useUpdateQuote();

  const handleStatus = (id: number, s: QuoteStatus) =>
    updateQuote.mutate(
      { id, data: { status: s } },
      {
        onSuccess: () => {
          toast.success("狀態已更新");
          invalidateApi(queryClient, "/api/quotes");
        },
        onError: () => toast.error("更新失敗"),
      },
    );

  const pending = quotes?.filter((q) => q.status === "已送出") ?? [];
  const accepted = quotes?.filter((q) => q.status === "已接受") ?? [];

  const validity = (q: Quote) =>
    q.valid_until ? (
      <span className={isExpired(q) ? "text-destructive" : undefined}>
        {format(new Date(q.valid_until), "yyyy/MM/dd")}
        {isExpired(q) && "（已逾期）"}
      </span>
    ) : (
      "-"
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">報價系統</h1>
          <p className="text-muted-foreground mt-1 text-sm">建立報價單、追蹤客戶回覆，成交後一鍵轉為訂單。</p>
        </div>
        <Link href="/quotes/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover-elevate">
          <Plus className="w-4 h-4" /> 新增報價單
        </Link>
      </div>

      {!status && !search && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "等待客戶回覆", value: `${pending.length} 張`, sub: formatTWD(pending.reduce((s, q) => s + q.total, 0)) },
            { label: "已成交", value: `${accepted.length} 張`, sub: formatTWD(accepted.reduce((s, q) => s + q.total, 0)) },
            {
              label: "成交率",
              value: (() => {
                const decided = quotes?.filter((q) => q.status === "已接受" || q.status === "已拒絕").length ?? 0;
                return decided ? `${Math.round((accepted.length / decided) * 100)}%` : "-";
              })(),
              sub: "已接受 ÷（已接受＋已拒絕）",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border bg-card shadow-sm p-5">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-2xl font-bold mt-1">{isLoading ? <div className="h-8 w-20 bg-muted animate-pulse rounded" /> : card.value}</div>
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
              placeholder="搜尋客戶、主旨或報價單號..."
              className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus | "")}
          >
            <option value="">所有狀態</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
        ) : quotes?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-muted-foreground/40" />
            {status || search ? "沒有找到符合條件的報價單" : "還沒有報價單，點右上角「新增報價單」開始"}
          </div>
        ) : (
          <>
            {/* Mobile / tablet: cards */}
            <div className="lg:hidden p-3 sm:p-4 grid gap-3 md:grid-cols-2">
              {quotes?.map((q) => (
                <div key={q.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-foreground hover:text-primary">{q.title}</Link>
                    <StatusMenu value={q.status} options={STATUSES} colors={QUOTE_STATUS_COLOR} onChange={(s) => handleStatus(q.id, s)} />
                  </div>
                  <div className="text-sm text-muted-foreground">{q.contact_name}</div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{q.quote_number}</span>
                    <span className="font-semibold tabular-nums">{formatTWD(q.total)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">有效期限 {validity(q)}</div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">報價單號</th>
                    <th className="px-6 py-4 font-medium">主旨</th>
                    <th className="px-6 py-4 font-medium">客戶</th>
                    <th className="px-6 py-4 font-medium text-right">金額</th>
                    <th className="px-6 py-4 font-medium">有效期限</th>
                    <th className="px-6 py-4 font-medium">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quotes?.map((q, i) => (
                    <motion.tr
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/quotes/${q.id}`} className="font-mono text-xs text-primary hover:underline">{q.quote_number}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/quotes/${q.id}`} className="font-medium text-foreground hover:text-primary">{q.title}</Link>
                        <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(q.created_at), "yyyy/MM/dd")} 建立</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {q.customer_id ? (
                          <Link href={`/customers/${q.customer_id}`} className="text-primary hover:underline">{q.contact_name}</Link>
                        ) : (
                          q.contact_name
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums whitespace-nowrap">{formatTWD(q.total)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{validity(q)}</td>
                      <td className="px-6 py-4">
                        <StatusMenu value={q.status} options={STATUSES} colors={QUOTE_STATUS_COLOR} onChange={(s) => handleStatus(q.id, s)} />
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
