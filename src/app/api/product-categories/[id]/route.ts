import { z } from "zod/v4";
import { db } from "@/server/db";
import { error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  sort_order: z.number().int().optional(),
});

// PUT /api/product-categories/:id — rename (products follow) and/or change order
export async function PUT(req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return error("類別名稱不正確", 400);
  const current = await db.productCategories.get(id);
  if (!current) return error("Not found", 404);

  const { name, sort_order } = parsed.data;
  if (name && name !== current.name) {
    if (await db.productCategories.findOne({ name })) return error("已有同名類別", 409);
    await db.productCategories.update(id, { name });
    await db.products.updateMany({ category: current.name }, { category: name });
  }
  if (sort_order !== undefined) await db.productCategories.update(id, { sort_order });
  return json(await db.productCategories.get(id));
}

// DELETE /api/product-categories/:id — only when no product uses it
export async function DELETE(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return error("Invalid id", 400);
  const current = await db.productCategories.get(id);
  if (!current) return error("Not found", 404);
  if ((await db.products.count({ category: current.name })) > 0) {
    return error("這個類別底下還有商品，請先把商品改到其他類別", 409);
  }
  await db.productCategories.remove(id);
  return noContent();
}
