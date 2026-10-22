import type { Metadata } from "next";
import { ScheduleSettings } from "@/features/bookings/pages/ScheduleSettings";

export const metadata: Metadata = { title: "開放時段 | 青春止秒攝影工作室" };

export default function Page() {
  return <ScheduleSettings />;
}
