"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useUpdateCustomer, useGetCustomer } from "@/lib/api-client";
import { CustomerForm, CustomerFormValues } from "../components/CustomerForm";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function EditCustomer() {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useGetCustomer(customerId, {
    query: {
      enabled: !!customerId && !isNaN(customerId),
      queryKey: ["/api/customers", customerId]
    }
  });

  const updateCustomer = useUpdateCustomer();

  const handleSubmit = (data: CustomerFormValues) => {
    updateCustomer.mutate(
      {
        id: customerId,
        data: {
          ...data,
          email: data.email || undefined,
          company_name: data.company_name || null,
          tax_id: data.tax_id || null,
          address: data.address || null,
          payment_terms: data.payment_terms || null,
          notes: data.notes || undefined
        }
      },
      {
        onSuccess: () => {
          toast.success("客戶資料已更新");
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
          router.push(`/customers/${customerId}`);
        },
        onError: () => {
          toast.error("更新失敗，請稍後再試");
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-destructive">找不到此客戶</div>;
  }

  const defaultValues: Partial<CustomerFormValues> = {
    name: customer.name,
    phone: customer.phone,
    email: customer.email || "",
    source: customer.source as any,
    category: customer.category as any,
    member_tier: customer.member_tier as any,
    tags: customer.tags || [],
    customer_type: customer.customer_type,
    company_name: customer.company_name || "",
    tax_id: customer.tax_id || "",
    address: customer.address || "",
    payment_terms: customer.payment_terms || "",
    notes: customer.notes || ""
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/customers/${customerId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回客戶詳情
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">編輯客戶</h1>
        <p className="text-muted-foreground mt-1 text-sm">更新 {customer.name} 的基本資料。</p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-8">
        <CustomerForm 
          defaultValues={defaultValues}
          onSubmit={handleSubmit} 
          isSubmitting={updateCustomer.isPending} 
          submitLabel="儲存變更"
        />
      </div>
    </div>
  );
}
