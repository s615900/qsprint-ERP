import type { Metadata } from "next";
import { InvoiceList } from "@/features/invoices/pages/InvoiceList";

export const metadata: Metadata = { title: "發票管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <InvoiceList />;
}
