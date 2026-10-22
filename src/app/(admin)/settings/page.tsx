import type { Metadata } from "next";
import { Settings } from "@/features/settings/pages/Settings";

export const metadata: Metadata = { title: "設定 | 青春止秒攝影工作室" };

export default function Page() {
  return <Settings />;
}
