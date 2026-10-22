"use client";

import { CompanyForm } from "../components/CompanyForm";
import { AdminManager } from "../components/AdminManager";
import { MessageSquare, Calendar, Unplug } from "lucide-react";

interface IntegrationConfig {
  id: string;
  name: string;
  icon: typeof MessageSquare;
  description: string;
  envVars: string[];
}

const integrations: IntegrationConfig[] = [
  {
    id: "line-login",
    name: "LINE Login 會員綁定",
    icon: MessageSquare,
    description: "已完成程式：LINE 帳號登入／註冊、會員中心綁定、官方帳號驗證碼綁定，以及預約建立與狀態變更時推播通知。填入下列環境變數即啟用；Webhook 網址為「網站網址/api/line/webhook」。",
    envVars: ["LINE_LOGIN_CHANNEL_ID", "LINE_LOGIN_CHANNEL_SECRET", "LINE_MESSAGING_CHANNEL_SECRET", "LINE_MESSAGING_ACCESS_TOKEN", "LINE_OA_ID", "APP_URL"],
  },
  {
    id: "google-calendar",
    name: "Google 日曆同步",
    icon: Calendar,
    description: "預約建立、修改或取消時自動同步至工作室的 Google 日曆事件，取代目前僅用本機資料判斷檔期衝突的方式。",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
];

export function Settings() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">系統設定</h1>
        <p className="text-muted-foreground mt-1 text-sm">管理系統整合、通知與基本設定。</p>
      </div>

      <CompanyForm />

      <AdminManager />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">外部服務串接</h2>
          <p className="text-sm text-muted-foreground mt-1">
            LINE 功能已完成，填入金鑰即啟用；Google 日曆同步尚在規劃中。金鑰請填在環境變數（.env.local 或 Vercel）。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map(integration => (
            <div key={integration.id} className="border rounded-xl bg-card text-card-foreground p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <integration.icon className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  <Unplug className="w-3 h-3" />
                  未連接
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{integration.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{integration.description}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  待金鑰到位後，請貼入 環境變數（.env.local / Vercel）：
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {integration.envVars.map(v => (
                    <code
                      key={v}
                      className="px-2 py-1 rounded bg-muted text-[11px] font-mono text-foreground/80 border border-border/70"
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
