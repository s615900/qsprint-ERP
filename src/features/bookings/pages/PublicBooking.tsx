"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useListPackages,
  useListAvailability,
  useGetAvailableSlots,
  useCreateBooking,
  useListPhotographers,
} from "@/lib/api-client";
import { ApiError } from "@/lib/api-client/custom-fetch";
import { format, addDays, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Camera, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCustomerSession } from "@/features/customer-auth/hooks/useCustomerSession";

export function PublicBooking() {
  const router = useRouter();
  const { customer, isLoggedIn, isLoading: isSessionLoading } = useCustomerSession();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Selections
  const [staffId, setStaffId] = useState<number | null>(null);
  const [staffName, setStaffName] = useState("");
  const [packageId, setPackageId] = useState<number | null>(null);
  const [serviceName, setServiceName] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [timeSlot, setTimeSlot] = useState<string>("");

  // Form data
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Must be logged in to book — bounce guests to login/register first.
  useEffect(() => {
    if (!isSessionLoading && !isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent("/book")}`);
    }
  }, [isSessionLoading, isLoggedIn, router]);

  // Once logged in, contact info comes from the account and is locked.
  useEffect(() => {
    if (customer) {
      setContactName(customer.name);
      setContactPhone(customer.phone);
      setContactEmail(customer.email || "");
    }
  }, [customer]);

  const { data: packages, isLoading: pkgsLoading } = useListPackages();
  const { data: photographers, isLoading: staffLoading } = useListPhotographers();
  const createBooking = useCreateBooking();

  if (isSessionLoading || !isLoggedIn) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">載入中...</div>;
  }

  const handleStaffSelect = (p: { id: number; name: string }) => {
    // A different photographer has different open dates — start the date over.
    if (p.id !== staffId) {
      setDate("");
      setTimeSlot("");
    }
    setStaffId(p.id);
    setStaffName(p.name);
    setStep(2);
  };

  const handlePackageSelect = (pkg: any) => {
    setPackageId(pkg.id);
    setServiceName(pkg.name);
    setStep(3);
  };

  const handleDateSelect = (d: string) => {
    setDate(d);
    setTimeSlot("");
    setStep(4);
  };

  const handleTimeSelect = (t: string) => {
    setTimeSlot(t);
    setStep(5);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone) {
      toast.error("請填寫姓名與電話");
      return;
    }

    createBooking.mutate(
      {
        data: {
          customer_id: customer?.id,
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail || undefined,
          service_type: serviceName,
          date,
          time_slot: timeSlot,
          assigned_staff: staffName,
          notes: notes || undefined
        }
      },
      {
        onSuccess: () => {
          setStep(6);
        },
        onError: (err) => {
          // Someone else took the period between loading the page and submitting.
          if (err instanceof ApiError && err.status === 409) {
            toast.error("這個時段剛剛被預約走了，請重新選擇時段");
            setTimeSlot("");
            setStep(4);
            return;
          }
          toast.error("預約送出失敗，請稍後再試或來電預約。");
        }
      }
    );
  };

  if (step === 6) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">預約成功送出！</h1>
            <p className="text-muted-foreground mt-2">
              我們已收到您的預約需求（{serviceName}）。專人將會盡快與您聯繫確認細節。
            </p>
          </div>
          <div className="bg-muted/30 p-4 rounded-xl text-left space-y-2 border border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">攝影師</span>
              <span className="font-medium">{staffName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">預約日期</span>
              <span className="font-medium">{date.replace(/-/g, '/')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">時段</span>
              <span className="font-medium">{timeSlot}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">聯絡人</span>
              <span className="font-medium">{contactName}</span>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-border py-4 px-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
          </div>
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">線上預約系統</div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative z-0">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted -z-10 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary -z-10 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-white transition-colors duration-300 ${
                  step > s ? 'border-primary text-primary' : 
                  step === s ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 
                  'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium text-muted-foreground px-1">
            <span className={step >= 1 ? "text-foreground" : ""}>攝影師</span>
            <span className={step >= 2 ? "text-foreground" : ""}>服務</span>
            <span className={step >= 3 ? "text-foreground" : ""}>日期</span>
            <span className={step >= 4 ? "text-foreground" : ""}>時段</span>
            <span className={step >= 5 ? "text-foreground" : ""}>聯絡資料</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border flex-1 overflow-hidden flex flex-col">
          {/* Header: back button sits on its own line on phones (top-right beside the title on wider screens) */}
          <div className="p-4 sm:p-6 border-b border-border bg-muted/10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1 as any)}
                className="self-start sm:order-last shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 bg-white border shadow-sm pl-2 pr-3 py-1.5 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> 上一步
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground">
                {step === 1 && "請選擇攝影師"}
                {step === 2 && "請選擇您需要的服務"}
                {step === 3 && "請選擇預約日期"}
                {step === 4 && "請選擇預約時段"}
                {step === 5 && "請填寫聯絡資料"}
              </h2>
              {step > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">已選</span>
                  {[staffName, serviceName, date && date.replace(/-/g, '/'), timeSlot].filter(Boolean).map((label) => (
                    <span key={label} className="px-2 py-0.5 rounded-full bg-white border border-border font-medium text-foreground">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1">
            {/* Step 1: Photographer */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {staffLoading ? (
                  [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)
                ) : photographers?.length === 0 ? (
                  <div className="sm:col-span-2 py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-border">
                    目前沒有開放線上預約的攝影師，請來電預約。
                  </div>
                ) : (
                  photographers?.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleStaffSelect(p)}
                      className={`group flex items-center gap-4 border rounded-xl p-5 text-left hover:border-primary hover:shadow-md transition-all bg-white ${
                        staffId === p.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                      }`}
                    >
                      <span className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {p.name.charAt(0)}
                      </span>
                      <span className="flex-1">
                        <span className="block font-bold text-lg text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        <span className="block text-sm text-muted-foreground mt-0.5">查看可預約時間</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Step 2: Packages */}
            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pkgsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                  ))
                ) : (
                  packages?.map((pkg) => (
                    <div 
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg)}
                      className="group relative border border-border rounded-xl p-5 cursor-pointer hover:border-primary hover:shadow-md transition-all bg-white overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{pkg.description}</p>
                      
                      <div className="flex items-center justify-end mt-6">
                        <div className="text-lg font-bold text-foreground">
                          NT$ {pkg.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Step 3: Date Picker */}
            {step === 3 && staffId && (
              <DatePicker staffId={staffId} onSelect={handleDateSelect} />
            )}

            {/* Step 4: Time Slots */}
            {step === 4 && staffId && (
              <TimeSlotPicker staffId={staffId} date={date} onSelect={handleTimeSelect} />
            )}

            {/* Step 5: Contact Form */}
            {step === 5 && (
              <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                    以下聯絡資料帶自您的會員資料，已鎖定無法在此修改；如需變更請至「會員中心」申請。
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      姓名 <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={contactName}
                      readOnly
                      disabled
                      className="flex h-12 w-full rounded-md border border-input bg-muted/50 px-4 py-2 text-base text-foreground/80 cursor-not-allowed shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      聯絡電話 <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={contactPhone}
                      readOnly
                      disabled
                      className="flex h-12 w-full rounded-md border border-input bg-muted/50 px-4 py-2 text-base text-foreground/80 cursor-not-allowed shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      電子信箱
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      readOnly
                      disabled
                      placeholder="尚未填寫"
                      className="flex h-12 w-full rounded-md border border-input bg-muted/50 px-4 py-2 text-base text-foreground/80 cursor-not-allowed shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      其他備註或需求
                    </label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
                      placeholder="(選填)"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <button 
                    type="submit" 
                    disabled={createBooking.isPending}
                    className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createBooking.isPending ? "處理中..." : "確認送出預約"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Subcomponents for the public flow
function DatePicker({ staffId, onSelect }: { staffId: number; onSelect: (date: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const today = new Date();

  // Get availability for the month
  const startDateStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDateStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  
  const { data: availData, isLoading } = useListAvailability(
    { start_date: startDateStr, end_date: endDateStr, staff_id: staffId },
    { query: { queryKey: ["/api/bookings/availability", { start_date: startDateStr, end_date: endDateStr, staff_id: staffId }] } }
  );

  // Generate calendar grid
  const startDay = currentMonth.getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = endOfMonth(currentMonth).getDate();
  const calendarDays = [];
  
  // Empty cells before start
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Find availability from API
    const dayAvail = availData?.find(a => a.date === dateStr);
    const hasSlots = dayAvail ? dayAvail.available_slots > 0 : false;
    
    calendarDays.push({
      date: d,
      dateStr,
      isPast,
      hasSlots: !isPast && hasSlots
    });
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">
          {format(currentMonth, 'yyyy 年 M 月')}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(startOfMonth(addDays(currentMonth, -30)))}
            disabled={currentMonth <= startOfMonth(today)}
            className="w-10 h-10 rounded-full flex items-center justify-center border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentMonth(startOfMonth(addDays(currentMonth, 32)))}
            className="w-10 h-10 rounded-full flex items-center justify-center border hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-medium text-muted-foreground uppercase">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2 animate-pulse">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
            
            return (
              <button
                key={day.dateStr}
                disabled={!day.hasSlots}
                onClick={() => onSelect(day.dateStr)}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative border-2 border-transparent text-sm font-medium
                  ${!day.hasSlots ? 'opacity-30 cursor-not-allowed bg-muted/50' : 'hover:border-primary hover:bg-primary/5 bg-white shadow-sm border-border'}
                `}
              >
                <span>{day.date.getDate()}</span>
                {day.hasSlots && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary absolute bottom-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> 可預約
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border" /> 額滿/無法預約
        </div>
      </div>
    </div>
  );
}

function TimeSlotPicker({ staffId, date, onSelect }: { staffId: number, date: string, onSelect: (time: string) => void }) {
  const { data: slots, isLoading } = useGetAvailableSlots(
    { date, staff_id: staffId },
    { query: { queryKey: ["/api/bookings/available-slots", { date, staff_id: staffId }] } }
  );

  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8" />
      </div>
      
      <h3 className="text-xl font-bold mb-8">選擇 {date.replace(/-/g, '/')} 的時段</h3>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-xl" />
          ))}
        </div>
      ) : slots?.length === 0 ? (
        <div className="py-12 text-muted-foreground bg-muted/30 rounded-xl border border-border">
          當日已無可用時段，請返回上一步選擇其他日期
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {slots?.map(slot => (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => onSelect(slot.time)}
              className={`
                h-14 rounded-xl text-lg font-medium border-2 transition-all flex items-center justify-center
                ${!slot.available 
                  ? 'bg-muted/50 border-transparent text-muted-foreground opacity-50 cursor-not-allowed' 
                  : 'bg-white border-border text-foreground hover:border-primary hover:text-primary hover:shadow-md'
                }
              `}
            >
              {slot.time}
              {!slot.available && <span className="ml-1.5 text-sm">（已滿）</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
