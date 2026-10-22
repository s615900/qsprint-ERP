import type { NextRequest } from "next/server";
import { db, dailyNumber } from "@/server/db";
import { withOrderNumbers } from "@/server/projects";
import { CreateProjectBody, ListProjectsQueryParams } from "@/lib/api-zod";
import { DATE_RE, error, json, readJson } from "@/server/http";
import { escapeRegex } from "@/server/search";

// GET /api/projects
export async function GET(req: NextRequest) {
  const parsed = ListProjectsQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { status, search, customer_id, order_id } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (order_id) filter.order_id = order_id;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { contact_name: rx }, { project_number: rx }];
  }
  return json(await withOrderNumbers(await db.projects.find(filter, { sort: { id: -1 } })));
}

// POST /api/projects
export async function POST(req: Request) {
  const parsed = CreateProjectBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { shoot_date, due_date, ...rest } = parsed.data;
  for (const d of [shoot_date, due_date]) {
    if (d && !DATE_RE.test(d)) return error("dates must be YYYY-MM-DD", 400);
  }

  const inserted = await db.projects.insert({
    ...rest,
    project_number: await dailyNumber("J"),
    shoot_date: shoot_date || null,
    due_date: due_date || null,
  });
  const [full] = await withOrderNumbers([inserted]);
  return json(full, 201);
}
