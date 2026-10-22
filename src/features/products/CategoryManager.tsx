"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export type Category = { id: number; name: string; sort_order: number; product_count: number };

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

async function problem(res: Response, fallback: string) {
  return (await res.json().catch(() => ({}))).error ?? fallback;
}

// Add, rename, reorder and delete product categories.
export function CategoryManager({
  categories,
  onChanged,
  onClose,
}: {
  categories: Category[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<Response>, fail: string, ok?: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(await problem(res, fail));
        return false;
      }
      if (ok) toast.success(ok);
      onChanged();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const done = await run(
      () => fetch("/api/product-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) }),
      "新增失敗",
      "已新增類別",
    );
    if (done) setNewName("");
  };

  const rename = async () => {
    if (!renaming) return;
    const done = await run(
      () => fetch(`/api/product-categories/${renaming.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: renaming.name }) }),
      "改名失敗",
      "已改名，這個類別的商品也一併更新",
    );
    if (done) setRenaming(null);
  };

  // Swap with the neighbour, then renumber everything 0..n-1 so the order is always unambiguous.
  const move = (index: number, dir: -1 | 1) => {
    const next = [...categories];
    const other = index + dir;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    run(async () => {
      let last: Response = new Response(null, { status: 204 });
      for (const [position, c] of next.entries()) {
        if (c.sort_order === position) continue;
        last = await fetch(`/api/product-categories/${c.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: position }),
        });
        if (!last.ok) return last;
      }
      return last;
    }, "調整順序失敗");
  };

  const remove = (c: Category) => {
    if (!window.confirm(`刪除類別「${c.name}」？`)) return;
    run(() => fetch(`/api/product-categories/${c.id}`, { method: "DELETE" }), "刪除失敗", "已刪除類別");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">類別管理</span>
        <button type="button" onClick={onClose} aria-label="關閉" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新類別名稱，例如：加購、證件照" className={inputCls} />
        <button type="submit" disabled={busy} className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Plus className="w-4 h-4" /> 新增
        </button>
      </form>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {categories.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 p-2 text-sm">
            {renaming?.id === c.id ? (
              <>
                <input
                  autoFocus
                  value={renaming.name}
                  onChange={(e) => setRenaming({ id: c.id, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && rename()}
                  className={inputCls}
                />
                <button onClick={rename} disabled={busy} aria-label="儲存" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setRenaming(null)} aria-label="取消" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="font-medium flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.product_count} 項商品</span>
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="上移" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={busy || i === categories.length - 1} aria-label="下移" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button onClick={() => setRenaming({ id: c.id, name: c.name })} aria-label="改名" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={busy || c.product_count > 0}
                  title={c.product_count > 0 ? "底下還有商品，請先改到其他類別" : "刪除"}
                  aria-label="刪除"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">改名時，這個類別底下的商品會一起更新；底下還有商品的類別不能刪除。</p>
    </div>
  );
}
