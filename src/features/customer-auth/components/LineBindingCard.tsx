"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

type LineStatus = {
  bound: boolean;
  display_name: string | null;
  login_enabled: boolean;
  code_enabled: boolean;
  oa_id: string | null;
};

const QUERY_KEY = ["/api/auth/line/status"];

const LINE_ERRORS: Record<string, string> = {
  taken: "此 LINE 帳號已綁定其他會員",
  cancelled: "已取消 LINE 綁定",
  state: "LINE 綁定已逾時，請再試一次",
  profile: "無法取得 LINE 資料，請再試一次",
};

export function LineBindingCard() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery<LineStatus>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/auth/line/status");
      if (!res.ok) throw new Error();
      return res.json();
    },
    // While a code is showing, poll so the card flips to "已綁定" once the customer sends it.
    refetchInterval: code ? 3000 : false,
  });

  const lineParam = searchParams.get("line");
  const lineError = searchParams.get("line_error");
  useEffect(() => {
    if (lineParam === "bound") toast.success("LINE 綁定成功");
    if (lineError) toast.error(LINE_ERRORS[lineError] ?? "LINE 綁定失敗");
  }, [lineParam, lineError]);

  useEffect(() => {
    if (data?.bound) setCode(null);
  }, [data?.bound]);

  if (!data) return null;

  const requestCode = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/line/bind-code", { method: "POST" });
      if (!res.ok) throw new Error();
      setCode((await res.json()).code);
    } catch {
      toast.error("取得驗證碼失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-[#06C755]" />
        <h2 className="font-semibold text-sm">LINE 綁定</h2>
      </div>
      <div className="p-6 space-y-4 text-sm">
        {data.bound ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">已綁定{data.display_name ? `：${data.display_name}` : ""}</p>
              <p className="text-xs text-muted-foreground mt-0.5">這是您的登入帳號，預約進度更新時也會透過 LINE 通知您</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">綁定後可用 LINE 一鍵登入，並收到預約確認與進度通知。</p>
            {data.login_enabled && (
              <a
                href="/api/auth/line/start?mode=bind&next=/account"
                className="w-full h-10 rounded-lg font-medium text-white bg-[#06C755] hover:bg-[#05b54d] transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> 用 LINE 帳號綁定
              </a>
            )}
            {data.code_enabled && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="font-medium">或：用驗證碼綁定</p>
                {code ? (
                  <>
                    <p className="text-3xl font-bold tracking-[0.3em] text-center">{code}</p>
                    <p className="text-xs text-muted-foreground text-center">
                      10 分鐘內，到 LINE 官方帳號{data.oa_id ? ` ${data.oa_id} ` : " "}傳送這組數字即可完成綁定
                    </p>
                  </>
                ) : (
                  <button
                    onClick={requestCode}
                    disabled={busy}
                    className="h-9 px-4 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {busy ? "產生中..." : "取得綁定驗證碼"}
                  </button>
                )}
              </div>
            )}
            {!data.login_enabled && !data.code_enabled && (
              <p className="text-xs text-muted-foreground">LINE 功能尚未開通，請聯絡工作室。</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
