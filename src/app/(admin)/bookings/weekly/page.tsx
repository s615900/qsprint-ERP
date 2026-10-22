import type { Metadata } from "next";
import { WeeklySchedule } from "@/features/bookings/pages/WeeklySchedule";

export const metadata: Metadata = { title: "本週檔期 | 青春止秒攝影工作室" };

export default function Page() {
  return <WeeklySchedule />;
}
