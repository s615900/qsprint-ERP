import { db } from "@/server/db";
import { json } from "@/server/http";

// GET /api/dashboard/recent-customers
export async function GET() {
  const rows = await db.customers.find({}, { sort: { created_at: -1 }, limit: 5 });
  return json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      source: c.source,
      category: c.category,
      tags: c.tags,
      member_tier: c.member_tier,
      notes: c.notes,
      line_bound: c.line_bound,
      created_at: c.created_at,
    })),
  );
}
