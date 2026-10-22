import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerRegister } from "@/features/customer-auth/pages/CustomerRegister";

export const metadata: Metadata = { title: "會員註冊 | 青春止秒攝影工作室" };

export default function Page() {
  return (
    <Suspense>
      <CustomerRegister />
    </Suspense>
  );
}
