export const PROJECT_STATUSES = ["洽談中", "籌備中", "拍攝中", "後製修圖", "客戶校稿", "已交付", "已結案"] as const;
export const CANCELLED = "取消";
export const PROJECT_TYPES = ["婚紗婚禮", "親子寫真", "個人寫真", "商業攝影", "活動紀錄", "形象照", "空間攝影", "其他"] as const;

export const STATUS_DOT: Record<string, string> = {
  洽談中: "bg-slate-400",
  籌備中: "bg-sky-500",
  拍攝中: "bg-amber-500",
  後製修圖: "bg-violet-500",
  客戶校稿: "bg-orange-500",
  已交付: "bg-emerald-500",
  已結案: "bg-slate-300",
};

// Past the promised delivery date and still not handed over.
export function isOverdue(p: { status: string; due_date?: string | null }): boolean {
  if (!p.due_date || ["已交付", "已結案", "取消"].includes(p.status)) return false;
  return p.due_date < new Date().toISOString().slice(0, 10);
}
