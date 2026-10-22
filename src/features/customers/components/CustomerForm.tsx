"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Plus } from "lucide-react";
import { isValidTaxId } from "@/lib/tax";
import {
  CustomerInputSource,
  CustomerInputCategory,
  CustomerInputMemberTier
} from "@/lib/api-client";

export const customerSchema = z.object({
  name: z.string().min(1, "請輸入姓名"),
  phone: z.string().min(1, "請輸入電話"),
  email: z.string().email("請輸入有效的 Email").optional().or(z.literal("")),
  source: z.enum([
    CustomerInputSource.社群,
    CustomerInputSource.介紹,
    CustomerInputSource.官網,
    CustomerInputSource.廣告
  ] as const),
  category: z.enum([
    CustomerInputCategory.新人婚紗,
    CustomerInputCategory.親子寫真,
    CustomerInputCategory.個人寫真,
    CustomerInputCategory.企業商業客戶
  ] as const),
  member_tier: z.enum([
    CustomerInputMemberTier.一般,
    CustomerInputMemberTier.VIP,
    CustomerInputMemberTier.VVIP
  ] as const),
  tags: z.array(z.string()).default([]),
  customer_type: z.enum(["個人", "公司"]),
  company_name: z.string().optional(),
  tax_id: z
    .string()
    .optional()
    .refine((v) => !v || isValidTaxId(v), "統一編號格式不正確（8 碼數字）"),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional()
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export function CustomerForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting,
  submitLabel 
}: { 
  defaultValues?: Partial<CustomerFormValues>, 
  onSubmit: (data: CustomerFormValues) => void,
  isSubmitting?: boolean,
  submitLabel: string
}) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      source: CustomerInputSource.社群,
      category: CustomerInputCategory.個人寫真,
      member_tier: CustomerInputMemberTier.一般,
      tags: [],
      customer_type: "個人",
      company_name: "",
      tax_id: "",
      address: "",
      payment_terms: "",
      notes: "",
      ...defaultValues
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const tags = watch("tags") ?? [];
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const value = tagInput.trim();
    if (!value || tags.includes(value)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...tags, value], { shouldDirty: true });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setValue("tags", tags.filter(t => t !== tag), { shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            姓名 <span className="text-destructive">*</span>
          </label>
          <input 
            {...register("name")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="客戶姓名"
          />
          {errors.name && <p className="text-[0.8rem] font-medium text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            電話 <span className="text-destructive">*</span>
          </label>
          <input 
            {...register("phone")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="0912-345-678"
          />
          {errors.phone && <p className="text-[0.8rem] font-medium text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Email
          </label>
          <input 
            {...register("email")}
            type="email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="example@email.com"
          />
          {errors.email && <p className="text-[0.8rem] font-medium text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            客源
          </label>
          <select 
            {...register("source")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Object.values(CustomerInputSource).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            客戶類別
          </label>
          <select 
            {...register("category")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Object.values(CustomerInputCategory).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            會員等級
          </label>
          <select 
            {...register("member_tier")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Object.values(CustomerInputMemberTier).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="md:col-span-2 space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">開發票 / 合約資料</h3>
            <select {...register("customer_type")} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
              <option value="個人">個人客戶</option>
              <option value="公司">公司行號</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">公司抬頭</label>
              <input {...register("company_name")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="發票抬頭／合約甲方名稱" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">統一編號</label>
              <input {...register("tax_id")} maxLength={8} inputMode="numeric" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="8 碼，開三聯式發票用" />
              {errors.tax_id && <p className="text-[0.8rem] font-medium text-destructive">{errors.tax_id.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">地址</label>
              <input {...register("address")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">付款條件</label>
              <input {...register("payment_terms")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="例：簽約付 30%，交件付尾款" />
            </div>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            標籤
          </label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="輸入標籤後按 Enter 或新增，例如：孕婦"
            />
            <button
              type="button"
              onClick={addTag}
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-3 shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新增
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium border border-border/50"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive transition-colors"
                    aria-label={`移除標籤 ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            備註
          </label>
          <textarea 
            {...register("notes")}
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="任何其他注意事項..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button 
          type="button" 
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          取消
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 hover-elevate shadow-sm"
        >
          {isSubmitting ? "儲存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
