import type { Metadata } from "next";
import { EditOrder } from "@/features/orders/pages/EditOrder";

export const metadata: Metadata = { title: "編輯訂單 | 青春止秒攝影工作室" };

export default function Page() {
  return <EditOrder />;
}
