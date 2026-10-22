import { db } from "@/server/db";
import { CreateContractSignLinkParams } from "@/lib/api-zod";
import { signDocToken } from "@/server/tokens";
import { derivedStoredStatus } from "@/lib/contractStatus";
import { error, json } from "@/server/http";

// POST /api/contracts/:id/sign-link
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = CreateContractSignLinkParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const contract = await db.contracts.get(params.data.id);
  if (!contract) return error("Contract not found", 404);
  if (contract.status === "作廢") return error("此合約已作廢", 409);

  const status = derivedStoredStatus(contract, { sent: true });
  if (status !== contract.status) {
    await db.contracts.update(contract.id, { status });
  }
  const token = signDocToken("contract", contract.id);
  return json({ path: `/contract-sign?token=${encodeURIComponent(token)}`, token });
}
