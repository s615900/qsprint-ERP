import type { Metadata } from "next";
import { NewBooking } from "@/features/bookings/pages/NewBooking";

export const metadata: Metadata = { title: "新增預約 | 青春止秒攝影工作室" };

export default function Page() {
  return <NewBooking />;
}
