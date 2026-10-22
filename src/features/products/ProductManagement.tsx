"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Package as PackageIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { formatTWD } from "@/lib/money";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  features: string[];
  active: boolean;
};

const CATEGORIES = ["新人婚紗", "親子寫真", "個人寫真", "企業商業客戶"];

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Draft = Omit<Product, "id">;
const emptyDraft = (): Draft => ({ name: "", description: "", price: 0, category: CATEGORIES[0], features: [], active: true });

function ProductForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: Product;
  saving: boolean;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial ? { ...initial } : emptyDraft());
  const [featuresText, setFeaturesText] = useState((initial?.features ?? []).join("\n"));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...d, features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean) });
      }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{initial ? `編輯「${initial.name}」` : "新增商品"}</span>
        <button type="button" onClick={onCancel} aria-label="取消" className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted-foreground">商品名稱 *</span>
          <input required value={d.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="例：親子寫真套組" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">類別 *</span>
          <input
            required
            list="product-categories"
            value={d.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputCls}
          />
          <datalist id="product-categories">
            {CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">價格（含稅，元）*</span>
          <input
            required
            type="number"
            min={0}
            value={d.price}
            onChange={(e) => set("price", Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">簡短說明</span>
          <input value={d.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted-foreground">包含內容（一行一項）</span>
          <textarea
            rows={4}
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            className={`${inputCls} h-auto py-2`}
            placeholder={"棚拍\n30張精修照\n數位檔案"}
          />
        </label>
      </div>
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={d.active} onCheckedChange={(v) => set("active", v)} />
          上架（客戶預約頁看得到）
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="h-9 px-4 rounded-md text-sm border border-input bg-background hover:bg-accent">
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (draft: Draft) => {
    setSaving(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/products" : `/api/products/${(editing as Product).id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "儲存失敗");
        return;
      }
      toast.success(isNew ? "已新增商品" : "已更新商品");
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product, active: boolean) => {
    const { id, ...rest } = p;
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, active }),
    });
    if (!res.ok) return toast.error("更新失敗");
    load();
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`確定刪除「${p.name}」？\n已建立的預約、報價單、訂單不受影響。若只是暫時不賣，建議改成「下架」。`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("刪除失敗");
    toast.success("已刪除");
    load();
  };

  const categories = [...new Set((products ?? []).map((p) => p.category))];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">商品管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            管理拍攝方案與價格。上架的商品會出現在客戶預約頁，也能在報價單、訂單一鍵加入。
          </p>
        </div>
        {editing === null && (
          <button
            onClick={() => setEditing("new")}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> 新增商品
          </button>
        )}
      </div>

      {editing !== null && (
        <ProductForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          saving={saving}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {products === null ? (
        <p className="text-sm text-muted-foreground">載入中...</p>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          還沒有商品，按右上角「新增商品」開始建立
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products
                .filter((p) => p.category === cat)
                .map((p) => (
                  <div key={p.id} className={`rounded-xl border bg-card p-5 shadow-sm space-y-3 ${p.active ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <PackageIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-tight">{p.name}</h3>
                        </div>
                      </div>
                      <span className="text-lg font-semibold tabular-nums text-primary shrink-0">{formatTWD(p.price)}</span>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    {p.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.features.map((f) => (
                          <span key={f} className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground/80">{f}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={p.active} onCheckedChange={(v) => toggleActive(p, v)} />
                        {p.active ? "上架中" : "已下架"}
                      </label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditing(p)}
                          aria-label="編輯"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          aria-label="刪除"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
