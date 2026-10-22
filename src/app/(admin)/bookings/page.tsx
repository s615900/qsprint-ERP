import type { Metadata } from "next";
import { BookingAdmin } from "@/features/bookings/pages/BookingAdmin";

export const metadata: Metadata = { title: "預約管理 | 青春止秒攝影工作室" };

export default function Page() {
  return <BookingAdmin />;
}
