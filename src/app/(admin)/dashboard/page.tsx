import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/pages/Dashboard";

export const metadata: Metadata = { title: "儀表板 | 青春止秒攝影工作室" };

export default function Page() {
  return <Dashboard />;
}
