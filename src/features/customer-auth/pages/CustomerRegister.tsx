"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { LineLoginButton } from "../components/LineLoginButton";
import { DevLoginButton } from "../components/DevLoginButton";

const inputCls =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Sign-up is LINE only. After LINE approves, new members land here to add their name and phone.
export function CustomerRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/book";
  const afterLine = searchParams.get("line") === "1";
  const queryClient = useQueryClient();

  const [lineName, setLineName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!afterLine) return;
    fetch("/api/auth/line/register")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLineName(data.display_name);
        setName((n) => n || data.display_name);
      })
      .catch(() => {
        toast.error("LINE 登入已逾時，請重新操作");
        router.replace("/login");
      });
  }, [afterLine, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/line/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || undefined }),
      });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "註冊失敗，請稍後再試");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast.success("註冊成功，歡迎加入");
      router.push(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <Camera className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg tracking-wide text-sidebar">青春止秒攝影工作室</span>
      </div>

      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-border p-8 space-y-6">
        {afterLine ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">完成會員註冊</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {lineName ? `LINE「${lineName}」已驗證，請補充聯絡資料` : "載入中..."}
              </p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium leading-none">姓名</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="例如：王小明" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium leading-none">手機號碼</span>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="0912-345-678" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium leading-none">電子信箱 (選填)</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="example@email.com" />
              </label>
              <button
                type="submit"
                disabled={saving || !lineName}
                className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {saving ? "註冊中..." : "完成註冊"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">會員註冊</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                使用 LINE 註冊，免填密碼
              </p>
            </div>
            <LineLoginButton next={next} label="使用 LINE 註冊 / 登入" />
            <DevLoginButton next={next} />
          </>
        )}
      </div>
    </div>
  );
}
