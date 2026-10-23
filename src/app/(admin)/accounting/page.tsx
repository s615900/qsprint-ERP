import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountingHub } from "@/features/accounting/pages/AccountingHub";

export const metadata: Metadata = { title: "會計系統 | 青春止秒攝影工作室" };

export default function Page() {
  return (
    <Suspense>
      <AccountingHub />
    </Suspense>
  );
}
