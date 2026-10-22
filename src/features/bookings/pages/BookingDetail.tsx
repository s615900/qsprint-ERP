"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  useGetBooking,
  useUpdateBookingStatus,
  useDeleteBooking,
  useConvertBookingToOrder,
  BookingStatus,
} from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { format, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ArrowLeft, Hash, Calendar as CalendarIcon, Clock, User, FileText, Trash2, ShoppingBag, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: {
      enabled: !!bookingId && !isNaN(bookingId),
      queryKey: ["/api/bookings", bookingId],
    },
  });

  const updateStatus = useUpdateBookingStatus();
  const deleteBooking = useDeleteBooking();
  const convert = useConvertBookingToOrder();

  const handleConvert = () => {
    convert.mutate(
      { id: bookingId },
      {
        onSuccess: (order) => {
          toast.success(`已建立訂單 ${order.order_number}`);
          invalidateApi(queryClient, "/api/bookings", "/api/orders");
          router.push(`/orders/${order.id}`);
        },
        onError: () => toast.error("轉換失敗，這筆預約可能已經有訂單"),
      }
    );
  };

  const handleStatusChange = (newStatus: BookingStatus) => {
    updateStatus.mutate(
      { id: bookingId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success("狀態已更新");
          queryClient.invalidateQueries({ queryKey: ["/api/bookings", bookingId] });
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        },
        onError: () => toast.error("更新失敗"),
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("確定要刪除這筆預約嗎？刪除後無法恢復。")) return;
    deleteBooking.mutate(
      { id: bookingId },
      {
        onSuccess: () => {
          toast.success("預約已刪除");
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          router.push("/bookings");
        },
        onError: () => toast.error("刪除失敗"),
      }
    );
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "諮詢": return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200";
      case "已預約": return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
      case "已拍攝": return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
      case "修圖中": return "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200";
      case "交件": return "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200";
      case "結案": return "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  }

  if (!booking) {
    return <div className="p-8 text-center text-destructive">找不到此預約</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回預約管理
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">預約詳情</h1>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> {booking.booking_number}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 rounded-md px-3 py-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> 刪除預約
          </button>
        </div>
      </div>

      {booking.order_id ? (
        <Link
          href={`/orders/${booking.order_id}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 hover:bg-emerald-100 transition-colors"
        >
          <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> 這筆預約已建立訂單</span>
          <span className="font-medium">查看訂單與收款 →</span>
        </Link>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm text-foreground/80">確定要拍了嗎？轉成訂單後就能記錄訂金與尾款，收款會自動記進會計。</span>
          <button
            onClick={handleConvert}
            disabled={convert.isPending}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50"
          >
            <ArrowRightCircle className="w-4 h-4" /> {convert.isPending ? "轉換中..." : "轉為訂單"}
          </button>
        </div>
      )}

      <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <User className="w-5 h-5 text-primary" /> 客戶資料
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">聯絡人</p>
                {booking.customer_id ? (
                  <Link href={`/customers/${booking.customer_id}`} className="font-medium text-primary hover:underline">
                    {booking.customer_name || "未命名"}
                  </Link>
                ) : (
                  <p className="font-medium">{booking.customer_name || "未命名"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">聯絡電話</p>
                <p className="font-medium">{booking.customer_phone || "-"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <CalendarIcon className="w-5 h-5 text-primary" /> 排程與服務
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">服務項目</p>
                <p className="font-medium">{booking.service_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 日期時段
                </p>
                <p className="font-medium">
                  {format(new Date(booking.date), "yyyy/MM/dd")} {booking.time_slot}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">攝影師/負責人</p>
                <p className="font-medium">{booking.assigned_staff || "未指派"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">狀態</p>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                      {Object.values(BookingStatus).map((s) => (
                        <DropdownMenu.Item
                          key={s}
                          onClick={() => handleStatusChange(s as BookingStatus)}
                          className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${booking.status === s ? "font-bold text-primary" : ""}`}
                        >
                          {s}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
                <FileText className="w-5 h-5 text-primary" /> 備註
              </h2>
              <p className="text-sm whitespace-pre-wrap text-foreground/80">{booking.notes}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <p>建立於 {format(new Date(booking.created_at), "yyyy/MM/dd HH:mm")}</p>
            <p>{formatDistanceToNow(new Date(booking.updated_at), { addSuffix: true, locale: zhTW })}更新</p>
          </div>
        </div>
      </div>
    </div>
  );
}
