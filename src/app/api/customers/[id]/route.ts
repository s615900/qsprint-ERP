import { db } from "@/server/db";
import {
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
} from "@/lib/api-zod";
import { isValidTaxId } from "@/lib/tax";
import { error, json, noContent, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/customers/:id
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetCustomerParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const row = await db.customers.get(params.data.id);
  if (!row) return error("Customer not found", 404);
  return json(row);
}

// PUT /api/customers/:id
export async function PUT(req: Request, ctx: Ctx) {
  const params = UpdateCustomerParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = UpdateCustomerBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  if (parsed.data.tax_id && !isValidTaxId(parsed.data.tax_id)) {
    return error("統一編號格式不正確（8 碼數字，且需通過檢查碼）", 400);
  }
  const row = await db.customers.update(params.data.id, parsed.data);
  if (!row) return error("Customer not found", 404);
  return json(row);
}

// DELETE /api/customers/:id — the member account, notes and requests go with the customer;
// bookings, quotes, orders, contracts, projects and invoices keep their own copy and just lose the link.
export async function DELETE(_req: Request, ctx: Ctx) {
  const params = DeleteCustomerParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const id = params.data.id;
  const row = await db.customers.remove(id);
  if (!row) return error("Customer not found", 404);

  await Promise.all([
    db.customerAccounts.removeMany({ customer_id: id }),
    db.interactions.removeMany({ customer_id: id }),
    db.changeRequests.removeMany({ customer_id: id }),
    db.lineBindCodes.removeMany({ customer_id: id }),
    ...[db.bookings, db.quotes, db.orders, db.contracts, db.projects, db.invoices].map((repo) =>
      repo.updateMany({ customer_id: id }, { customer_id: null } as never),
    ),
  ]);
  return noContent();
}
