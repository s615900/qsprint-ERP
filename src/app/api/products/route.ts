import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/staff";
import { error, json, readJson } from "@/server/http";
import { ProductBody, listProducts } from "@/server/products";

// GET /api/products — everything, including hidden items (admin)
export async function GET() {
  return json(await listProducts({ activeOnly: false }));
}

// POST /api/products
export async function POST(req: Request) {
  const parsed = ProductBody.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫商品名稱、類別與價格", 400);
  const existing = await listProducts({ activeOnly: false });
  try {
    const row = await db.products.insert({
      ...parsed.data,
      sort_order: existing.length ? Math.max(...existing.map((p) => p.sort_order)) + 1 : 0,
    });
    return json(row, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return error("已有同名商品", 409);
    throw err;
  }
}
