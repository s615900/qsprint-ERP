# 青春止秒攝影工作室 — 接案系統（Next.js 版）

由原 Replit monorepo（Vite + React + wouter 前端、Express API、Drizzle）改寫為單一 Next.js（App Router）專案。

## 技術

- Next.js 16（App Router、Turbopack）、React 19、TypeScript
- Tailwind CSS v4（`src/app/globals.css`，暖色系主題變數）
- API：Next.js Route Handlers（`src/app/api/**/route.ts`）
- DB：MongoDB（官方 `mongodb` 驅動，`src/server/db`；整數 id 與每日流水號由 counters 集合產生）
- 前端資料存取：TanStack Query + Orval 產生的 hooks（`src/lib/api-client`）
- 驗證：Zod（Orval 產生，`src/lib/api-zod`）

## 開始使用

```bash
cp .env.example .env.local   # 填入 MONGODB_URI、MONGODB_DB、SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
```

## 指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 開發伺服器 |
| `npm run build` / `npm start` | 正式建置 / 啟動 |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run db:seed` | 塞入測試資料（`-- --clean` 只清除） |
| `npm run codegen` | 修改 `openapi.yaml` 後重新產生 API hooks 與 Zod schema |

## 目錄結構

```
openapi.yaml                 API 合約（唯一來源）
src/app/
  (admin)/                   後台（含側邊欄 AppLayout）：/, /customers, /bookings, /quotes, /orders, /accounting, /settings
  (public)/                  前台：/book, /login, /register, /account
  api/                       Route Handlers（原 Express routes）
src/features/<模組>/         各功能模組（頁面、元件）— 一個模組一個資料夾
src/layouts/AppLayout.tsx    側邊欄外框
src/components/ui/           shadcn/ui 元件
src/lib/api-client/          Orval 產生的 React Query hooks
src/lib/api-zod/             Orval 產生的 Zod schema
src/server/                  僅伺服器端：db、session cookie、password
```

## 架構原則（沿用原專案）

- 前端只透過 `/api/*` 取資料，不直接碰 DB；日後換 RAGIC 只需改 `src/app/api` 的 handler。
- 功能模組分資料夾，改一個模組不需動到其他模組。
- 報價 → 訂單 → 會計：報價單可一鍵轉訂單；訂單收款就是會計帳上一筆連結 `order_id` 的收入，已收金額一律由帳務加總，不另存。
