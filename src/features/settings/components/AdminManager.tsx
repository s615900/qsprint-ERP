"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Admin = { id: number; line_user_id: string; display_name: string; created_at: string };

export function AdminManager() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [envCount, setEnvCount] = useState(0);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (!res.ok) return;
    const data = await res.json();
    setAdmins(data.admins);
    setEnvCount(data.env_admin_count);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createInvite = async () => {
    const res = await fetch("/api/admin/invites", { method: "POST" });
    if (!res.ok) return toast.error("產生邀請連結失敗");
    setInviteUrl((await res.json()).url);
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("已複製邀請連結");
  };

  const remove = async (a: Admin) => {
    if (!window.confirm(`確定移除管理員「${a.display_name || a.line_user_id}」？`)) return;
    const res = await fetch(`/api/admin/admins/${a.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error((await res.json()).error ?? "移除失敗");
    load();
  };

  return (
    <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">後台管理員</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        管理員用 LINE 登入後台。要新增人，請產生邀請連結傳給對方（24 小時內、僅能使用一次），對方開啟後用 LINE 登入即加入。
        {envCount > 0 && ` 另有 ${envCount} 位由系統環境變數設定（無法在此移除）。`}
      </p>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {admins.length === 0 && <li className="p-3 text-sm text-muted-foreground">尚未透過邀請新增其他管理員</li>}
        {admins.map((a) => (
          <li key={a.id} className="p-3 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{a.display_name || "（未命名）"}</p>
              <p className="text-xs text-muted-foreground">加入於 {format(new Date(a.created_at), "yyyy/MM/dd")}</p>
            </div>
            <button onClick={() => remove(a)} className="text-xs text-muted-foreground hover:text-destructive underline">
              移除
            </button>
          </li>
        ))}
      </ul>

      {inviteUrl ? (
        <div className="space-y-2">
          <code className="block break-all rounded bg-muted border border-border px-2 py-1.5 text-xs">{inviteUrl}</code>
          <button onClick={copy} className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            複製連結
          </button>
        </div>
      ) : (
        <button onClick={createInvite} className="h-9 px-4 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent">
          產生邀請連結
        </button>
      )}
    </div>
  );
}
