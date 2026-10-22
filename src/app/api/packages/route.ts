import { json } from "@/server/http";
import { listProducts } from "@/server/products";

// GET /api/packages — active products, in the shape the booking page and line-item picker expect
export async function GET() {
  const rows = await listProducts({ activeOnly: true });
  return json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      duration: p.duration,
      price: p.price,
      category: p.category,
      features: p.features,
    })),
  );
}
