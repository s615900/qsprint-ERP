"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useLogoutCustomerAccount,
  useCreateMyChangeRequest,
  useListMyChangeRequests,
} from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, User, Phone, Mail, Edit3, Hash } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCustomerSession } from "../hooks/useCustomerSession";
import { LineBindingCard } from "../components/LineBindingCard";

export function CustomerAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customer, isLoggedIn, isLoading } = useCustomerSession();
  const logout = useLogoutCustomerAccount();
  const createChangeRequest = useCreateMyChangeRequest();

  const [isEditing, setIsEditing] = useState(false);
  const [requestedName, setRequestedName] = useState("");
  const [requestedPhone, setRequestedPhone] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");

  const { data: changeRequests, isLoading: isChangeRequestsLoading } = useListMyChangeRequests({
    query: { queryKey: ["/api/auth/change-requests"], enabled: isLoggedIn },
  });

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent("/account")}`);
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading || !customer) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">載入中...</div>;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        router.push("/login");
      },
    });
  };

  const handleSubmitChangeRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedName && !requestedPhone && !requestedEmail) {
      toast.error("請至少填寫一項要修改的欄位");
      return;
    }

    createChangeRequest.mutate(
      {
        data: {
          requested_name: requestedName || undefined,
          requested_phone: requestedPhone || undefined,
          requested_email: requestedEmail || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("已送出修改申請，請等待審核");
          setIsEditing(false);
          setRequestedName("");
          setRequestedPhone("");
          setRequestedEmail("");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/change-requests"] });
        },
        onError: () => toast.error("送出失敗，請稍後再試"),
      }
    );
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "待審核": return "bg-amber-100 text-amber-700 border-amber-200";
      case "已核准": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "已拒絕": return "bg-gray-100 text-gray-600 border-gray-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <header className="bg-white border-b border-border py-4 px-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/book" className="flex items-center gap-2">
            <Logo className="w-9 h-9" />
            <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted-foreground hover:text-destructive flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> 登出
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">我的資料</h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Hash className="w-3 h-3" /> {customer.customer_number}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium border border-input bg-background hover:bg-accent rounded-md px-3 py-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> 申請修改資料
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">姓名（已鎖定，無法自行修改）</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{customer.phone}</p>
                <p className="text-xs text-muted-foreground mt-0.5">電話（已鎖定，無法自行修改）</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{customer.email || "尚未填寫"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Email（已鎖定，無法自行修改）</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <form onSubmit={handleSubmitChangeRequest} className="p-6 border-t border-border bg-muted/10 space-y-4">
              <p className="text-sm text-muted-foreground">只需填寫想要修改的欄位，其餘留空即可，送出後將由專人審核。</p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">新的姓名</label>
                <input
                  value={requestedName}
                  onChange={(e) => setRequestedName(e.target.value)}
                  placeholder={customer.name}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">新的電話</label>
                <input
                  value={requestedPhone}
                  onChange={(e) => setRequestedPhone(e.target.value)}
                  placeholder={customer.phone}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">新的 Email</label>
                <input
                  value={requestedEmail}
                  onChange={(e) => setRequestedEmail(e.target.value)}
                  placeholder={customer.email || "example@email.com"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-9 px-4 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createChangeRequest.isPending}
                  className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createChangeRequest.isPending ? "送出中..." : "送出申請"}
                </button>
              </div>
            </form>
          )}
        </div>

        <LineBindingCard />

        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/10">
            <h2 className="font-semibold text-sm">資料修改申請紀錄</h2>
          </div>
          <div className="p-0">
            {isChangeRequestsLoading ? (
              <div className="p-6 text-sm text-muted-foreground">載入中...</div>
            ) : !changeRequests || changeRequests.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">尚未提出任何修改申請</div>
            ) : (
              <ul className="divide-y divide-border">
                {changeRequests.map((cr) => (
                  <li key={cr.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(cr.status)}`}>
                        {cr.status}
                      </span>
                      <time className="text-[11px] text-muted-foreground">
                        {format(new Date(cr.created_at), "yyyy/MM/dd HH:mm")}
                      </time>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {cr.requested_name && <div>姓名 → {cr.requested_name}</div>}
                      {cr.requested_phone && <div>電話 → {cr.requested_phone}</div>}
                      {cr.requested_email && <div>Email → {cr.requested_email}</div>}
                    </div>
                    {cr.admin_note && (
                      <div className="text-xs text-muted-foreground/80 italic">備註：{cr.admin_note}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
