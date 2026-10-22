import type { Metadata } from "next";
import { OrderList } from "@/features/orders/pages/OrderList";

export const metadata: Metadata = { title: "訂單管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <OrderList />;
}
