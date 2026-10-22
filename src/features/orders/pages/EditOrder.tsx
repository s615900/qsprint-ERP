"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetOrder, useUpdateOrder } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { OrderForm } from "../components/OrderForm";

export function EditOrder() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId } });
  const updateOrder = useUpdateOrder();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!order) return <div className="p-8 text-center text-destructive">找不到此訂單</div>;

  return (
    <OrderForm
      initial={order}
      heading="編輯訂單"
      subheading={order.order_number}
      backHref={`/orders/${order.id}`}
      submitLabel="儲存變更"
      isPending={updateOrder.isPending}
      onSubmit={(data) =>
        updateOrder.mutate(
          { id: order.id, data },
          {
            onSuccess: () => {
              toast.success("訂單已更新");
              invalidateApi(queryClient, "/api/orders", "/api/accounting");
              router.push(`/orders/${order.id}`);
            },
            onError: () => toast.error("儲存失敗"),
          },
        )
      }
    />
  );
}
