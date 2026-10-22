"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export type AccessEntry =
  | { staff_id: number; status: "pending"; code: string; expires_at: string }
  | { staff_id: number; status: "active"; admin_id: number; line_name: string };

// One staff member's back-office access: open it, hand over the binding code, or close it again.
export function StaffAdminAccess({
  staffId,
  staffName,
  entry,
  oaId,
  onChanged,
}: {
  staffId: number;
  staffName: string;
  entry?: AccessEntry;
  oaId: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const call = async (method: "POST" | "DELETE", okMessage: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/admin-access`, { method });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "操作失敗");
        return;
      }
      toast.success(okMessage);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const open = () => call("POST", "已產生綁定碼，請把它交給對方");
  const close = () => {
    if (!window.confirm(`關閉「${staffName}」的後台權限？他之後就不能登入後台。`)) return;
    return call("DELETE", "已關閉後台權限");
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("已複製綁定碼");
  };

  const linkBtn = "text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50";

  if (entry?.status === "active") {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
          <ShieldCheck className="w-3 h-3" /> 可登入後台
        </span>
        <span className="text-muted-foreground">已綁定 LINE：{entry.line_name}</span>
        <button onClick={open} disabled={busy} className={linkBtn} title="對方換手機時，產生新的綁定碼重新綁定">重新綁定</button>
        <button onClick={close} disabled={busy} className={`${linkBtn} hover:text-destructive`}>關閉權限</button>
      </div>
    );
  }

  if (entry?.status === "pending") {
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-amber-800">等待綁定</span>
          <button onClick={() => copy(entry.code)} title="點一下複製" className="font-mono text-base font-bold tracking-widest hover:text-primary">
            {entry.code}
          </button>
          <span className="text-muted-foreground">{format(new Date(entry.expires_at), "MM/dd HH:mm")} 前有效</span>
          <button onClick={open} disabled={busy} className={linkBtn}>重新產生</button>
          <button onClick={close} disabled={busy} className={`${linkBtn} hover:text-destructive`}>取消</button>
        </div>
        <p className="text-muted-foreground">
          請對方用 LINE 把這組碼傳到官方帳號{oaId ? ` ${oaId}` : ""}，收到「綁定成功」就能登入後台。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        onClick={open}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
      >
        <ShieldOff className="w-3 h-3" /> 開啟後台權限
      </button>
    </div>
  );
}
