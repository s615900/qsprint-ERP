"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Calendar as CalendarIcon, ArrowRight, UserPlus, FilePlus } from "lucide-react";
import { useGetDashboardSummary, useGetDashboardRecentBookings, useGetDashboardRecentCustomers } from "@/lib/api-client";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function Dashboard() {
  const router = useRouter();
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: recentBookings, isLoading: isBookingsLoading } = useGetDashboardRecentBookings();
  const { data: recentCustomers, isLoading: isCustomersLoading } = useGetDashboardRecentCustomers();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">儀表板</h1>
          <p className="text-muted-foreground mt-1 text-sm">歡迎回到青春止秒攝影工作室，這是您今天的工作室概況。</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/customers/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 hover-elevate">
            <UserPlus className="w-4 h-4" />
            新增客戶
          </Link>
          <Link href="/bookings/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover-elevate">
            <FilePlus className="w-4 h-4" />
            新增預約
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "今日預約", value: summary?.todayBookings ?? 0, icon: CalendarIcon, color: "text-amber-600", bg: "bg-amber-100" },
          { label: "本月新客戶", value: summary?.monthNewCustomers ?? 0, icon: Users, color: "text-teal-600", bg: "bg-teal-100" },
          { label: "總客戶數", value: summary?.totalCustomers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "總預約數", value: summary?.totalBookings ?? 0, icon: CalendarIcon, color: "text-indigo-600", bg: "bg-indigo-100" },
        ].map((card, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 hover-elevate transition-shadow">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{card.label}</h3>
              <div className={`w-8 h-8 rounded-full ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold">
              {isSummaryLoading ? <div className="h-9 w-16 bg-muted animate-pulse rounded" /> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col">
          <div className="flex flex-col space-y-1.5 p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold leading-none tracking-tight">近期預約</h3>
              <Link href="/bookings" className="text-xs text-primary hover:underline flex items-center gap-1">
                查看全部 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="p-0 flex-1">
            {isBookingsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentBookings?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">目前沒有近期預約</div>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentBookings?.map((booking, i) => (
                  <motion.li 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={booking.id} 
                    className="p-4 sm:p-6 hover:bg-muted/30 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex flex-col items-center justify-center text-secondary-foreground border border-border shrink-0">
                        <span className="text-xs font-medium">{format(new Date(booking.date), 'MMM')}</span>
                        <span className="text-lg font-bold leading-none">{format(new Date(booking.date), 'd')}</span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{booking.customer_name || '未命名客戶'}</div>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{booking.time_slot}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{booking.service_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={booking.status} />
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col">
          <div className="flex flex-col space-y-1.5 p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold leading-none tracking-tight">近期客戶</h3>
              <Link href="/customers" className="text-xs text-primary hover:underline flex items-center gap-1">
                查看全部 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="p-0 flex-1">
            {isCustomersLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentCustomers?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">目前沒有近期新增客戶</div>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentCustomers?.map((customer, i) => (
                  <motion.li 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={customer.id} 
                    className="p-4 sm:p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <Link href={`/customers/${customer.id}`} className="absolute inset-0 z-0" />
                    <div className="flex items-center gap-4 relative z-10 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold border border-primary/20 shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{customer.name}</div>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{customer.phone}</span>
                          {customer.tags && customer.tags.length > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{customer.tags[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10 pointer-events-none text-right flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                        {customer.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(customer.created_at), 'yyyy-MM-dd')}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case '諮詢': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '已預約': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '已拍攝': return 'bg-slate-100 text-slate-700 border-slate-200';
      case '修圖中': return 'bg-orange-100 text-orange-700 border-orange-200';
      case '交件': return 'bg-teal-100 text-teal-700 border-teal-200';
      case '結案': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}
