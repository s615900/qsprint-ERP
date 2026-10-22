"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Admin = { id: number; line_user_id: string; display_name: string; created_at: string };
type Pending = { id: number; name: string; code: string; expires_at: string };

export function AdminManager() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [envCount, setEnvCount] = useState(0);
  const [pending, setPending] = useState<Pending[]>([]);
  const [oaId, setOaId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, p] = await Promise.all([fetch("/api/admin/admins"), fetch("/api/admin/invites")]);
    if (a.ok) {
      const data = await a.json();
      setAdmins(data.admins);
      setEnvCount(data.env_admin_count);
    }
    if (p.ok) {
      const data = await p.json();
      setPending(data.pending);
      setOaId(data.oa_id);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while someone is waiting to bind, so the row moves to the admin list by itself.
  useEffect(() => {
    if (!pending.length) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [pending.length, load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "新增失敗");
        return;
      }
      setName("");
      toast.success("已新增，請把綁定碼交給對方");
      load();
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("已複製");
  };

  const cancel = async (p: Pending) => {
    if (!window.confirm(`取消「${p.name}」的綁定碼？`)) return;
    await fetch(`/api/admin/invites/${p.id}`, { method: "DELETE" });
    load();
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
        新增人員後會產生一組綁定碼。請對方把綁定碼<b>傳到工作室的官方 LINE{oaId ? `（${oaId}）` : ""}</b>，系統回覆「綁定成功」後，他就能用 LINE 登入後台。綁定碼 24 小時內有效、只能用一次。
        {envCount > 0 && ` 另有 ${envCount} 位由系統環境變數設定（無法在此移除）。`}
      </p>

      <form onSubmit={add} className="flex gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="人員名稱，例如：小美（營運）"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          新增並產生綁定碼
        </button>
      </form>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">等待綁定</p>
          <ul className="divide-y divide-border rounded-lg border border-amber-200 bg-amber-50/50">
            {pending.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.expires_at), "MM/dd HH:mm")} 前有效
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copy(p.code)}
                    title="點一下複製"
                    className="font-mono text-lg font-bold tracking-widest hover:text-primary"
                  >
                    {p.code}
                  </button>
                  <button onClick={() => cancel(p)} className="text-xs text-muted-foreground hover:text-destructive underline">
                    取消
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">已綁定的管理員</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {admins.length === 0 && <li className="p-3 text-sm text-muted-foreground">尚未新增其他管理員</li>}
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
      </div>
    </div>
  );
}
