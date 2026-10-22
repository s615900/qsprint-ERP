import type { Metadata } from "next";
import { ProjectBoard } from "@/features/projects/pages/ProjectBoard";

export const metadata: Metadata = { title: "專案進度 | 青春止秒攝影工作室" };

export default function Page() {
  return <ProjectBoard />;
}
