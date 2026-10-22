import type { Metadata } from "next";
import { Purchases } from "@/features/tax/pages/Purchases";

export const metadata: Metadata = { title: "進項憑證 | 青春止秒攝影工作室" };

export default function Page() {
  return <Purchases />;
}
