"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useListBookings,
  useUpdateBookingStatus,
  useUpdateBooking,
  useDeleteBooking,
  useListStaff,
  useConvertBookingToOrder,
  BookingStatus,
  type Booking,
} from "@/lib/api-client";
import { Search, Calendar as CalendarIcon, Plus, MoreHorizontal, Trash2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { invalidateApi } from "@/lib/invalidate";
import { format, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function BookingAdmin() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [date, setDate] = useState("");

  const params: any = {};
  if (search) params.search = search;
  if (status) params.status = status;
  if (date) params.date = date;

  const { data: bookings, isLoading } = useListBookings(params, {
    query: { queryKey: ["/api/bookings", params] }
  });

  const updateStatus = useUpdateBookingStatus();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const convert = useConvertBookingToOrder();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: staffList } = useListStaff();

  const handleStatusChange = (id: number, newStatus: BookingStatus) => {
    updateStatus.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success("狀態已更新");
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        },
        onError: () => toast.error("更新失敗")
      }
    );
  };

  const handleStaffChange = (id: number, staff: string) => {
    updateBooking.mutate(
      { id, data: { assigned_staff: staff } },
      {
        onSuccess: () => {
          toast.success("已指派攝影師");
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        },
        onError: () => toast.error("指派失敗")
      }
    );
  };

  const handleConvert = (id: number) => {
    convert.mutate(
      { id },
      {
        onSuccess: (order) => {
          toast.success(`已建立訂單 ${order.order_number}`);
          invalidateApi(queryClient, "/api/bookings", "/api/orders");
          router.push(`/orders/${order.id}`);
        },
        onError: () => toast.error("轉換失敗")
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("確定要刪除這筆預約嗎？刪除後無法恢復。")) return;
    
    deleteBooking.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("預約已刪除");
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        },
        onError: () => toast.error("刪除失敗")
      }
    );
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case '諮詢': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
      case '已預約': return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200';
      case '已拍攝': return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
      case '修圖中': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
      case '交件': return 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200';
      case '結案': return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
      default: return 'bg-muted text-muted-foreground border-border hover:bg-muted/80';
    }
  };

  const renderStaffMenu = (booking: Booking) => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
        {booking.assigned_staff ? (
          <>
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] border border-border font-medium text-foreground">
              {booking.assigned_staff.charAt(0)}
            </span>
            {booking.assigned_staff}
          </>
        ) : (
          <span className="text-muted-foreground/50 italic">未指派</span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2">
          <DropdownMenu.Item
            onClick={() => handleStaffChange(booking.id, "")}
            className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground italic text-muted-foreground ${!booking.assigned_staff ? 'font-bold' : ''}`}
          >
            未指派
          </DropdownMenu.Item>
          {staffList?.map(({ name: s, role }) => (
            <DropdownMenu.Item
              key={s}
              onClick={() => handleStaffChange(booking.id, s)}
              className={`relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${booking.assigned_staff === s ? 'font-bold text-primary' : ''}`}
            >
              {s}
              <span className="text-xs font-normal text-muted-foreground">{role}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  const renderStatusMenu = (booking: Booking) => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${getStatusColor(booking.status)}`}>
        {booking.status}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2">
          {Object.values(BookingStatus).map((s) => (
            <DropdownMenu.Item
              key={s}
              onClick={() => handleStatusChange(booking.id, s as BookingStatus)}
              className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${booking.status === s ? 'font-bold text-primary' : ''}`}
            >
              {s}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  const renderActionsMenu = (booking: Booking) => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <DropdownMenu.Item
            onClick={() => booking.order_id ? router.push(`/orders/${booking.order_id}`) : handleConvert(booking.id)}
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            {booking.order_id ? "查看訂單" : "轉為訂單"}
          </DropdownMenu.Item>
          <DropdownMenu.Item 
            onClick={() => handleDelete(booking.id)}
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-destructive/10 hover:text-destructive text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            刪除預約
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">預約管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">追蹤並管理所有客戶預約與排程狀態。</p>
        </div>
        <Link href="/bookings/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover-elevate">
          <Plus className="w-4 h-4" />
          新增預約
        </Link>
      </div>

      <div className="bg-card rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜尋客戶姓名、服務或訂單編號..."
                className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center [&_select]:w-full [&_input]:w-full sm:[&_select]:w-auto sm:[&_input]:w-auto">
              <select 
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="">所有狀態</option>
                {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="date" 
                  className="h-10 pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile / tablet: card list */}
        <div className="lg:hidden p-3 sm:p-4">
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : bookings?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">沒有找到符合條件的預約</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {bookings?.map((booking) => (
                <div key={booking.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {format(new Date(booking.date), 'yyyy/MM/dd')}
                        <span className="ml-2 font-mono text-muted-foreground">{booking.time_slot}</span>
                      </div>
                      <Link href={`/bookings/${booking.id}`} className="font-mono text-xs text-primary hover:underline">
                        {booking.booking_number}
                      </Link>
                    </div>
                    <div className="-mr-2 -mt-1">{renderActionsMenu(booking)}</div>
                  </div>
                  <div className="text-sm">
                    {booking.customer_id ? (
                      <Link href={`/customers/${booking.customer_id}`} className="font-medium text-primary hover:underline">
                        {booking.customer_name || '未命名'}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{booking.customer_name || '未命名'}</span>
                    )}
                    {booking.customer_phone && (
                      <span className="ml-2 text-xs text-muted-foreground">{booking.customer_phone}</span>
                    )}
                    <div className="text-foreground/80 mt-1">{booking.service_type}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-sm">
                    <div className="text-muted-foreground">{renderStaffMenu(booking)}</div>
                    {renderStatusMenu(booking)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">訂單編號</th>
                <th className="px-6 py-4 font-medium">預約日期</th>
                <th className="px-6 py-4 font-medium">時間</th>
                <th className="px-6 py-4 font-medium">客戶</th>
                <th className="px-6 py-4 font-medium">服務項目</th>
                <th className="px-6 py-4 font-medium">攝影師/負責人</th>
                <th className="px-6 py-4 font-medium">狀態</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : bookings?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    沒有找到符合條件的預約
                  </td>
                </tr>
              ) : (
                bookings?.map((booking, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={booking.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/bookings/${booking.id}`} className="font-mono text-xs text-primary hover:underline">
                        {booking.booking_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {format(new Date(booking.date), 'yyyy/MM/dd')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono">
                      {booking.time_slot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.customer_id ? (
                        <Link href={`/customers/${booking.customer_id}`} className="font-medium text-primary hover:underline">
                          {booking.customer_name || '未命名'}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{booking.customer_name || '未命名'}</span>
                      )}
                      {booking.customer_phone && (
                        <div className="text-xs text-muted-foreground mt-0.5">{booking.customer_phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-foreground/90">{booking.service_type}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {renderStaffMenu(booking)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusMenu(booking)}
                      {booking.updated_at && (
                        <div className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(booking.updated_at), { addSuffix: true, locale: zhTW })}更新
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {renderActionsMenu(booking)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
