"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { LineLoginButton, OrDivider } from "../components/LineLoginButton";

// Membership is by invitation: the studio creates the customer, then sends this page's link.
export function CustomerRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") || "/book";
  const queryClient = useQueryClient();

  const [name, setName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!invite) return;
    fetch(`/api/auth/invite?token=${encodeURIComponent(invite)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setName((await res.json()).name);
      })
      .catch(() => setInvalid(true));
  }, [invite]);

  const activateWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: invite, password }),
      });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "啟用失敗，請稍後再試");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast.success("會員已啟用");
      router.push(next);
    } finally {
      setSaving(false);
    }
  };

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

            <LineLoginButton next={next} invite={invite!} label="使用 LINE 啟用（建議）" />
            <OrDivider />

            <form onSubmit={activateWithPassword} className="space-y-3">
              <label className="text-sm font-medium leading-none">或設定密碼（之後用手機＋密碼登入）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                placeholder="至少 6 個字"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={saving || !name}
                className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {saving ? "啟用中..." : "用密碼啟用"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
