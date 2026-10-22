import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerAccount } from "@/features/customer-auth/pages/CustomerAccount";

export const metadata: Metadata = { title: "會員中心 | 青春止秒攝影工作室" };

export default function Page() {
  return (
    <Suspense>
      <CustomerAccount />
    </Suspense>
  );
}
