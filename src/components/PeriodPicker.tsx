"use client";

import { periodOf } from "@/lib/tax";
import { filterSelectCls } from "@/lib/ui";

// Picks one of the six two-month business-tax periods. Value is YYYY-MM of the first month.
export function PeriodPicker({ value, onChange }: { value: string; onChange: (period: string) => void }) {
  const [year, month] = value.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear + 1 - i);
  if (!years.includes(year)) years.push(year);
  const set = (y: number, m: number) => onChange(`${y}-${String(m).padStart(2, "0")}`);

  return (
    <div className="flex items-center gap-2">
      <select aria-label="年度" value={year} onChange={(e) => set(Number(e.target.value), month)} className={filterSelectCls}>
        {years.sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y - 1911} 年</option>)}
      </select>
      <select aria-label="期別" value={month} onChange={(e) => set(year, Number(e.target.value))} className={filterSelectCls}>
        {[1, 3, 5, 7, 9, 11].map((m) => <option key={m} value={m}>{m}-{m + 1} 月</option>)}
      </select>
    </div>
  );
}

export const currentPeriod = () => periodOf(new Date().toISOString().slice(0, 10));
