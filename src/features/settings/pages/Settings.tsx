"use client";

import { CompanyForm } from "../components/CompanyForm";
import { AdminManager } from "../components/AdminManager";
import { PublicLinks } from "../components/PublicLinks";

export function Settings() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">系統設定</h1>
        <p className="text-muted-foreground mt-1 text-sm">管理營業人資料、後台人員與客戶用的網址。</p>
      </div>

      <PublicLinks />

      <CompanyForm />

      <AdminManager />
    </div>
  );
}
