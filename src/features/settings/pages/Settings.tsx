"use client";

import { CompanyForm } from "../components/CompanyForm";
import { PublicLinks } from "../components/PublicLinks";

export function Settings() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">系統設定</h1>
        <p className="text-muted-foreground mt-1 text-sm">管理營業人資料與客戶用的網址。後台人員請到「人員管理」。</p>
      </div>

      <PublicLinks />

      <CompanyForm />
    </div>
  );
}
