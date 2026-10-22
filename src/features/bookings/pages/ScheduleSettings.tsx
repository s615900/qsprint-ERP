"use client";

import { useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Link2, RotateCcw, Ban, Check } from "lucide-react";
import { addMonths, format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAvailabilityMonth,
  useSetAvailabilityOverrides,
  useListPhotographers,
  type MonthDay,
} from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { PERIODS } from "@/lib/periods";

const SHORT: Record<string, string> = { 早上: "早", 下午: "午", 晚上: "晚", 整天: "全天" };

// Public booking pages cache under their own keys, so refresh those too.
const AVAILABILITY_KEYS = ["/api/availability", "/api/bookings/availability", "/api/bookings/available-slots"];

const toggle = (list: string[], p: string) =>
  list.includes(p) ? list.filter((s) => s !== p) : PERIODS.filter((x) => x === p || list.includes(x));

function PeriodChips({ selected, onToggle, small }: { selected: string[]; onToggle: (p: string) => void; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PERIODS.map((p) => {
        const on = selected.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p)}
            aria-pressed={on}
            className={`${small ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm"} rounded-md border transition-colors ${
              on
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function DayCell({ day, selected, past, onClick }: { day: MonthDay; selected: boolean; past: boolean; onClick: () => void }) {
  const d = new Date(day.date + "T00:00:00");
  const closed = day.slots.length === 0;
  return (
    <button
      type="button"
      disabled={past}
      onClick={onClick}
      aria-pressed={selected}
      title={day.note ?? undefined}
      className={`relative min-h-[4.5rem] sm:min-h-[5.5rem] rounded-lg border p-1 sm:p-1.5 text-left flex flex-col gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        selected
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : closed
            ? "border-transparent bg-muted/60 hover:border-border"
            : "border-border bg-background hover:border-primary/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium tabular-nums ${d.getDay() === 0 || d.getDay() === 6 ? "text-primary" : ""}`}>
          {d.getDate()}
        </span>
        {day.is_custom && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="已設定開放" />}
      </div>
      {closed ? (
        <span className="text-xs text-muted-foreground">休</span>
      ) : (
        <div className="flex flex-wrap gap-0.5">
          {day.slots.map((p) => {
            const taken = day.booked.includes(p);
            const blocked = !taken && !day.bookable.includes(p);
            return (
              <span
                key={p}
                className={`text-[10px] sm:text-[11px] leading-none px-1 py-0.5 rounded ${
                  taken
                    ? "bg-foreground/80 text-background"
                    : blocked
                      ? "bg-muted text-muted-foreground/60 line-through"
                      : "bg-primary/15 text-primary"
                }`}
              >
                {SHORT[p] ?? p}
              </span>
            );
          })}
        </div>
      )}
      {day.note && <span className="hidden sm:block text-[10px] text-muted-foreground truncate mt-auto">{day.note}</span>}
    </button>
  );
}

function MonthCalendar({ staffId, staffName }: { staffId: number; staffName: string }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const { data: days, isLoading } = useGetAvailabilityMonth({ month: format(month, "yyyy-MM"), staff_id: staffId });
  const save = useSetAvailabilityOverrides();

  const [selected, setSelected] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([...PERIODS]);
  const [note, setNote] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");

  const changeMonth = (delta: number) => {
    setMonth((m) => addMonths(m, delta));
    setSelected([]);
  };

  const toggleDay = (day: MonthDay) => {
    const next = selected.includes(day.date) ? selected.filter((d) => d !== day.date) : [...selected, day.date].sort();
    setSelected(next);
    // Picking a single day loads its current setting so it can be tweaked.
    if (next.length === 1) {
      const only = days?.find((d) => d.date === next[0]);
      if (only) {
        setPeriods(only.slots.length ? only.slots : [...PERIODS]);
        setNote(only.note ?? "");
      }
    }
  };

  const selectWhere = (pred: (d: Date) => boolean) =>
    setSelected(days?.filter((d) => d.date >= today && pred(new Date(d.date + "T00:00:00"))).map((d) => d.date) ?? []);

  const apply = (slots: string[] | null, done: string) =>
    save.mutate(
      { data: { staff_id: staffId, dates: selected, slots, note: slots === null ? null : note.trim() || null } },
      {
        onSuccess: () => {
          toast.success(done);
          setSelected([]);
          setNote("");
          invalidateApi(queryClient, ...AVAILABILITY_KEYS);
        },
        onError: () => toast.error("儲存失敗"),
      },
    );

  // Leading blanks so the 1st lands under its weekday (Sunday-first, like the public calendar).
  const lead = month.getDay();
  const bookedInSelection = days?.filter((d) => selected.includes(d.date) && d.booked.length > 0).length ?? 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="p-5 sm:p-6 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2"><CalendarRange className="w-5 h-5 text-primary" /> {staffName} 的開放日期</h2>
        <p className="text-sm text-muted-foreground mt-1">點日期可以多選，再設定這些天開放的時段。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem]">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={month <= startOfMonth(new Date())}
              aria-label="上個月"
              className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold">{format(month, "yyyy 年 M 月")}</span>
            <button type="button" onClick={() => changeMonth(1)} aria-label="下個月" className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { label: "選整個月", pred: () => true },
              { label: "選平日", pred: (d: Date) => d.getDay() >= 1 && d.getDay() <= 5 },
              { label: "選週末", pred: (d: Date) => d.getDay() === 0 || d.getDay() === 6 },
            ].map((b) => (
              <button key={b.label} type="button" onClick={() => selectWhere(b.pred)} className="h-7 px-2.5 rounded-full border border-input bg-background hover:bg-accent">
                {b.label}
              </button>
            ))}
            {selected.length > 0 && (
              <button type="button" onClick={() => setSelected([])} className="h-7 px-2.5 rounded-full text-muted-foreground hover:text-foreground">
                清除選取
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs text-muted-foreground">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          {isLoading || !days ? (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {[...Array(35)].map((_, i) => <div key={i} className="min-h-[4.5rem] sm:min-h-[5.5rem] rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {[...Array(lead)].map((_, i) => <div key={`lead-${i}`} />)}
              {days.map((day) => (
                <DayCell key={day.date} day={day} past={day.date < today} selected={selected.includes(day.date)} onClick={() => toggleDay(day)} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="px-1 rounded bg-primary/15 text-primary">早</span>可預約</span>
            <span className="flex items-center gap-1.5"><span className="px-1 rounded bg-foreground/80 text-background">早</span>已被預約</span>
            <span className="flex items-center gap-1.5"><span className="px-1 rounded bg-muted text-muted-foreground/60 line-through">全天</span>被同天其他預約擋住</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />已設定開放</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-border bg-muted/20 lg:rounded-br-xl space-y-4">
          {selected.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center lg:text-left leading-relaxed">
              先點選要設定的日期。
              <br />
              沒有設定的日子不開放預約。
            </div>
          ) : (
            <>
              <div>
                <div className="font-medium">已選 {selected.length} 天</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {selected.slice(0, 6).map((d) => format(new Date(d + "T00:00:00"), "M/d")).join("、")}
                  {selected.length > 6 && "…等"}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">開放時段</span>
                <PeriodChips selected={periods} onToggle={(p) => setPeriods((l) => toggle(l, p))} />
                <p className="text-xs text-muted-foreground">同一天「整天」和早上／下午／晚上只能被訂走其中一種。</p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">備註（選填，只有後台看得到）</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例：國慶連假、外拍"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              {bookedInSelection > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
                  其中 {bookedInSelection} 天已經有人預約。改設定不會取消既有預約，只影響之後的新預約。
                </p>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={save.isPending || periods.length === 0}
                  onClick={() => apply(periods, `已設定 ${selected.length} 天的開放時段`)}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                >
                  <Check className="w-4 h-4" /> 開放所選時段
                </button>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => apply([], `已將 ${selected.length} 天設為公休`)}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" /> 設為公休
                </button>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => apply(null, "已清除設定（不開放）")}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 清除設定（不開放）
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Open-date calendar for one photographer. Shared by the admin page and the photographer's own page.
export function StaffScheduleEditor({ staffId, staffName }: { staffId: number; staffName: string; compact?: boolean }) {
  return (
    <>
      {/* key: switching photographer starts with a clean selection */}
      <MonthCalendar key={`cal-${staffId}`} staffId={staffId} staffName={staffName} />
    </>
  );
}

function CopyLinkButton({ staffId, staffName }: { staffId: number; staffName: string }) {
  const copy = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}/schedule-link`);
      if (!res.ok) throw new Error();
      const { path } = (await res.json()) as { path: string };
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success(`已複製 ${staffName} 的個人排班連結，傳給他就能自己排時間`);
    } catch {
      toast.error("複製失敗");
    }
  };
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-input bg-card text-sm hover:bg-accent">
      <Link2 className="w-4 h-4" /> 複製 {staffName} 的個人排班連結
    </button>
  );
}

export function ScheduleSettings() {
  const { data: photographers, isLoading: loadingStaff } = useListPhotographers();
  const [picked, setPicked] = useState<number | null>(null);
  const staff = photographers?.find((p) => p.id === picked) ?? photographers?.[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">開放時段</h1>
        <p className="text-muted-foreground mt-1 text-sm">由攝影師自行排開放的日期與時段（早上、下午、晚上、整天），客人選了攝影師後只會看到他開放的時間。總管理員可在此查看並隨時修改。</p>
      </div>

      {loadingStaff ? (
        <div className="h-12 bg-muted animate-pulse rounded-xl" />
      ) : !staff ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          還沒有在職的攝影師。請先到「人員管理」新增職務為「攝影師」的人員。
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="選擇攝影師">
            {photographers?.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === staff.id}
                onClick={() => setPicked(p.id)}
                className={`h-10 px-4 rounded-full border text-sm font-medium transition-colors flex items-center gap-2 ${
                  p.id === staff.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/50"
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${p.id === staff.id ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {p.name.charAt(0)}
                </span>
                {p.name}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>攝影師可以用「個人排班連結」自己排時間；這裡會即時看到他們的設定，您也能隨時代為修改。</span>
            <CopyLinkButton staffId={staff.id} staffName={staff.name} />
          </div>
          <StaffScheduleEditor compact staffId={staff.id} staffName={staff.name} />
        </>
      )}
    </div>
  );
}
