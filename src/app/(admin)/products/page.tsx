import type { Metadata } from "next";
import { ProductManagement } from "@/features/products/ProductManagement";

export const metadata: Metadata = { title: "商品管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <ProductManagement />;
}
