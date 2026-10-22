import "server-only";
import { z } from "zod/v4";
import { db, rawCollection } from "@/server/db";

// Starter catalogue, inserted once on first use; after that the studio manages it in 商品管理.
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "新人婚紗基礎套組",
    description: "精選婚紗拍攝，涵蓋戶外與棚拍場景，包含造型師服務及基本修圖",
    duration: "6小時",
    price: 28000,
    category: "新人婚紗",
    features: ["戶外拍攝", "棚拍", "造型師", "50張精修照", "相冊一本"],
  },
  {
    id: 2,
    name: "新人婚紗精緻套組",
    description: "完整婚紗體驗，多場景拍攝，精緻修圖及高質感相冊",
    duration: "10小時",
    price: 48000,
    category: "新人婚紗",
    features: ["3個拍攝場景", "2套婚紗禮服", "造型師全程", "100張精修照", "精裝相冊兩本", "影片剪輯"],
  },
  {
    id: 3,
    name: "親子寫真套組",
    description: "溫馨家庭時光記錄，適合全家福或親子間的甜蜜互動寫真",
    duration: "2小時",
    price: 8000,
    category: "親子寫真",
    features: ["棚拍或外拍", "30張精修照", "數位檔案", "線上相簿"],
  },
  {
    id: 4,
    name: "個人寫真基礎套組",
    description: "展現個人風格魅力，適合社群媒體、個人品牌或紀念寫真",
    duration: "2小時",
    price: 6000,
    category: "個人寫真",
    features: ["棚拍", "1套服裝", "20張精修照", "數位檔案"],
  },
  {
    id: 5,
    name: "個人寫真進階套組",
    description: "多場景、多造型的專業寫真，打造個人專屬視覺形象",
    duration: "4小時",
    price: 12000,
    category: "個人寫真",
    features: ["外拍+棚拍", "3套服裝", "50張精修照", "數位檔案", "1分鐘影片"],
  },
  {
    id: 6,
    name: "企業商業形象拍攝",
    description: "專業企業形象照、產品攝影及活動記錄，為品牌打造質感視覺內容",
    duration: "4小時",
    price: 18000,
    category: "企業商業客戶",
    features: ["企業形象照", "產品拍攝", "活動記錄", "50張精修照", "商業授權"],
  },
];

// Seeds only if the collection has never held a document (its id counter doesn't exist yet),
// so deleting everything doesn't bring the defaults back.
export async function ensureProductsSeeded() {
  const counters = await rawCollection("counters");
  if (await counters.findOne({ _id: "id:products" as never })) return;
  for (const [i, { id: _id, ...p }] of DEFAULT_PRODUCTS.entries()) {
    void _id;
    try {
      await db.products.insert({ ...p, sort_order: i });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // a concurrent request seeded it first
    }
  }
}

export async function listProducts(opts: { activeOnly: boolean }) {
  await ensureProductsSeeded();
  return db.products.find(opts.activeOnly ? { active: true } : {}, { sort: { sort_order: 1, id: 1 } });
}

export const ProductBody = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  duration: z.string().trim().default(""),
  price: z.number().int().min(0),
  category: z.string().trim().min(1),
  features: z.array(z.string().trim().min(1)).default([]),
  active: z.boolean().default(true),
});
