"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthTotal } from "@/lib/api-client";
import { formatTWD } from "@/lib/money";
import { INCOME_COLOR, EXPENSE_COLOR } from "../constants";

const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000) / 10}萬` : n.toLocaleString("zh-TW"));

export function MonthlyChart({
  months,
  selected,
  onSelect,
}: {
  months: MonthTotal[];
  selected: string;
  onSelect: (month: string) => void;
}) {
  const data = months.map((m) => ({ ...m, label: `${Number(m.month.slice(5))}月` }));

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: INCOME_COLOR }} />收入</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: EXPENSE_COLOR }} />支出</span>
        <span className="ml-auto">點長條可切換月份</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={2}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            onClick={(e) => {
              const i = e?.activeTooltipIndex;
              if (typeof i === "number" && data[i]) onSelect(data[i].month);
            }}
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={({ x, y, payload, index }) => (
                <text
                  x={x}
                  y={Number(y) + 12}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={data[index]?.month === selected ? 700 : 400}
                  fill={data[index]?.month === selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={compact} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const income = Number(payload.find((p) => p.dataKey === "income")?.value ?? 0);
                const expense = Number(payload.find((p) => p.dataKey === "expense")?.value ?? 0);
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md space-y-1 min-w-[10rem]">
                    <div className="font-medium text-foreground">{label}</div>
                    <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: INCOME_COLOR }} />收入</span><span className="tabular-nums">{formatTWD(income)}</span></div>
                    <div className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: EXPENSE_COLOR }} />支出</span><span className="tabular-nums">{formatTWD(expense)}</span></div>
                    <div className="flex justify-between gap-4 pt-1 border-t border-border font-medium"><span>淨利</span><span className="tabular-nums">{formatTWD(income - expense)}</span></div>
                  </div>
                );
              }}
            />
            <Bar dataKey="income" name="收入" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
            <Bar dataKey="expense" name="支出" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
