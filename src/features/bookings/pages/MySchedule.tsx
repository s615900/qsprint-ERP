"use client";

import { useEffect, useState } from "react";
import { StaffScheduleEditor } from "./ScheduleSettings";

type Me = { id: number; name: string };

// A photographer's own page, reached through a personal link from the studio.
export function MySchedule({ token }: { token: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/my-schedule?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : Promise.reject()))
      .then(setMe)
      .catch(() => setFailed(true));
  }, [token]);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{me ? `${me.name} 的排班` : "我的排班"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">自己決定哪幾天、哪些時段開放客人預約。工作室後台會看到您的設定。</p>
        </div>
        {failed ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">連結無效或已失效，請向工作室索取新的連結。</div>
        ) : !me ? (
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        ) : (
          <StaffScheduleEditor staffId={me.id} staffName={me.name} />
        )}
      </div>
    </div>
  );
}
