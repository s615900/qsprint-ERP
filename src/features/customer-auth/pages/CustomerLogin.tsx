"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { LineLoginButton } from "../components/LineLoginButton";

const LINE_ERRORS: Record<string, string> = {
  not_configured: "LINE 登入尚未開通，請聯絡工作室",
  cancelled: "已取消 LINE 登入",
  state: "LINE 登入已逾時，請再試一次",
  profile: "無法取得 LINE 資料，請再試一次",
  not_member: "這個 LINE 帳號還不是會員。請向工作室索取會員啟用連結",
  invite: "啟用連結無效或已過期，請向工作室索取新的連結",
  taken: "此 LINE 帳號已綁定其他會員",
};

// Members sign in with LINE only; there is no phone/password login.
export function CustomerLogin() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/book";

  const lineError = searchParams.get("line_error");
  useEffect(() => {
    if (lineError) toast.error(LINE_ERRORS[lineError] ?? "LINE 登入失敗");
  }, [lineError]);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
      </div>

      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-border p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">會員登入</h1>
          <p className="text-muted-foreground mt-1 text-sm">使用 LINE 登入後即可預約與查看您的資料</p>
        </div>

        <LineLoginButton next={next} label="使用 LINE 登入" />

        <p className="text-center text-sm text-muted-foreground">
          還不是會員？請向工作室索取會員啟用連結
        </p>
      </div>
    </div>
  );
}
