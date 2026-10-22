import type { Metadata } from "next";
import { EditCustomer } from "@/features/customers/pages/EditCustomer";

export const metadata: Metadata = { title: "編輯客戶 | 青春止秒攝影工作室" };

export default function Page() {
  return <EditCustomer />;
}
