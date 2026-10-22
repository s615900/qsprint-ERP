"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useGetCustomer,
  useListCustomerInteractions,
  useCreateCustomerInteraction,
  useListCustomerBookings,
  useListCustomerChangeRequests,
  useReviewCustomerChangeRequest,
  InteractionInputType,
  Customer
} from "@/lib/api-client";
import { format } from "date-fns";
import { Edit, Phone, Mail, Tag, MessageCircle, Calendar, Plus, MessageSquare, Hash, ClipboardEdit, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);
  const [activeTab, setActiveTab] = useState<"interactions" | "bookings" | "changeRequests">("interactions");

  const { data: customer, isLoading: isCustomerLoading } = useGetCustomer(customerId, {
    query: {
      enabled: !!customerId && !isNaN(customerId),
      queryKey: ["/api/customers", customerId]
    }
  });

  const { data: interactions, isLoading: isInteractionsLoading } = useListCustomerInteractions(customerId, {
    query: {
      enabled: !!customerId && !isNaN(customerId),
      queryKey: ["/api/customers", customerId, "interactions"]
    }
  });

  const { data: bookings, isLoading: isBookingsLoading } = useListCustomerBookings(customerId, {
    query: {
      enabled: !!customerId && !isNaN(customerId),
      queryKey: ["/api/customers", customerId, "bookings"]
    }
  });

  const { data: changeRequests, isLoading: isChangeRequestsLoading } = useListCustomerChangeRequests(customerId, {
    query: {
      enabled: !!customerId && !isNaN(customerId),
      queryKey: ["/api/customers", customerId, "change-requests"]
    }
  });

  if (isCustomerLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-destructive">找不到此客戶</div>;
  }

  // Simple rule-based tier suggestion from cumulative booking count — no payment
  // integration yet, so this is a placeholder proxy for spend until ECPay lands.
  const bookingCount = bookings?.length ?? 0;
  const suggestedTier = bookingCount >= 5 ? "VVIP" : bookingCount >= 2 ? "VIP" : "一般";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{customer.customer_number}</span>
            <span>建立於 {format(new Date(customer.created_at), 'yyyy/MM/dd')}</span>
          </p>
        </div>
        <Link href={`/customers/${customerId}/edit`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 hover-elevate shadow-sm">
          <Edit className="w-4 h-4" />
          編輯資料
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border border-primary/20">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                      {customer.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      customer.member_tier === 'VVIP' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      customer.member_tier === 'VIP' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {customer.member_tier}
                    </span>
                  </div>
                  {!isBookingsLoading && suggestedTier !== customer.member_tier && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      系統建議等級：<span className="font-medium text-foreground">{suggestedTier}</span>
                      （依累積 {bookingCount} 筆預約的簡易規則，可於編輯資料調整）
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{customer.phone}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">聯絡電話</p>
                </div>
              </div>
              
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{customer.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">電子信箱</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{customer.source}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">客源</p>
                </div>
              </div>

              {(customer.customer_type === "公司" || customer.company_name || customer.tax_id || customer.address || customer.payment_terms) && (
                <div className="pt-4 border-t border-border/50 space-y-2 text-sm">
                  <p className="text-xs text-muted-foreground">開發票 / 合約資料（{customer.customer_type}）</p>
                  {customer.company_name && <p className="font-medium">{customer.company_name}</p>}
                  {customer.tax_id && <p>統編 {customer.tax_id}</p>}
                  {customer.address && <p className="text-foreground/80">{customer.address}</p>}
                  {customer.payment_terms && <p className="text-foreground/80">付款條件：{customer.payment_terms}</p>}
                </div>
              )}

              {customer.tags && customer.tags.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">標籤</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium border border-border/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {customer.notes && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">備註</p>
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">{customer.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-amber-50/50 border-t border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400">
                  LINE 尚未串接
                </span>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 mt-1.5 leading-snug">
                  此功能將於後續版本串接 LINE 官方帳號，啟用後即可在此查看與客戶的對話紀錄。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex border-b border-border overflow-x-auto [scrollbar-width:none]">
            <button
              className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "interactions" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              onClick={() => setActiveTab("interactions")}
            >
              <MessageCircle className="w-4 h-4" />
              互動紀錄
            </button>
            <button
              className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "bookings" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              onClick={() => setActiveTab("bookings")}
            >
              <Calendar className="w-4 h-4" />
              預約紀錄
            </button>
            <button
              className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "changeRequests"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              onClick={() => setActiveTab("changeRequests")}
            >
              <ClipboardEdit className="w-4 h-4" />
              資料變更申請
              {changeRequests && changeRequests.filter(cr => cr.status === "待審核").length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {changeRequests.filter(cr => cr.status === "待審核").length}
                </span>
              )}
            </button>
          </div>

          <div className="bg-card border border-border shadow-sm rounded-xl min-h-[400px]">
            {activeTab === "interactions" ? (
              <InteractionsTab
                customerId={customerId}
                interactions={interactions}
                isLoading={isInteractionsLoading}
              />
            ) : activeTab === "bookings" ? (
              <BookingsTab
                bookings={bookings}
                isLoading={isBookingsLoading}
              />
            ) : (
              <ChangeRequestsTab
                customerId={customerId}
                changeRequests={changeRequests}
                isLoading={isChangeRequestsLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractionsTab({ 
  customerId, 
  interactions, 
  isLoading 
}: { 
  customerId: number;
  interactions: any[] | undefined;
  isLoading: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState<InteractionInputType>(InteractionInputType.備註);
  
  const createInteraction = useCreateCustomerInteraction();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createInteraction.mutate(
      { 
        id: customerId, 
        data: { type, content, staff: "系統管理員" } // placeholder staff for now
      },
      {
        onSuccess: () => {
          toast.success("已新增紀錄");
          setContent("");
          setIsAdding(false);
          queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "interactions"] });
        },
        onError: () => {
          toast.error("新增失敗");
        }
      }
    );
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case '諮詢紀錄': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '拍攝紀錄': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Line訊息': return 'bg-green-100 text-green-700 border-green-200';
      case '電話': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20 rounded-t-xl">
        <h3 className="font-semibold">所有互動</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 shadow-sm hover-elevate"
        >
          {isAdding ? "取消" : <><Plus className="w-3.5 h-3.5" /> 新增紀錄</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-border bg-muted/10 space-y-3">
          <div className="flex gap-3">
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as InteractionInputType)}
              className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.values(InteractionInputType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input 
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="輸入紀錄內容..."
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={!content.trim() || createInteraction.isPending}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow-sm"
            >
              {createInteraction.isPending ? "儲存中" : "儲存"}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 p-0 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : interactions?.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-40">
            <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-sm">目前沒有任何互動紀錄</p>
          </div>
        ) : (
          <div className="relative pl-6 py-6 pr-4 space-y-6 before:absolute before:inset-0 before:ml-[35px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {interactions?.map((interaction, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={interaction.id} 
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-border absolute left-[-24px] md:left-1/2 md:-translate-x-1/2 shadow-sm group-hover:bg-primary transition-colors" />
                
                <div className="w-full md:w-[calc(50%-2rem)] bg-card border border-border shadow-sm p-4 rounded-xl hover-elevate transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getTypeColor(interaction.type)}`}>
                      {interaction.type}
                    </span>
                    <time className="text-[11px] font-medium text-muted-foreground">
                      {format(new Date(interaction.created_at), 'yyyy/MM/dd HH:mm')}
                    </time>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{interaction.content}</p>
                  {interaction.staff && (
                    <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center border border-border/50">{interaction.staff.charAt(0)}</span>
                      {interaction.staff} 建立
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingsTab({ 
  bookings, 
  isLoading 
}: { 
  bookings: any[] | undefined;
  isLoading: boolean;
}) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case '諮詢': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '已預約': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '已拍攝': return 'bg-slate-100 text-slate-700 border-slate-200';
      case '修圖中': return 'bg-orange-100 text-orange-700 border-orange-200';
      case '交件': return 'bg-teal-100 text-teal-700 border-teal-200';
      case '結案': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/20 rounded-t-xl">
        <h3 className="font-semibold">歷史預約</h3>
      </div>
      <div className="flex-1 p-0">
        {isLoading ? (
           <div className="p-6 space-y-4">
           {[...Array(2)].map((_, i) => (
             <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
           ))}
         </div>
        ) : bookings?.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-40">
            <Calendar className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-sm">此客戶尚未有預約紀錄</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {bookings?.map((booking, i) => (
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={booking.id} 
                className="p-4 sm:p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex flex-col items-center justify-center text-secondary-foreground border border-border shrink-0">
                    <span className="text-xs font-medium">{format(new Date(booking.date), 'MMM')}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(booking.date), 'd')}</span>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{booking.service_type}</div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{format(new Date(booking.date), 'yyyy/MM/dd')}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{booking.time_slot}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                  {booking.assigned_staff && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] border border-border">
                        {booking.assigned_staff.charAt(0)}
                      </span>
                      {booking.assigned_staff}
                    </div>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChangeRequestsTab({
  customerId,
  changeRequests,
  isLoading
}: {
  customerId: number;
  changeRequests: any[] | undefined;
  isLoading: boolean;
}) {
  const reviewChangeRequest = useReviewCustomerChangeRequest();
  const queryClient = useQueryClient();

  const handleReview = (requestId: number, action: "approve" | "reject") => {
    reviewChangeRequest.mutate(
      { id: customerId, requestId, data: { action } },
      {
        onSuccess: () => {
          toast.success(action === "approve" ? "已核准並更新客戶資料" : "已拒絕此申請");
          queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "change-requests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
        },
        onError: () => toast.error("處理失敗")
      }
    );
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case '待審核': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '已核准': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '已拒絕': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/20 rounded-t-xl">
        <h3 className="font-semibold">客戶資料變更申請</h3>
      </div>
      <div className="flex-1 p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !changeRequests || changeRequests.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-40">
            <ClipboardEdit className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-sm">此客戶尚未提出任何資料變更申請</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {changeRequests.map((cr, i) => (
              <motion.li
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={cr.id}
                className="p-4 sm:p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(cr.status)}`}>
                    {cr.status}
                  </span>
                  <time className="text-[11px] text-muted-foreground">
                    {format(new Date(cr.created_at), 'yyyy/MM/dd HH:mm')}
                  </time>
                </div>
                <div className="text-sm text-foreground/90 space-y-1">
                  {cr.requested_name && <div>姓名 → <span className="font-medium">{cr.requested_name}</span></div>}
                  {cr.requested_phone && <div>電話 → <span className="font-medium">{cr.requested_phone}</span></div>}
                  {cr.requested_email && <div>Email → <span className="font-medium">{cr.requested_email}</span></div>}
                </div>
                {cr.status === "待審核" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleReview(cr.id, "approve")}
                      disabled={reviewChangeRequest.isPending}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> 核准
                    </button>
                    <button
                      onClick={() => handleReview(cr.id, "reject")}
                      disabled={reviewChangeRequest.isPending}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> 拒絕
                    </button>
                  </div>
                )}
                {cr.admin_note && (
                  <p className="text-xs text-muted-foreground italic">備註：{cr.admin_note}</p>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
