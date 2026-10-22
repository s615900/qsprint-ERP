import type { Metadata } from "next";
import { NewContract } from "@/features/contracts/pages/NewContract";

export const metadata: Metadata = { title: "新增合約 | 青春止秒攝影工作室" };

export default function Page() {
  return <NewContract />;
}
