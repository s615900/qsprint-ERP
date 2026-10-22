"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateCustomer } from "@/lib/api-client";
import { CustomerForm, CustomerFormValues } from "../components/CustomerForm";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function NewCustomer() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();
  const queryClient = useQueryClient();

  const handleSubmit = (data: CustomerFormValues) => {
    createCustomer.mutate(
      {
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
        onSuccess: (customer) => {
          toast.success("客戶已建立");
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-customers"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          router.push(`/customers/${customer.id}`);
        },
        onError: () => {
          toast.error("建立失敗，請稍後再試");
        }
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回客戶列表
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">新增客戶</h1>
        <p className="text-muted-foreground mt-1 text-sm">建立新的客戶檔案與聯絡資訊。</p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-8">
        <CustomerForm 
          onSubmit={handleSubmit} 
          isSubmitting={createCustomer.isPending} 
          submitLabel="建立客戶"
        />
      </div>
    </div>
  );
}
