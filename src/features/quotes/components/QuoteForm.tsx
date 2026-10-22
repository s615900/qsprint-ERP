"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, User, ListChecks, FileText } from "lucide-react";
import { addDays, format } from "date-fns";
import type { LineItem, Quote, QuoteInput } from "@/lib/api-client";
import { CustomerPicker } from "@/components/CustomerPicker";
import { LineItemsEditor, emptyItem } from "@/components/LineItemsEditor";
import type { TaxModeValue } from "@/lib/money";
import { TERMS_TEMPLATES, htmlToText } from "@/lib/contractTemplates";

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function QuoteForm({
  initial,
  heading,
  subheading,
  backHref,
  submitLabel,
  isPending,
  onSubmit,
}: {
  initial?: Quote;
  heading: string;
  subheading: string;
  backHref: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (data: QuoteInput) => void;
}) {
  const [customerId, setCustomerId] = useState<number | null>(initial?.customer_id ?? null);
  const [contactName, setContactName] = useState(initial?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [items, setItems] = useState<LineItem[]>(initial?.items.length ? initial.items : [emptyItem()]);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [validUntil, setValidUntil] = useState(
    initial ? (initial.valid_until ?? "") : format(addDays(new Date(), 14), "yyyy-MM-dd"),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [taxMode, setTaxMode] = useState<TaxModeValue>((initial?.tax_mode as TaxModeValue) ?? "含稅");
  const [taxRate, setTaxRate] = useState(initial?.tax_rate ?? 5);
  const [terms, setTerms] = useState(initial?.terms ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customer_id: customerId,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim() || null,
      title: title.trim(),
      items: items.map((i) => ({ ...i, name: i.name.trim(), description: i.description?.trim() || null })),
      discount,
      tax_mode: taxMode,
      tax_rate: taxRate,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{heading}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{subheading}</p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <User className="w-5 h-5 text-primary" /> 客戶資料
            </h2>
            <CustomerPicker
              onSelect={(c) => {
                setCustomerId(c.id);
                setContactName(c.name);
                setContactPhone(c.phone);
                setContactEmail(c.email ?? "");
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  聯絡人姓名 <span className="text-destructive">*</span>
                </label>
                <input value={contactName} onChange={(e) => { setContactName(e.target.value); setCustomerId(null); }} className={inputCls} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  聯絡電話 <span className="text-destructive">*</span>
                </label>
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
              </div>
            </div>
            {customerId && (
              <p className="text-xs text-muted-foreground">已連結客戶資料（修改姓名會取消連結）</p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <ListChecks className="w-5 h-5 text-primary" /> 報價內容
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium leading-none">
                  報價主旨 <span className="text-destructive">*</span>
                </label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：王小明 & 林小美 婚紗拍攝" className={inputCls} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">有效期限</label>
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
              </div>
            </div>
            <LineItemsEditor
              items={items}
              onItemsChange={setItems}
              discount={discount}
              onDiscountChange={setDiscount}
              tax={{ mode: taxMode, rate: taxRate, onModeChange: setTaxMode, onRateChange: setTaxRate }}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <FileText className="w-5 h-5 text-primary" /> 備註與條款
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="例：簽約時支付 30% 訂金，交件時付清尾款。"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium leading-none">客戶需同意的條款（簽署時顯示）</label>
                <button
                  type="button"
                  onClick={() => setTerms(htmlToText(TERMS_TEMPLATES[0].html))}
                  className="text-xs text-primary hover:underline"
                >
                  套用範本：{TERMS_TEMPLATES[0].name}
                </button>
              </div>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="例：改期、取消、著作權與交件時程等條款。客戶線上簽名時需勾選同意。"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 hover-elevate shadow-sm"
            >
              {isPending ? "儲存中..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
