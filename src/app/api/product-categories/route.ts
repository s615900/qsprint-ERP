import { z } from "zod/v4";
import { db } from "@/server/db";
import { ensureCategory, listCategories } from "@/server/productCategories";
import { error, json, readJson } from "@/server/http";

// GET /api/product-categories — in display order, with how many products use each
export async function GET() {
  return json(await listCategories());
}

// POST /api/product-categories {name}
export async function POST(req: Request) {
  const parsed = z.object({ name: z.string().trim().min(1).max(30) }).safeParse(await readJson(req));
  if (!parsed.success) return error("請輸入類別名稱（30 字以內）", 400);
  await listCategories();
  if (await db.productCategories.findOne({ name: parsed.data.name })) return error("已有同名類別", 409);
  await ensureCategory(parsed.data.name);
  return json(await db.productCategories.findOne({ name: parsed.data.name }), 201);
}
