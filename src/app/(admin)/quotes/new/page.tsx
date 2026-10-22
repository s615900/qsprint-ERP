import type { Metadata } from "next";
import { NewQuote } from "@/features/quotes/pages/NewQuote";

export const metadata: Metadata = { title: "新增報價單 | 青春止秒攝影工作室" };

export default function Page() {
  return <NewQuote />;
}
