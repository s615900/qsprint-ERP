import { db, type Customer } from "@/server/db";
import {
  ReviewCustomerChangeRequestParams,
  ReviewCustomerChangeRequestBody,
} from "@/lib/api-zod";
import { error, json, readJson } from "@/server/http";

// PATCH /api/customers/:id/change-requests/:requestId
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; requestId: string }> },
) {
  const params = ReviewCustomerChangeRequestParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = ReviewCustomerChangeRequestBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { id: customerId, requestId } = params.data;
  const { action, admin_note } = parsed.data;

  const changeRequest = await db.changeRequests.findOne({ id: requestId, customer_id: customerId });
  if (!changeRequest) return error("Change request not found", 404);

  if (action === "approve") {
    const customerPatch: Partial<Customer> = {};
    if (changeRequest.requested_name) customerPatch.name = changeRequest.requested_name;
    if (changeRequest.requested_phone) customerPatch.phone = changeRequest.requested_phone;
    if (changeRequest.requested_email) customerPatch.email = changeRequest.requested_email;
    if (Object.keys(customerPatch).length > 0) await db.customers.update(customerId, customerPatch);
    if (changeRequest.requested_phone) {
      await db.customerAccounts.update({ customer_id: customerId }, { phone: changeRequest.requested_phone });
    }
  }

  const updated = await db.changeRequests.update(requestId, {
    status: action === "approve" ? "已核准" : "已拒絕",
    admin_note: admin_note ?? null,
    reviewed_at: new Date(),
  });
  return json(updated);
}
