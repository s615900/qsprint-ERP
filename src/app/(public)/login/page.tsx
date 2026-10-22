import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerLogin } from "@/features/customer-auth/pages/CustomerLogin";

export const metadata: Metadata = { title: "會員登入 | 青春止秒攝影工作室" };

export default function Page() {
  return (
    <Suspense>
      <CustomerLogin />
    </Suspense>
  );
}
