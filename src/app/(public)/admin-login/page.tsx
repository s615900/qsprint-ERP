import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "@/features/admin-auth/AdminLogin";

export const metadata: Metadata = { title: "管理後台登入 | 青春止秒攝影工作室" };

export default function Page() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
