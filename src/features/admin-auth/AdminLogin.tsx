"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, MessageCircle, ShieldAlert } from "lucide-react";

const ERRORS: Record<string, string> = {
  not_configured: "LINE 登入尚未設定，請聯絡系統管理員",
  cancelled: "已取消 LINE 登入",
  state: "登入已逾時，請再試一次",
  profile: "無法取得 LINE 資料，請再試一次",
};

export function AdminLogin() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const invite = params.get("invite");
  const error = params.get("error") ?? params.get("line_error");
  const uid = params.get("uid");
  const [cfg, setCfg] = useState<{ line_enabled: boolean; dev_login: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin-auth/config").then((r) => r.json()).then(setCfg).catch(() => setCfg(null));
  }, []);

  const startHref = `/api/admin-auth/start?next=${encodeURIComponent(next)}${invite ? `&invite=${encodeURIComponent(invite)}` : ""}`;

  const devLogin = async () => {
    await fetch("/api/admin-auth/dev-login", { method: "POST" });
    window.location.href = next;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
      </div>

      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-border p-8 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">管理後台登入</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {invite ? "你受邀成為管理員，請用 LINE 登入以完成加入" : "僅限工作室管理員，請用 LINE 登入"}
          </p>
        </div>

        {error === "forbidden" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
            <p className="flex items-center gap-1.5 font-medium text-amber-800">
              <ShieldAlert className="w-4 h-4" /> 這個 LINE 帳號沒有後台權限
            </p>
            <p className="text-amber-800/90">請聯絡管理員產生邀請連結，或將下列 LINE ID 加入系統設定：</p>
            {uid && <code className="block break-all rounded bg-white border border-amber-200 px-2 py-1 text-xs">{uid}</code>}
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{ERRORS[error] ?? "登入失敗，請再試一次"}</p>
        ) : null}

        <a
          href={startHref}
          className="w-full h-11 rounded-lg font-medium text-white bg-[#06C755] hover:bg-[#05b54d] transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" /> 使用 LINE 登入
        </a>

        {cfg?.dev_login && (
          <button
            onClick={devLogin}
            className="w-full h-10 rounded-lg text-sm font-medium border border-dashed border-input text-muted-foreground hover:bg-accent transition-colors"
          >
            本機開發登入（僅開發環境顯示）
          </button>
        )}
      </div>
    </div>
  );
}
