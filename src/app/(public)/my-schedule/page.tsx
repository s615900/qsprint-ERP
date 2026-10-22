import type { Metadata } from "next";
import { MySchedule } from "@/features/bookings/pages/MySchedule";

export const metadata: Metadata = { title: "我的排班 | 青春止秒攝影工作室" };

export default async function Page({ searchParams }: PageProps<"/my-schedule">) {
  const { token } = await searchParams;
  return <MySchedule token={typeof token === "string" ? token : ""} />;
}
