"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCompanySettings, useUpdateCompanySettings, type CompanySettings } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { inputCls, btnPrimary, cardCls } from "@/lib/ui";

const FIELDS: { key: keyof Omit<CompanySettings, "tax_rate">; label: string; placeholder?: string; maxLength?: number; span?: boolean }[] = [
  { key: "name", label: "營業人名稱", placeholder: "例：青春止秒攝影工作室" },
  { key: "owner", label: "負責人" },
  { key: "tax_id", label: "統一編號", placeholder: "8 碼", maxLength: 8 },
  { key: "tax_reg_number", label: "稅籍編號", placeholder: "9 碼，在營業稅繳款書上", maxLength: 9 },
  { key: "phone", label: "電話" },
  { key: "email", label: "Email" },
  { key: "address", label: "營業地址", span: true },
  { key: "bank_account", label: "收款帳號（顯示於報價與合約）", span: true },
];

export function CompanyForm() {
  const { data, isLoading } = useGetCompanySettings();
  return (
    <section className={`${cardCls} p-6`}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Building2 className="w-5 h-5" /></div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">營業人資料</h2>
          <p className="text-sm text-muted-foreground mt-1">會印在合約與發票上，也是營業稅 401 申報書的抬頭，開發票前請先填好。</p>
        </div>
      </div>
      {isLoading || !data ? <div className="h-48 bg-muted animate-pulse rounded" /> : <Form initial={data} />}
    </section>
  );
}

function Form({ initial }: { initial: CompanySettings }) {
  const queryClient = useQueryClient();
  const update = useUpdateCompanySettings();
  const [form, setForm] = useState<CompanySettings>(initial);
  const set = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          { data: form },
          {
            onSuccess: () => { toast.success("營業人資料已儲存"); invalidateApi(queryClient, "/api/company-settings", "/api/tax"); },
            onError: (err) => toast.error(apiErrorMessage(err, "儲存失敗")),
          },
        );
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <label key={f.key} className={`space-y-1.5 ${f.span ? "md:col-span-2" : ""}`}>
            <span className="text-sm font-medium">{f.label}</span>
            <input
              className={inputCls}
              value={form[f.key]}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
        <label className="space-y-1.5">
          <span className="text-sm font-medium">營業稅率（%）</span>
          <input type="number" min={0} max={100} className={inputCls} value={form.tax_rate} onChange={(e) => set("tax_rate", Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
          <span className="text-xs text-muted-foreground">一般營業人為 5%，用於發票拆分銷售額與稅額。</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={update.isPending} className={`${btnPrimary} h-10 px-5`}>{update.isPending ? "儲存中..." : "儲存"}</button>
      </div>
    </form>
  );
}
