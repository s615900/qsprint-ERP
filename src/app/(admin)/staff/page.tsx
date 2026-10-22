import type { Metadata } from "next";
import { StaffManagement } from "@/features/staff/pages/StaffManagement";

export const metadata: Metadata = { title: "人員管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <StaffManagement />;
}
