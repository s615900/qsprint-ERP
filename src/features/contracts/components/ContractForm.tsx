"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, User, ListChecks, ScrollText } from "lucide-react";
import type { Contract, ContractInput, LineItem } from "@/lib/api-client";
import { CustomerPicker } from "@/components/CustomerPicker";
import { LineItemsEditor, emptyItem } from "@/components/LineItemsEditor";
import { RichEditor } from "@/components/RichEditor";
import { NDA_TEMPLATES, TERMS_TEMPLATES } from "@/lib/contractTemplates";
import type { TaxModeValue } from "@/lib/money";
import { inputCls, textareaCls, btnOutline, btnPrimaryLg } from "@/lib/ui";

// Rich-text clause with a "load template" button. The editor is uncontrolled, so
// applying a template remounts it through a new key.
function ClauseEditor({
  label,
  html,
  onChange,
  templates,
}: {
  label: string;
  html: string;
  onChange: (html: string) => void;
  templates: { key: string; name: string; html: string }[];
}) {
  const [version, setVersion] = useState(0);
  const [initial, setInitial] = useState(html);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium leading-none">{label}</label>
        <select
          value=""
          onChange={(e) => {
            const t = templates.find((x) => x.key === e.target.value);
            if (!t) return;
            if (html.trim() && !confirm("套用範本會取代目前的內容，確定嗎？")) return;
            setInitial(t.html);
            onChange(t.html);
            setVersion((v) => v + 1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">套用範本…</option>
          {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
      </div>
      <RichEditor key={version} initialHtml={initial} onChange={onChange} />
    </div>
  );
}

export function ContractForm({
  initial,
  heading,
  subheading,
  backHref,
  submitLabel,
  isPending,
  onSubmit,
}: {
  initial?: Contract;
  heading: string;
  subheading: string;
  backHref: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (data: ContractInput) => void;
}) {
  const [customerId, setCustomerId] = useState<number | null>(initial?.customer_id ?? null);
  const [contactName, setContactName] = useState(initial?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "");
  const [taxId, setTaxId] = useState(initial?.tax_id ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [items, setItems] = useState<LineItem[]>(initial?.items.length ? initial.items : [emptyItem()]);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [taxMode, setTaxMode] = useState<TaxModeValue>((initial?.tax_mode as TaxModeValue) ?? "含稅");
  const [taxRate, setTaxRate] = useState(initial?.tax_rate ?? 5);
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [nda, setNda] = useState(initial?.nda ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customer_id: customerId,
      quote_id: initial?.quote_id ?? null,
      order_id: initial?.order_id ?? null,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim() || null,
      tax_id: taxId.trim() || null,
      address: address.trim() || null,
      title: title.trim(),
      items: items.map((i) => ({ ...i, name: i.name.trim(), description: i.description?.trim() || null })),
      discount,
      tax_mode: taxMode,
      tax_rate: taxRate,
      start_date: startDate || null,
      end_date: endDate || null,
      terms: terms || null,
      nda: nda || null,
      notes: notes.trim() || null,
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
              <User className="w-5 h-5 text-primary" /> 委託方（甲方）
            </h2>
            <CustomerPicker
              onSelect={(c) => {
                setCustomerId(c.id);
                setContactName(c.company_name || c.name);
                setContactPhone(c.phone);
                setContactEmail(c.email ?? "");
                setTaxId(c.tax_id ?? "");
                setAddress(c.address ?? "");
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium leading-none">甲方名稱 / 聯絡人 <span className="text-destructive">*</span></span>
                <input value={contactName} onChange={(e) => { setContactName(e.target.value); setCustomerId(null); }} className={inputCls} required />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium leading-none">聯絡電話 <span className="text-destructive">*</span></span>
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} required />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium leading-none">Email</span>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium leading-none">統一編號</span>
                <input value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={8} inputMode="numeric" className={inputCls} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium leading-none">地址</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <ListChecks className="w-5 h-5 text-primary" /> 合約內容
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2 md:col-span-3">
                <span className="text-sm font-medium leading-none">合約名稱 <span className="text-destructive">*</span></span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：王小明 & 林小美 婚紗攝影服務合約" className={inputCls} required />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium leading-none">合約起日</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium leading-none">合約迄日</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </label>
            </div>
            <LineItemsEditor
              items={items}
              onItemsChange={setItems}
              discount={discount}
              onDiscountChange={setDiscount}
              tax={{ mode: taxMode, rate: taxRate, onModeChange: setTaxMode, onRateChange: setTaxRate }}
            />
          </div>

          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <ScrollText className="w-5 h-5 text-primary" /> 條款
            </h2>
            <ClauseEditor label="服務條款" html={terms} onChange={setTerms} templates={TERMS_TEMPLATES} />
            <ClauseEditor label="保密條款（NDA）" html={nda} onChange={setNda} templates={NDA_TEMPLATES} />
            <label className="space-y-2 block">
              <span className="text-sm font-medium leading-none">備註（付款方式、訂金比例等）</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaCls} placeholder="例：簽約時支付 30% 訂金，交件前付清尾款。" />
            </label>
            <p className="text-xs text-muted-foreground">範本為通用條款，正式使用前建議請律師依實際業務審閱。</p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Link href={backHref} className={`${btnOutline} h-10 px-4`}>取消</Link>
            <button type="submit" disabled={isPending} className={`${btnPrimaryLg} disabled:opacity-50 px-6`}>
              {isPending ? "儲存中..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
