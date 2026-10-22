import type { Metadata } from "next";
import { TaxReport } from "@/features/tax/pages/TaxReport";

export const metadata: Metadata = { title: "營業稅申報（401） | 青春止秒攝影工作室" };

export default function Page() {
  return <TaxReport />;
}
