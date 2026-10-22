import type { Metadata } from "next";
import { NewCustomer } from "@/features/customers/pages/NewCustomer";

export const metadata: Metadata = { title: "新增客戶 | 青春止秒攝影工作室" };

export default function Page() {
  return <NewCustomer />;
}
