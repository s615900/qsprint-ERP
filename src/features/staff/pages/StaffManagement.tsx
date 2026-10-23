"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Phone, UserCog, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  type StaffMember,
  type StaffInput,
} from "@/lib/api-client";
import { ApiError } from "@/lib/api-client/custom-fetch";
import { Switch } from "@/components/ui/switch";
import { invalidateApi } from "@/lib/invalidate";
import { StaffAvatar, resizeToAvatar } from "@/components/StaffAvatar";
import { StaffAdminAccess, type AccessEntry } from "../components/StaffAdminAccess";

type AccessInfo = {
  access: AccessEntry[];
  other_admins: { id: number; display_name: string }[];
  env_admin_count: number;
  oa_id: string | null;
};

const ROLES = ["攝影師", "造型師", "修圖師", "助理", "管理員"];

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Server sends {error} with a readable Chinese message on 409.
const messageOf = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.status === 409 && typeof (err.data as { error?: string })?.error === "string"
    ? (err.data as { error: string }).error
    : fallback;

function StaffForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
}: {
  initial?: StaffMember;
  isPending: boolean;
  onSubmit: (data: StaffInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? ROLES[0]);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), role, phone: phone.trim() || null, notes: notes.trim() || null });
      }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{initial ? `編輯「${initial.name}」` : "新增人員"}</span>
        <button type="button" onClick={onCancel} aria-label="取消" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">名稱 *（預約上會顯示這個名字）</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：陳攝影師" className={inputCls} required autoFocus />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">職務</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {!ROLES.includes(role) && <option>{role}</option>}
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">電話</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </label>
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備註（例：擅長婚紗、只接週末）" className={inputCls} />
      {initial && initial.booking_count > 0 && name.trim() && name.trim() !== initial.name && (
        <p className="text-xs text-amber-700">改名後，已指派給他的 {initial.booking_count} 筆預約也會一起改成新名字。</p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={isPending || !name.trim()} className="h-9 px-5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm">
          {isPending ? "儲存中..." : initial ? "儲存變更" : "新增"}
        </button>
      </div>
    </form>
  );
}

export function StaffManagement() {
  const queryClient = useQueryClient();
  const { data: staff, isLoading } = useListStaff({ include_inactive: "true" });
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const loadAccess = useCallback(async () => {
    const res = await fetch("/api/admin/access");
    if (res.ok) setAccessInfo(await res.json());
  }, []);
  useEffect(() => {
    loadAccess();
  }, [loadAccess]);
  // While someone is waiting to bind, check again so the row flips to "可登入後台" by itself.
  const hasPending = accessInfo?.access.some((a) => a.status === "pending") ?? false;
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(loadAccess, 4000);
    return () => clearInterval(t);
  }, [hasPending, loadAccess]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  // Booking lists show staff names, so refresh them after a rename.
  const refresh = () => {
    loadAccess();
    invalidateApi(queryClient, "/api/staff", "/api/photographers", "/api/availability", "/api/bookings", "/api/customers", "/api/dashboard");
  };
  const close = () => { setFormOpen(false); setEditing(null); };

  const handleSave = (data: StaffInput) => {
    const done = {
      onSuccess: () => {
        toast.success(editing ? "已更新" : "已新增");
        close();
        refresh();
      },
      onError: (err: unknown) => toast.error(messageOf(err, "儲存失敗")),
    };
    if (editing) updateStaff.mutate({ id: editing.id, data }, done);
    else createStaff.mutate({ data }, done);
  };

  const handleActive = (member: StaffMember, active: boolean) => {
    if (!active && member.upcoming_count > 0 &&
      !confirm(`${member.name} 還有 ${member.upcoming_count} 筆即將到來的預約。停用後這些預約仍會保留他的名字，但新預約就選不到他了。確定停用？`)) return;
    updateStaff.mutate(
      { id: member.id, data: { active } },
      {
        onSuccess: () => {
          toast.success(active ? `${member.name} 已恢復` : `${member.name} 已停用`);
          refresh();
        },
        onError: () => toast.error("更新失敗"),
      },
    );
  };

  const saveAvatar = async (member: StaffMember, avatar: string | null) => {
    const res = await fetch(`/api/staff/${member.id}/avatar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar }),
    });
    if (res.ok) {
      toast.success(avatar ? "大頭貼已更新" : "大頭貼已移除");
      refresh();
    } else toast.error("大頭貼儲存失敗");
  };

  const pickAvatar = async (member: StaffMember, file: File | undefined) => {
    if (!file) return;
    try {
      await saveAvatar(member, await resizeToAvatar(file));
    } catch {
      toast.error("無法讀取這張圖片，請換一張");
    }
  };

  const handleDelete = (member: StaffMember) => {
    if (!confirm(`確定要刪除 ${member.name} 嗎？`)) return;
    deleteStaff.mutate(
      { id: member.id },
      {
        onSuccess: () => {
          toast.success("已刪除");
          refresh();
        },
        onError: (err) => toast.error(messageOf(err, "刪除失敗")),
      },
    );
  };

  const activeCount = staff?.filter((s) => s.active).length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">人員管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理攝影師與工作人員，預約時就能從這份名單指派；也可以在這裡開啟人員的後台登入權限。</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 shadow-sm hover-elevate"
        >
          <Plus className="w-4 h-4" /> 新增人員
        </button>
      </div>

      {formOpen && (
        <StaffForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          isPending={createStaff.isPending || updateStaff.isPending}
          onSubmit={handleSave}
          onCancel={close}
        />
      )}

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 sm:px-6 border-b border-border text-sm text-muted-foreground">
          在職 {activeCount} 位{staff && staff.length > activeCount && `・已停用 ${staff.length - activeCount} 位`}
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
        ) : staff?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <UserCog className="w-10 h-10 text-muted-foreground/40" />
            還沒有人員，點右上角「新增人員」開始
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {staff?.map((m) => (
              <li key={m.id} className={`px-4 sm:px-6 py-4 flex items-center gap-4 ${m.active ? "" : "bg-muted/30"}`}>
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <label className="relative cursor-pointer group" title="點一下上傳大頭貼">
                    <StaffAvatar
                      name={m.name}
                      src={m.avatar}
                      className={`w-14 h-14 border ${m.active ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                      <Camera className="w-3 h-3" />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        pickAvatar(m, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {m.avatar && (
                    <button type="button" onClick={() => saveAvatar(m, null)} className="text-[10px] text-muted-foreground hover:text-destructive underline">
                      移除
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${m.active ? "" : "text-muted-foreground"}`}>{m.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{m.role}</span>
                    {!m.active && <span className="text-xs text-muted-foreground">已停用</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {m.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                    <span>即將到來 {m.upcoming_count} 筆・累計 {m.booking_count} 筆預約</span>
                    {m.notes && <span className="truncate">{m.notes}</span>}
                  </div>
                  <StaffAdminAccess
                    staffId={m.id}
                    staffName={m.name}
                    entry={accessInfo?.access.find((a) => a.staff_id === m.id)}
                    oaId={accessInfo?.oa_id ?? null}
                    onChanged={loadAccess}
                  />
                </div>
                <label className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground cursor-pointer shrink-0">
                  <Switch checked={m.active} onCheckedChange={(on) => handleActive(m, on)} />
                  {m.active ? "在職" : "停用"}
                </label>
                <div className="flex shrink-0">
                  <span className="sm:hidden">
                    <Switch checked={m.active} onCheckedChange={(on) => handleActive(m, on)} aria-label={m.active ? "停用" : "恢復"} />
                  </span>
                  <button
                    onClick={() => { setEditing(m); setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    aria-label="編輯"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    disabled={m.booking_count > 0}
                    title={m.booking_count > 0 ? "有預約紀錄的人員不能刪除，請改用停用" : "刪除"}
                    aria-label="刪除"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {accessInfo && (accessInfo.other_admins.length > 0 || accessInfo.env_admin_count > 0) && (
        <div className="bg-card rounded-xl border shadow-sm p-4 sm:px-6 space-y-2">
          <p className="text-sm font-medium">其他後台管理員（不在上方人員名單內）</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {accessInfo.other_admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{a.display_name || "（未命名）"}</span>
                <button
                  className="text-xs hover:text-destructive underline"
                  onClick={async () => {
                    if (!confirm(`移除管理員「${a.display_name}」？`)) return;
                    await fetch(`/api/admin/admins/${a.id}`, { method: "DELETE" });
                    loadAccess();
                  }}
                >
                  移除
                </button>
              </li>
            ))}
            {accessInfo.env_admin_count > 0 && <li>另有 {accessInfo.env_admin_count} 位由系統環境變數設定（無法在此移除）</li>}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">有預約紀錄的人員不能刪除，請用「停用」：舊預約會保留他的名字，新預約就選不到他。</p>
    </div>
  );
}
