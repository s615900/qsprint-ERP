import type { Metadata } from "next";
import { OrderDetail } from "@/features/orders/pages/OrderDetail";

export const metadata: Metadata = { title: "訂單詳情 | 青春止秒攝影工作室" };

export default function Page() {
  return <OrderDetail />;
}
