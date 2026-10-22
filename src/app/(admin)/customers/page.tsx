import type { Metadata } from "next";
import { CustomerList } from "@/features/customers/pages/CustomerList";

export const metadata: Metadata = { title: "客戶管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <CustomerList />;
}
