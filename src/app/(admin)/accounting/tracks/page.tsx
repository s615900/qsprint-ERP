import type { Metadata } from "next";
import { InvoiceTracks } from "@/features/invoices/pages/InvoiceTracks";

export const metadata: Metadata = { title: "字軌配號 | 青春止秒攝影工作室" };

export default function Page() {
  return <InvoiceTracks />;
}
