"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { LineLoginButton } from "../components/LineLoginButton";

// Membership is by invitation: the studio creates the customer, then sends this page's link.
export function CustomerRegister() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") || "/book";

  const [name, setName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (!invite) return;
    fetch(`/api/auth/invite?token=${encodeURIComponent(invite)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setName((await res.json()).name);
      })
      .catch(() => setInvalid(true));
  }, [invite]);

  const closed = !invite || invalid;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
      </div>

      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-border p-8 space-y-6">
        {closed ? (
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">會員由工作室邀請</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {invalid
                ? "這個邀請連結無效或已過期，請向工作室索取新的連結。"
                : "目前僅開放工作室建立的會員。如果你已經是客戶，請向工作室索取專屬的會員啟用連結。"}
            </p>
            <Link href="/login" className="inline-block text-primary font-medium hover:underline text-sm">
              已啟用？前往登入
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">啟用會員</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {name ? `${name} 您好，選一種方式啟用就能線上預約` : "確認邀請連結中..."}
              </p>
            </div>

            <LineLoginButton next={next} invite={invite!} label="使用 LINE 啟用會員" />
            <p className="text-center text-xs text-muted-foreground">啟用後，之後都用 LINE 登入即可</p>
          </>
        )}
      </div>
    </div>
  );
}
