"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateOrder } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { OrderForm } from "../components/OrderForm";

export function NewOrder() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createOrder = useCreateOrder();

  return (
    <OrderForm
      heading="新增訂單"
      subheading="沒有經過報價的案子可以直接在這裡建立訂單。"
      backHref="/orders"
      submitLabel="建立訂單"
      isPending={createOrder.isPending}
      onSubmit={(data) =>
        createOrder.mutate(
          { data },
          {
            onSuccess: (order) => {
              toast.success("訂單已建立");
              invalidateApi(queryClient, "/api/orders", "/api/accounting");
              router.push(`/orders/${order.id}`);
            },
            onError: () => toast.error("建立失敗，請檢查必填欄位"),
          },
        )
      }
    />
  );
}
