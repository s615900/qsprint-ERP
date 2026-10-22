import type { Metadata } from "next";
import { EditContract } from "@/features/contracts/pages/EditContract";

export const metadata: Metadata = { title: "編輯合約 | 青春止秒攝影工作室" };

export default function Page() {
  return <EditContract />;
}
