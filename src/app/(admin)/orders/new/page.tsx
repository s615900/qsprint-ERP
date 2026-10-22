import type { Metadata } from "next";
import { NewOrder } from "@/features/orders/pages/NewOrder";

export const metadata: Metadata = { title: "新增訂單 | 青春止秒攝影工作室" };

export default function Page() {
  return <NewOrder />;
}
