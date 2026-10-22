"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateBooking, useListPackages, useGetAvailableSlots, useListCustomers, useListPhotographers } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client/custom-fetch";
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export function NewBooking() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();

  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [staffId, setStaffId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Search customer logic
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: searchResults } = useListCustomers(
    { search: customerSearch },
    { 
      query: { 
        enabled: customerSearch.length > 1,
        queryKey: ["/api/customers", { search: customerSearch }] 
      } 
    }
  );

  const { data: packages } = useListPackages();
  const { data: photographers } = useListPhotographers();
  const assignedStaff = photographers?.find((p) => p.id === staffId)?.name ?? "";
  const { data: availableSlots, isLoading: slotsLoading } = useGetAvailableSlots(
    { date, staff_id: staffId ?? undefined },
    {
      query: {
        enabled: !!date && !!staffId,
        queryKey: ["/api/bookings/available-slots", { date, staff_id: staffId }]
      }
    }
  );

  const handleCustomerSelect = (customer: any) => {
    setCustomerId(customer.id);
    setContactName(customer.name);
    setContactPhone(customer.phone);
    setCustomerSearch(""); // close search dropdown by clearing it
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedStaff || !date || !timeSlot || !serviceType || !contactName || !contactPhone) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    createBooking.mutate(
      {
        data: {
          customer_id: customerId || undefined,
          contact_name: contactName,
          contact_phone: contactPhone,
          service_type: serviceType,
          date,
          time_slot: timeSlot,
          assigned_staff: assignedStaff,
          notes: notes || undefined
        }
      },
      {
        onSuccess: () => {
          toast.success("預約建立成功");
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          router.push("/bookings");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.error("這個時段剛剛被預約走了，請重新選擇");
            setTimeSlot("");
            queryClient.invalidateQueries({ queryKey: ["/api/bookings/available-slots"] });
            return;
          }
          toast.error("建立失敗");
        }
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> 返回預約管理
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">新增預約</h1>
        <p className="text-muted-foreground mt-1 text-sm">手動建立客戶預約排程。</p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {/* Section 1: Customer */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <User className="w-5 h-5 text-primary" />
              客戶資料
            </h2>
            
            <div className="relative">
              <label className="text-sm font-medium leading-none mb-2 block">
                搜尋現有客戶 (選填)
              </label>
              <input 
                type="text"
                placeholder="輸入姓名或電話搜尋..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {customerSearch.length > 1 && searchResults && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">找不到符合的客戶</div>
                  ) : (
                    searchResults.map(c => (
                      <div
                        key={c.id}
                        className="p-3 hover:bg-muted cursor-pointer text-sm border-b border-border/50 last:border-0"
                        onClick={() => handleCustomerSelect(c)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{c.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{c.customer_number}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{c.phone}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  聯絡人姓名 <span className="text-destructive">*</span>
                </label>
                <input 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="姓名"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  聯絡人電話 <span className="text-destructive">*</span>
                </label>
                <input 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="電話"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Service & Schedule */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <CalendarIcon className="w-5 h-5 text-primary" />
              排程與服務
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                攝影師 <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {photographers?.length === 0 && (
                  <p className="text-sm text-muted-foreground">還沒有在職的攝影師，請先到「人員管理」新增。</p>
                )}
                {photographers?.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setStaffId(p.id); setTimeSlot(""); }}
                    className={`h-10 px-4 rounded-full border text-sm font-medium transition-colors flex items-center gap-2 ${
                      staffId === p.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-input hover:border-primary/50"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${staffId === p.id ? "bg-primary-foreground/20" : "bg-muted"}`}>{p.name.charAt(0)}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                服務項目 <span className="text-destructive">*</span>
              </label>
              <select 
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">選擇服務項目...</option>
                {packages?.map(pkg => (
                  <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block mb-2">
                  日期 <span className="text-destructive">*</span>
                </label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTimeSlot(""); // reset time slot when date changes
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none block mb-2">
                  時段 <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {!staffId ? (
                    <div className="col-span-3 text-sm text-muted-foreground py-2 text-center bg-muted/40 rounded">請先選擇攝影師</div>
                  ) : slotsLoading ? (
                    <div className="col-span-3 text-sm text-muted-foreground py-2 text-center">載入時段中...</div>
                  ) : availableSlots?.length === 0 ? (
                    <div className="col-span-3 text-sm text-destructive py-2 text-center bg-destructive/10 rounded">無可用時段</div>
                  ) : (
                    availableSlots?.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setTimeSlot(slot.time)}
                        className={`py-2 px-1 text-sm rounded-md border transition-all text-center ${
                          !slot.available ? 'opacity-50 bg-muted cursor-not-allowed border-transparent' :
                          timeSlot === slot.time ? 'bg-primary text-primary-foreground border-primary shadow-sm' :
                          'bg-background hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Details */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b border-border">
              <FileText className="w-5 h-5 text-primary" />
              其他細節
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                備註 (選填)
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="任何特殊需求或注意事項..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
            <button 
              type="button" 
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={createBooking.isPending || !timeSlot || !staffId}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 hover-elevate shadow-sm"
            >
              {createBooking.isPending ? "儲存中..." : "建立預約"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
