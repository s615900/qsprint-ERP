import type { Metadata } from "next";
import { Accounting } from "@/features/accounting/pages/Accounting";

export const metadata: Metadata = { title: "會計系統 | 青春止秒攝影工作室" };

export default function Page() {
  return <Accounting />;
}
