"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Printer, Trash2, FileText, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetOrder, useUpdateOrder, useDeleteOrder, OrderStatus } from "@/lib/api-client";
import { StatusMenu } from "@/components/StatusMenu";
import { LineItemsTable } from "@/components/LineItemsEditor";
import { invalidateApi } from "@/lib/invalidate";
import { ORDER_STATUS_COLOR, paymentState } from "../constants";
import { PaymentsPanel } from "../components/PaymentsPanel";
import { OrderBusinessPanel } from "../components/OrderBusinessPanel";

const btn =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 transition-colors";

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId } });
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!order) return <div className="p-8 text-center text-destructive">找不到此訂單</div>;

  const handleStatus = (s: OrderStatus) =>
    updateOrder.mutate(
      { id: order.id, data: { status: s } },
      {
        onSuccess: () => {
          toast.success("狀態已更新");
          invalidateApi(queryClient, "/api/orders", "/api/accounting");
        },
        onError: () => toast.error("更新失敗"),
      },
    );

  const handleDelete = () => {
    const warn = order.paid_amount > 0 ? "\n\n已收的款項會保留在會計帳中。" : "";
    if (!confirm(`確定要刪除這筆訂單嗎？刪除後無法恢復。${warn}`)) return;
    deleteOrder.mutate(
      { id: order.id },
      {
        onSuccess: () => {
          toast.success("訂單已刪除");
          invalidateApi(queryClient, "/api/orders", "/api/quotes", "/api/transactions", "/api/accounting");
          router.push("/orders");
        },
        onError: () => toast.error("刪除失敗"),
      },
    );
  };

  const payment = paymentState(order);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="print:hidden space-y-4">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回訂單管理
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusMenu value={order.status} options={Object.values(OrderStatus)} colors={ORDER_STATUS_COLOR} onChange={handleStatus} />
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${payment.cls}`}>{payment.label}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className={`${btn} border border-input bg-background hover:bg-accent`}>
              <Printer className="w-4 h-4" /> 列印
            </button>
            <Link href={`/orders/${order.id}/edit`} className={`${btn} border border-input bg-background hover:bg-accent`}>
              <Pencil className="w-4 h-4" /> 編輯
            </Link>
            <button onClick={handleDelete} className={`${btn} text-destructive border border-destructive/30 hover:bg-destructive/10`}>
              <Trash2 className="w-4 h-4" /> 刪除
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-10 space-y-8 print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Logo className="w-8 h-8" />
              <span className="font-semibold tracking-wide">青春止秒攝影工作室</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-4">{order.title}</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">{order.order_number}</p>
          </div>
          <div className="text-sm space-y-1 sm:text-right">
            <div><span className="text-muted-foreground">成立日期　</span>{format(new Date(order.created_at), "yyyy/MM/dd")}</div>
            {order.delivery_date && (
              <div><span className="text-muted-foreground">預計交件　</span>{format(new Date(order.delivery_date), "yyyy/MM/dd")}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-lg bg-muted/40 p-4 print:bg-transparent print:p-0">
          <div>
            <p className="text-xs text-muted-foreground mb-1">客戶</p>
            {order.customer_id ? (
              <Link href={`/customers/${order.customer_id}`} className="font-medium text-primary hover:underline">{order.contact_name}</Link>
            ) : (
              <p className="font-medium">{order.contact_name}</p>
            )}
            <p className="text-sm text-muted-foreground">{order.contact_phone}</p>
            {order.contact_email && <p className="text-sm text-muted-foreground">{order.contact_email}</p>}
          </div>
          <div className="space-y-2 print:hidden">
            {order.quote_id && (
              <Link href={`/quotes/${order.quote_id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <FileText className="w-4 h-4" /> 來自報價單 {order.quote_number}
              </Link>
            )}
            {order.booking_id && (
              <Link href={`/bookings/${order.booking_id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <CalendarDays className="w-4 h-4" /> 關聯預約 {order.booking_number}
              </Link>
            )}
          </div>
        </div>

        <LineItemsTable
          items={order.items}
          discount={order.discount}
          total={order.total}
          taxMode={order.tax_mode}
          taxRate={order.tax_rate}
          taxAmount={order.tax_amount}
        />

        {order.notes && (
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">備註</p>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{order.notes}</p>
          </div>
        )}
      </div>

      <PaymentsPanel order={order} />
      <OrderBusinessPanel order={order} />
    </div>
  );
}
