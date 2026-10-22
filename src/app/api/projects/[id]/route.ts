import { db } from "@/server/db";
import { UpdateProjectParams, UpdateProjectBody, DeleteProjectParams } from "@/lib/api-zod";
import { DATE_RE, error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/projects/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateProjectParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateProjectBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { shoot_date, due_date, ...rest } = parsed.data;
  for (const d of [shoot_date, due_date]) {
    if (d && !DATE_RE.test(d)) return error("dates must be YYYY-MM-DD", 400);
  }

  const row = await db.projects.update(params.data.id, {
    ...rest,
    ...(shoot_date !== undefined && { shoot_date: shoot_date || null }),
    ...(due_date !== undefined && { due_date: due_date || null }),
  });
  if (!row) return error("Project not found", 404);
  const order_number = row.order_id ? ((await db.orders.get(row.order_id))?.order_number ?? null) : null;
  return json({ ...row, order_number });
}

// DELETE /api/projects/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteProjectParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.projects.remove(params.data.id);
  if (!row) return error("Project not found", 404);
  return noContent();
}
