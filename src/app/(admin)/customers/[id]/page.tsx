import type { Metadata } from "next";
import { CustomerDetail } from "@/features/customers/pages/CustomerDetail";

export const metadata: Metadata = { title: "客戶資料 | 青春止秒攝影工作室" };

export default function Page() {
  return <CustomerDetail />;
}
