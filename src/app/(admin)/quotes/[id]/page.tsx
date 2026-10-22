import type { Metadata } from "next";
import { QuoteDetail } from "@/features/quotes/pages/QuoteDetail";

export const metadata: Metadata = { title: "報價單 | 青春止秒攝影工作室" };

export default function Page() {
  return <QuoteDetail />;
}
