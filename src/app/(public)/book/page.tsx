import type { Metadata } from "next";
import { PublicBooking } from "@/features/bookings/pages/PublicBooking";

export const metadata: Metadata = { title: "線上預約 | 青春止秒攝影工作室" };

export default function Page() {
  return <PublicBooking />;
}
