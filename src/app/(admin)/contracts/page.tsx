import type { Metadata } from "next";
import { ContractList } from "@/features/contracts/pages/ContractList";

export const metadata: Metadata = { title: "合約管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <ContractList />;
}
