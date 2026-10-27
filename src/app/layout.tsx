import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "青春止秒攝影工作室 — 管理系統",
  description: "青春止秒攝影工作室 接案管理系統：客戶管理、線上預約、檔期排程。",
  // 狀態列用 black（黑底白字、內容從狀態列下方開始）：black-translucent 會讓頁面延伸到狀態列後面，
  // iOS 會在那一塊疊一層半透明漸層，顏色與字色都無法用網頁樣式控制（做法同 WD 工作台）。
  appleWebApp: { capable: true, title: "青春止秒", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  // Next 預設只輸出新版的 mobile-web-app-capable；舊版 iOS 看的是 apple- 開頭這個，兩個都留
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0B3D5C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
