"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Plus, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { useListContracts, type ListContractsParams } from "@/lib/api-client";
import { formatTWD } from "@/lib/money";
import { CONTRACT_STATUSES, displayContractStatus } from "@/lib/contractStatus";
import { btnPrimaryLg, cardCls } from "@/lib/ui";

export function ContractList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const params: ListContractsParams = {};
  if (search) params.search = search;
  if (status) params.status = status as ListContractsParams["status"];
  const { data: contracts, isLoading } = useListContracts(params);

  const waitingCustomer = contracts?.filter((c) => c.status === "已發送" && !c.customer_signed_at) ?? [];
  const waitingStudio = contracts?.filter((c) => c.customer_signed_at && !c.staff_signed_at && c.status !== "作廢" && c.status !== "已結案") ?? [];
  const signed = contracts?.filter((c) => c.status === "已簽約") ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">合約管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">由報價單產生合約，傳連結給客戶線上簽名，雙方簽署後自動生效。</p>
        </div>
        <Link href="/contracts/new" className={btnPrimaryLg}>
          <Plus className="w-4 h-4" /> 新增合約
        </Link>
      </div>

      {!status && !search && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "等待客戶簽署", value: waitingCustomer.length },
            { label: "等待工作室簽署", value: waitingStudio.length },
            { label: "已簽約", value: signed.length, sub: formatTWD(signed.reduce((s, c) => s + c.total, 0)) },
          ].map((card) => (
            <div key={card.label} className={`${cardCls} p-5`}>
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-2xl font-bold mt-1">{isLoading ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : `${card.value} 份`}</div>
              {card.sub && <div className="text-xs text-muted-foreground mt-1 tabular-nums">{card.sub}</div>}
            </div>
          ))}
        </div>
      )}

      <div className={`${cardCls} flex flex-col`}>
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜尋客戶、合約名稱或合約編號..."
              className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">所有狀態</option>
            {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
        ) : contracts?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <FileSignature className="w-10 h-10 text-muted-foreground/40" />
            {status || search ? "沒有找到符合條件的合約" : "還沒有合約，到報價單頁按「建立合約」，或點右上角「新增合約」"}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {contracts?.map((c) => {
              const st = displayContractStatus(c);
              return (
                <li key={c.id}>
                  <Link href={`/contracts/${c.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{c.contract_number}</span>・{c.contact_name}
                        {c.quote_number && <>・來自 {c.quote_number}</>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.start_date ? `${format(new Date(c.start_date), "yyyy/MM/dd")} 起` : format(new Date(c.created_at), "yyyy/MM/dd") + " 建立"}
                    </div>
                    <div className="font-semibold tabular-nums whitespace-nowrap sm:w-28 sm:text-right">{formatTWD(c.total)}</div>
                    <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-medium border ${st.color}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
