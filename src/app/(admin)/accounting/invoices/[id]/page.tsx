import type { Metadata } from "next";
import { InvoiceDetail } from "@/features/invoices/pages/InvoiceDetail";

export const metadata: Metadata = { title: "發票 | 青春止秒攝影工作室" };

export default function Page() {
  return <InvoiceDetail />;
}
