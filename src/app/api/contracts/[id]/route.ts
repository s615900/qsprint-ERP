import { db, computeAmounts, type TaxMode } from "@/server/db";
import { GetContractParams, UpdateContractParams, UpdateContractBody, DeleteContractParams } from "@/lib/api-zod";
import { selectContract } from "@/server/contracts";
import { CONTENT_LOCKED_MESSAGE, derivedStoredStatus, isContentLocked } from "@/lib/contractStatus";
import { sanitizeHtml } from "@/server/html";
import { DATE_RE, error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

const CONTENT_KEYS = [
  "customer_id", "order_id", "contact_name", "contact_phone", "contact_email", "tax_id", "address", "title",
  "items", "discount", "tax_mode", "tax_rate", "start_date", "end_date", "terms", "nda", "notes",
];

// GET /api/contracts/:id
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetContractParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await selectContract(params.data.id);
  if (!row) return error("Contract not found", 404);
  return json(row);
}

// PUT /api/contracts/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateContractParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateContractBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { status, start_date, end_date, ...content } = parsed.data;
  for (const d of [start_date, end_date]) {
    if (d && !DATE_RE.test(d)) return error("dates must be YYYY-MM-DD", 400);
  }

  const current = await db.contracts.get(params.data.id);
  if (!current) return error("Contract not found", 404);
  const touchesContent =
    CONTENT_KEYS.some((k) => k in content) || start_date !== undefined || end_date !== undefined;
  if (touchesContent && (isContentLocked(current) || current.status === "作廢" || current.status === "已結案")) {
    return error(CONTENT_LOCKED_MESSAGE, 409);
  }

  const items = content.items ?? current.items;
  const discount = content.discount ?? current.discount;
  const taxMode = content.tax_mode ?? (current.tax_mode as TaxMode);
  const taxRate = content.tax_rate ?? current.tax_rate;
  const next = {
    ...content,
    ...(content.terms !== undefined && { terms: sanitizeHtml(content.terms) }),
    ...(content.nda !== undefined && { nda: sanitizeHtml(content.nda) }),
    ...(start_date !== undefined && { start_date: start_date || null }),
    ...(end_date !== undefined && { end_date: end_date || null }),
    ...computeAmounts(items, discount, taxMode, taxRate),
  };
  // 草稿 means "undo 已結案/作廢": fall back to what the signatures imply.
  const nextStatus = status === undefined ? current.status : status === "草稿" ? derivedStoredStatus({ ...current, status: "" }) : status;
  await db.contracts.update(current.id, { ...next, status: nextStatus });
  return json(await selectContract(params.data.id));
}

// DELETE /api/contracts/:id
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteContractParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const current = await db.contracts.get(params.data.id);
  if (!current) return error("Contract not found", 404);
  if (current.customer_signed_at || current.staff_signed_at) return error("已有簽署紀錄的合約不能刪除，請改用作廢", 409);
  await db.contracts.remove(current.id);
  await db.projects.updateMany({ contract_id: current.id }, { contract_id: null });
  return noContent();
}
