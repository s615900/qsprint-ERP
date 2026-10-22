"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// Local development shortcut: sign in as a test member without LINE. Never shown on the live site.
export function DevLoginButton({ next }: { next: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/admin-auth/config")
      .then((r) => r.json())
      .then((c) => setEnabled(!!c.dev_login))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  const go = async () => {
    await fetch("/api/auth/dev-login", { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    router.push(next);
  };

  return (
    <button
      type="button"
      onClick={go}
      className="w-full h-10 rounded-lg text-sm font-medium border border-dashed border-input text-muted-foreground hover:bg-accent transition-colors"
    >
      本機開發：免登入進入（僅開發環境顯示）
    </button>
  );
}
