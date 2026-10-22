"use client";

import { MessageCircle } from "lucide-react";

// Plain anchor: the start route redirects the whole page to LINE's consent screen.
export function LineLoginButton({ next, label, invite }: { next: string; label: string; invite?: string }) {
  return (
    <a
      href={`/api/auth/line/start?mode=login&next=${encodeURIComponent(next)}${invite ? `&invite=${encodeURIComponent(invite)}` : ""}`}
      className="w-full h-11 rounded-lg font-medium text-white bg-[#06C755] hover:bg-[#05b54d] transition-colors flex items-center justify-center gap-2"
    >
      <MessageCircle className="w-4 h-4" />
      {label}
    </a>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex-1 h-px bg-border" />
      或
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
