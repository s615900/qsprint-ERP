import { MessageSquare } from "lucide-react";

// Shows whether this customer has signed up / signed in with LINE.
export function MemberAccessCard({ lineBound, lineName }: { lineBound: boolean; lineName?: string | null }) {
  return (
    <div className="p-4 border-t border-border flex items-center gap-2">
      <MessageSquare className="w-4 h-4 text-[#06C755]" />
      <span className="text-sm font-medium">LINE 會員</span>
      <span
        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium border ${
          lineBound ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"
        }`}
      >
        {lineBound ? `已綁定${lineName ? `：${lineName}` : ""}` : "尚未用 LINE 註冊"}
      </span>
    </div>
  );
}
