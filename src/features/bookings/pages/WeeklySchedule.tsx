"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useListBookings } from "@/lib/api-client";
import { startOfWeek, addDays, format, isSameDay, addWeeks } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { slotSortKey } from "@/lib/periods";

export function WeeklySchedule() {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // No date-range filter on the API yet — fetch everything and slice the week
  // client-side, same "local data, no calendar sync" approach used elsewhere.
  const { data: bookings, isLoading } = useListBookings({}, {
    query: { queryKey: ["/api/bookings", {}] }
  });

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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> 返回預約管理
          </Link>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">本週檔期</h1>
          <p className="text-muted-foreground mt-1 text-sm">依日期分組檢視本週所有預約排程。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium transition-colors"
          >
            本週
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground font-medium">
        {format(days[0], 'yyyy/MM/dd')} – {format(days[6], 'yyyy/MM/dd')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        {days.map(day => {
          const dayBookings = (bookings ?? [])
            .filter(b => isSameDay(new Date(b.date), day))
            .sort((a, b) => slotSortKey(a.time_slot).localeCompare(slotSortKey(b.time_slot)));
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()} className={`rounded-xl border bg-card shadow-sm flex flex-col min-h-[160px] ${isToday ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}>
              <div className={`px-3 py-2.5 border-b border-border flex items-center justify-between rounded-t-xl ${isToday ? 'bg-primary/5' : 'bg-muted/30'}`}>
                <span className="text-sm font-semibold text-foreground">{format(day, 'EEE', { locale: zhTW })}</span>
                <span className={`text-xs tabular-nums ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{format(day, 'M/d')}</span>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {isLoading ? (
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                ) : dayBookings.length === 0 ? (
                  <div className="text-xs text-muted-foreground/60 text-center py-6">無預約</div>
                ) : (
                  dayBookings.map(b => (
                    <Link
                      key={b.id}
                      href={b.customer_id ? `/customers/${b.customer_id}` : "/bookings"}
                      className="block p-2 rounded-lg border border-border/70 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Clock className="w-3 h-3" /> {b.time_slot}
                      </div>
                      <div className="text-sm font-medium text-foreground mt-0.5 truncate">{b.customer_name || '未命名'}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{b.service_type}</div>
                      <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && (bookings ?? []).every(b => !days.some(d => isSameDay(new Date(b.date), d))) && (
        <div className="text-center text-sm text-muted-foreground py-8 flex flex-col items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-muted-foreground/40" />
          本週尚無任何預約
        </div>
      )}
    </div>
  );
}
