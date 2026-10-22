"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

const LINKS = [
  { path: "/book", title: "線上預約頁", note: "客戶選攝影師、方案、時段並送出預約。未登入會先請他用 LINE 註冊 / 登入。" },
  { path: "/login", title: "會員登入頁", note: "會員用 LINE 登入；第一次使用會自動帶去註冊。" },
  { path: "/account", title: "會員中心", note: "會員查看資料、綁定 LINE。" },
];

export function PublicLinks() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("已複製網址");
  };

  return (
    <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">客戶用的網址</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        貼到 LINE 官方帳號、Instagram 或名片即可。客戶按「使用 LINE 登入」就會自動註冊成會員，不需要連結。
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {LINKS.map((l) => {
          const url = `${origin}${l.path}`;
          return (
            <li key={l.path} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.note}</p>
                <code className="block mt-1 text-xs break-all text-foreground/80">{url}</code>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => copy(url)}
                  aria-label="複製網址"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="開啟"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
