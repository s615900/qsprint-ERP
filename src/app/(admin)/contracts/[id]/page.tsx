import type { Metadata } from "next";
import { ContractDetail } from "@/features/contracts/pages/ContractDetail";

export const metadata: Metadata = { title: "合約 | 青春止秒攝影工作室" };

export default function Page() {
  return <ContractDetail />;
}
