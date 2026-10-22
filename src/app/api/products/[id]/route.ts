import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/staff";
import { error, json, noContent, readJson } from "@/server/http";
import { ProductBody } from "@/server/products";
import { ensureCategory } from "@/server/productCategories";

type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) ? id : null;
}

// PUT /api/products/:id
export async function PUT(req: Request, ctx: Ctx) {
  const id = await idOf(ctx);
  if (id === null) return error("Invalid id", 400);
  const parsed = ProductBody.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫商品名稱、類別與價格", 400);
  await ensureCategory(parsed.data.category);
  try {
    const row = await db.products.update(id, parsed.data);
    return row ? json(row) : error("Not found", 404);
  } catch (err) {
    if (isUniqueViolation(err)) return error("已有同名商品", 409);
    throw err;
  }
}

// DELETE /api/products/:id — past bookings, quotes and orders keep their own copy of the name and price
export async function DELETE(_req: Request, ctx: Ctx) {
  const id = await idOf(ctx);
  if (id === null) return error("Invalid id", 400);
  const row = await db.products.remove(id);
  return row ? noContent() : error("Not found", 404);
}
