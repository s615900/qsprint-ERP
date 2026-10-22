"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useListCustomers, CustomerCategory, CustomerMemberTier } from "@/lib/api-client";
import { Search, UserPlus, Phone, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

type SortKey = "created_at_desc" | "created_at_asc" | "name_asc" | "name_desc";
const PAGE_SIZE = 10;

export function CustomerList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CustomerCategory | "">("");
  const [memberTier, setMemberTier] = useState<CustomerMemberTier | "">("");
  const [tag, setTag] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at_desc");
  const [page, setPage] = useState(1);

  // Params without `tag` — used to build the set of available tag filter options
  // so the dropdown always reflects the full pool, not just the currently-filtered result.
  const baseParams: any = {};
  if (search) baseParams.search = search;
  if (category) baseParams.category = category;
  if (memberTier) baseParams.member_tier = memberTier;

  const params: any = { ...baseParams };
  if (tag) params.tag = tag;

  const { data: tagPool } = useListCustomers(baseParams, {
    query: { queryKey: ["/api/customers", baseParams] }
  });
  const { data: customers, isLoading } = useListCustomers(params, {
    query: { queryKey: ["/api/customers", params] }
  });

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    tagPool?.forEach(c => c.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [tagPool]);

  const sorted = useMemo(() => {
    const list = customers ? [...customers] : [];
    switch (sortKey) {
      case "created_at_asc":
        return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
      case "name_desc":
        return list.sort((a, b) => b.name.localeCompare(a.name, "zh-Hant"));
      case "created_at_desc":
      default:
        return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }, [customers, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever the filtered/sorted result set changes underneath the current page
  useEffect(() => {
    setPage(1);
  }, [search, category, memberTier, tag, sortKey]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">客戶管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理您的所有客戶資料與分類。</p>
        </div>
        <Link href="/customers/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover-elevate">
          <UserPlus className="w-4 h-4" />
          新增客戶
        </Link>
      </div>

      <div className="bg-card rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜尋姓名、電話或客戶編號..."
                className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap [&_select]:w-full sm:[&_select]:w-auto">
              <select 
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="">所有類別</option>
                {Object.values(CustomerCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={memberTier}
                onChange={(e) => setMemberTier(e.target.value as any)}
              >
                <option value="">所有等級</option>
                {Object.values(CustomerMemberTier).map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="">所有標籤</option>
                {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  className="h-10 pl-8 pr-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                >
                  <option value="created_at_desc">建立時間（新到舊）</option>
                  <option value="created_at_asc">建立時間（舊到新）</option>
                  <option value="name_asc">姓名（A-Z）</option>
                  <option value="name_desc">姓名（Z-A）</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile / tablet: card list */}
        <div className="lg:hidden p-3 sm:p-4">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : pageItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">沒有找到符合條件的客戶</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pageItems.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="block rounded-lg border border-border bg-background p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20">
                        {customer.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{customer.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{customer.customer_number}</div>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      customer.member_tier === 'VVIP' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      customer.member_tier === 'VIP' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {customer.member_tier}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {customer.phone}
                    </span>
                    <span className="text-xs tabular-nums">{format(new Date(customer.created_at), 'yyyy/MM/dd')}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                      {customer.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground border border-border">
                      {customer.source}
                    </span>
                    {customer.tags?.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">客戶編號</th>
                <th className="px-6 py-4 font-medium">客戶</th>
                <th className="px-6 py-4 font-medium">聯絡方式</th>
                <th className="px-6 py-4 font-medium">類別與等級</th>
                <th className="px-6 py-4 font-medium">客源</th>
                <th className="px-6 py-4 font-medium">標籤</th>
                <th className="px-6 py-4 font-medium text-right">建立日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    沒有找到符合條件的客戶
                  </td>
                </tr>
              ) : (
                pageItems.map((customer, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={customer.id}
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {customer.customer_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20 group-hover:bg-primary/20 transition-colors">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                          {customer.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          customer.member_tier === 'VVIP' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          customer.member_tier === 'VIP' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {customer.member_tier}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {customer.source}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags?.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                            {t}
                          </span>
                        ))}
                        {(customer.tags?.length || 0) > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                            +{customer.tags!.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                      {format(new Date(customer.created_at), 'yyyy/MM/dd')}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-border text-sm text-muted-foreground">
            <span>
              共 {sorted.length} 位客戶，第 {page} / {totalPages} 頁
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
