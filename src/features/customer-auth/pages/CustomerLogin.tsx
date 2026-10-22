"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLoginCustomerAccount } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, LogIn } from "lucide-react";
import { toast } from "sonner";
import { LineLoginButton, OrDivider } from "../components/LineLoginButton";

const LINE_ERRORS: Record<string, string> = {
  not_configured: "LINE 登入尚未開通，請改用手機號碼登入",
  cancelled: "已取消 LINE 登入",
  state: "LINE 登入已逾時，請再試一次",
  profile: "無法取得 LINE 資料，請再試一次",
  not_member: "這個 LINE 帳號還不是會員。請向工作室索取會員啟用連結",
  invite: "啟用連結無效或已過期，請向工作室索取新的連結",
  taken: "此 LINE 帳號已綁定其他會員",
};

export function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const getNextPath = () => searchParams.get("next") || "/book";
  const queryClient = useQueryClient();
  const login = useLoginCustomerAccount();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const lineError = searchParams.get("line_error");
  useEffect(() => {
    if (lineError) toast.error(LINE_ERRORS[lineError] ?? "LINE 登入失敗");
  }, [lineError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("請輸入手機號碼與密碼");
      return;
    }

    login.mutate(
      { data: { phone, password } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          router.push(getNextPath());
        },
        onError: () => toast.error("手機號碼或密碼錯誤"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
      </div>

      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-border p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">會員登入</h1>
          <p className="text-muted-foreground mt-1 text-sm">登入後即可預約與查看您的資料</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">手機號碼</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="0912-345-678"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="請輸入密碼"
            />
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {login.isPending ? "登入中..." : "登入"}
          </button>
        </form>

        <OrDivider />
        <LineLoginButton next={getNextPath()} label="使用 LINE 登入" />

        <p className="text-center text-sm text-muted-foreground">
          還不是會員？請向工作室索取會員啟用連結
        </p>
      </div>
    </div>
  );
}
