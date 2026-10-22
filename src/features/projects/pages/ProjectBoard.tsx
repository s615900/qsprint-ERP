"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, CalendarDays, MapPin, User, ExternalLink, Trash2, Pencil, AlertTriangle, FolderKanban, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListProjects, useCreateProject, useUpdateProject, useDeleteProject, type Project, type ProjectInput } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { apiErrorMessage } from "@/lib/errors";
import { btnPrimaryLg } from "@/lib/ui";
import { ProjectDialog } from "../components/ProjectDialog";
import { PROJECT_STATUSES, CANCELLED, STATUS_DOT, isOverdue } from "../constants";

function ProjectCard({
  p,
  onEdit,
  onDelete,
  onMove,
}: {
  p: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onMove: (p: Project, status: string) => void;
}) {
  const overdue = isOverdue(p);
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(p.id))}
      className="rounded-lg border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm leading-snug">{p.name}</div>
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.project_number}・{p.project_type}</div>
        </div>
        <div className="flex shrink-0 -mr-1 -mt-1">
          <button onClick={() => onEdit(p)} aria-label="編輯" className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(p)} aria-label="刪除" className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {p.customer_id ? <Link href={`/customers/${p.customer_id}`} className="hover:text-primary hover:underline">{p.contact_name}</Link> : p.contact_name}
        </div>
        {p.shoot_date && (
          <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />拍攝 {format(new Date(p.shoot_date), "M/d")}</div>
        )}
        {p.due_date && (
          <div className={`flex items-center gap-1.5 ${overdue ? "text-destructive font-medium" : ""}`}>
            {overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />}
            交件 {format(new Date(p.due_date), "M/d")}{overdue && "（逾期）"}
          </div>
        )}
        {p.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{p.location}</div>}
        {p.order_id && (
          <Link href={`/orders/${p.order_id}`} className="flex items-center gap-1.5 hover:text-primary hover:underline">
            <ShoppingBag className="w-3.5 h-3.5" />{p.order_number}
          </Link>
        )}
        {p.assigned_staff && <div className="text-foreground/70">負責：{p.assigned_staff}</div>}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        {p.delivery_link ? (
          <a href={p.delivery_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> 交付連結
          </a>
        ) : <span />}
        {/* Dropdown fallback for touch screens where dragging is awkward. */}
        <select
          value={p.status}
          onChange={(e) => onMove(p, e.target.value)}
          aria-label="切換進度"
          className="h-7 rounded border border-input bg-background px-1.5 text-xs"
        >
          {[...PROJECT_STATUSES, CANCELLED].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

export function ProjectBoard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const { data: projects, isLoading } = useListProjects(search ? { search } : {});
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const refresh = () => invalidateApi(queryClient, "/api/projects");

  const move = (p: Project, status: string) => {
    if (p.status === status) return;
    updateProject.mutate(
      { id: p.id, data: { status: status as ProjectInput["status"] } },
      { onSuccess: refresh, onError: (err) => toast.error(apiErrorMessage(err, "更新進度失敗")) },
    );
  };

  const handleSave = (data: ProjectInput) => {
    const done = {
      onSuccess: () => { toast.success(editing ? "專案已更新" : "專案已建立"); setDialogOpen(false); setEditing(null); refresh(); },
      onError: (err: unknown) => toast.error(apiErrorMessage(err, "儲存失敗")),
    };
    if (editing) updateProject.mutate({ id: editing.id, data }, done);
    else createProject.mutate({ data }, done);
  };

  const handleDelete = (p: Project) => {
    if (!confirm(`確定要刪除專案「${p.name}」嗎？`)) return;
    deleteProject.mutate({ id: p.id }, { onSuccess: () => { toast.success("已刪除"); refresh(); }, onError: () => toast.error("刪除失敗") });
  };

  const openEdit = (p: Project) => { setEditing(p); setDialogOpen(true); };
  const cancelled = projects?.filter((p) => p.status === CANCELLED) ?? [];
  const active = projects?.filter((p) => p.status !== CANCELLED && p.status !== "已結案") ?? [];
  const overdueCount = active.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">專案進度</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            從洽談到交件的每個專案一目了然，拖曳卡片即可切換進度。
            {!isLoading && <> 進行中 {active.length} 件{overdueCount > 0 && <span className="text-destructive">，{overdueCount} 件逾期</span>}。</>}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="搜尋專案、客戶..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button onClick={() => { setEditing(null); setDialogOpen(true); }} className={btnPrimaryLg}>
            <Plus className="w-4 h-4" /> 新增專案
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : projects?.length === 0 && !search ? (
        <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
          <FolderKanban className="w-10 h-10 text-muted-foreground/40" />
          還沒有專案。訂單或合約頁面可以直接「建立專案」，也能點右上角手動新增。
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x lg:grid lg:grid-cols-4 2xl:grid-cols-7 lg:overflow-visible">
          {PROJECT_STATUSES.map((status) => {
            const cards = projects?.filter((p) => p.status === status) ?? [];
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const p = projects?.find((x) => x.id === Number(e.dataTransfer.getData("text/plain")));
                  if (p) move(p, status);
                }}
                className={`min-w-[260px] lg:min-w-0 snap-start rounded-xl p-3 space-y-3 transition-colors ${dragOver === status ? "bg-primary/10" : "bg-muted/50"}`}
              >
                <h2 className="flex items-center gap-2 text-sm font-semibold px-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                  {status}
                  <span className="text-muted-foreground font-normal">{cards.length}</span>
                </h2>
                {cards.map((p) => <ProjectCard key={p.id} p={p} onEdit={openEdit} onDelete={handleDelete} onMove={move} />)}
                {cards.length === 0 && <p className="text-xs text-muted-foreground/70 px-1 py-4 text-center">拖曳卡片到這裡</p>}
              </div>
            );
          })}
        </div>
      )}

      {cancelled.length > 0 && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">已取消的專案（{cancelled.length}）</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cancelled.map((p) => <ProjectCard key={p.id} p={p} onEdit={openEdit} onDelete={handleDelete} onMove={move} />)}
          </div>
        </details>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        initial={editing}
        isPending={createProject.isPending || updateProject.isPending}
        onSubmit={handleSave}
      />
    </div>
  );
}
