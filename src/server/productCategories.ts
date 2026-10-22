import "server-only";
import { db, rawCollection } from "@/server/db";

const DEFAULT_CATEGORIES = ["新人婚紗", "親子寫真", "個人寫真", "企業商業客戶"];

// Seeds once (own id counter doesn't exist yet): the usual categories plus any already used by products.
export async function ensureCategoriesSeeded() {
  const counters = await rawCollection("counters");
  if (await counters.findOne({ _id: "id:product_categories" as never })) return;
  const used = (await db.products.find({})).map((p) => p.category);
  const names = [...new Set([...DEFAULT_CATEGORIES, ...used])];
  for (const [i, name] of names.entries()) {
    try {
      await db.productCategories.insert({ name, sort_order: i });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // seeded concurrently
    }
  }
}

export async function listCategories() {
  await ensureCategoriesSeeded();
  const [cats, products] = await Promise.all([
    db.productCategories.find({}, { sort: { sort_order: 1, id: 1 } }),
    db.products.find({}),
  ]);
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return cats.map((c) => ({ ...c, product_count: counts.get(c.name) ?? 0 }));
}

// A product's category must exist in the list; a new name is added to the end.
export async function ensureCategory(name: string) {
  await ensureCategoriesSeeded();
  if (await db.productCategories.findOne({ name })) return;
  const all = await db.productCategories.find({});
  try {
    await db.productCategories.insert({ name, sort_order: all.length ? Math.max(...all.map((c) => c.sort_order)) + 1 : 0 });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
  }
}
