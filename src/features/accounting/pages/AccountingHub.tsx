"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ReceiptText, ClipboardList, FileCheck2, ListOrdered } from "lucide-react";
import { Accounting } from "./Accounting";
import { InvoiceList } from "@/features/invoices/pages/InvoiceList";
import { Purchases } from "@/features/tax/pages/Purchases";
import { TaxReport } from "@/features/tax/pages/TaxReport";
import { InvoiceTracks } from "@/features/invoices/pages/InvoiceTracks";

const TABS = [
  { key: "ledger", label: "收支記帳", icon: BookOpen, view: Accounting },
  { key: "invoices", label: "發票管理", icon: ReceiptText, view: InvoiceList },
  { key: "purchases", label: "進項憑證", icon: ClipboardList, view: Purchases },
  { key: "tax", label: "營業稅申報（401）", icon: FileCheck2, view: TaxReport },
  { key: "tracks", label: "字軌配號", icon: ListOrdered, view: InvoiceTracks },
] as const;

export function AccountingHub() {
  const router = useRouter();
  const param = useSearchParams().get("tab");
  const current = TABS.find((t) => t.key === param) ?? TABS[0];
  const View = current.view;

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border print:hidden max-w-6xl mx-auto">
        {TABS.map((t) => {
          const active = t.key === current.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => router.replace(t.key === "ledger" ? "/accounting" : `/accounting?tab=${t.key}`, { scroll: false })}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <View />
    </div>
  );
}
