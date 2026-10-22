import type { Metadata } from "next";
import { EditQuote } from "@/features/quotes/pages/EditQuote";

export const metadata: Metadata = { title: "編輯報價單 | 青春止秒攝影工作室" };

export default function Page() {
  return <EditQuote />;
}
