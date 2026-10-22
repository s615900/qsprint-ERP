import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CalendarCheck } from "lucide-react";

export const metadata: Metadata = { title: "青春止秒攝影工作室" };

// Customer-facing front door. The back office lives under /dashboard and has its own login.
export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-border p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <Camera className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-wide text-sidebar">青春止秒攝影工作室</h1>
          <p className="text-muted-foreground text-sm">線上預約拍攝、查看會員資料</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/book"
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" /> 線上預約
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          按「線上預約」，用 LINE 登入後補充姓名與手機即可預約。
        </p>
      </div>
      <Link href="/admin-login" className="mt-6 text-xs text-muted-foreground/70 hover:text-foreground">
        工作室人員登入
      </Link>
    </div>
  );
}
