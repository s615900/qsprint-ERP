"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRegisterCustomerAccount } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { LineLoginButton, OrDivider } from "../components/LineLoginButton";

export function CustomerRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const getNextPath = () => searchParams.get("next") || "/book";
  const queryClient = useQueryClient();
  const register = useRegisterCustomerAccount();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Arrived from LINE Login with no member account yet: finish with name/phone (password optional).
  const isLineSignup = searchParams.get("line") === "1";
  const [lineName, setLineName] = useState("");
  const [linePending, setLinePending] = useState(false);

  useEffect(() => {
    if (!isLineSignup) return;
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
  }, [isLineSignup, router]);

  const handleLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("請填寫姓名與手機號碼");
      return;
    }
    setLinePending(true);
    try {
      const res = await fetch("/api/auth/line/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || undefined, password: password || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "註冊失敗，請稍後再試");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast.success("註冊成功，LINE 已綁定");
      router.push(getNextPath());
    } finally {
      setLinePending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !password) {
      toast.error("請填寫姓名、手機號碼與密碼");
      return;
    }

    register.mutate(
      { data: { name, phone, password, email: email || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast.success("註冊成功");
          router.push(getNextPath());
        },
        onError: (err: any) => {
          if (err?.status === 409) {
            toast.error("此手機號碼已註冊過帳號，請改用登入");
          } else {
            toast.error("註冊失敗，請稍後再試");
          }
        },
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
          <h1 className="text-2xl font-bold text-foreground">建立會員帳號</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLineSignup ? `LINE 帳號「${lineName}」已驗證，請補充聯絡資料` : "註冊後即可線上預約並管理您的資料"}
          </p>
        </div>

        <form onSubmit={isLineSignup ? handleLineSubmit : handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">姓名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="例如：王小明"
            />
          </div>
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
            <label className="text-sm font-medium leading-none">電子信箱 (選填)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="example@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">密碼{isLineSignup ? " (選填，之後可用手機＋密碼登入)" : ""}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="請設定密碼"
            />
          </div>

          <button
            type="submit"
            disabled={register.isPending || linePending}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {register.isPending ? "註冊中..." : "註冊並登入"}
          </button>
        </form>

        {!isLineSignup && (
          <>
            <OrDivider />
            <LineLoginButton next={getNextPath()} label="使用 LINE 註冊 / 登入" />
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          已經有帳號了？{" "}
          <Link href={`/login${query ? `?${query}` : ""}`} className="text-primary font-medium hover:underline">
            前往登入
          </Link>
        </p>
      </div>
    </div>
  );
}
