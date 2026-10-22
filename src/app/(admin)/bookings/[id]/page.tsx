import type { Metadata } from "next";
import { BookingDetail } from "@/features/bookings/pages/BookingDetail";

export const metadata: Metadata = { title: "預約詳情 | 青春止秒攝影工作室" };

export default function Page() {
  return <BookingDetail />;
}
