import type { Metadata } from "next";
import { QuoteList } from "@/features/quotes/pages/QuoteList";

export const metadata: Metadata = { title: "報價系統 | 青春止秒攝影工作室" };

export default function Page() {
  return <QuoteList />;
}
