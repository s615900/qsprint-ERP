import { db } from "@/server/db";
import { SignContractAsStaffParams, SignContractAsStaffBody } from "@/lib/api-zod";
import { SIGNATURE_RE, SIGNATURE_MAX_LENGTH } from "@/server/tokens";
import { selectContract } from "@/server/contracts";
import { derivedStoredStatus } from "@/lib/contractStatus";
import { error, json, readJson } from "@/server/http";

// POST /api/contracts/:id/staff-sign
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = SignContractAsStaffParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const parsed = SignContractAsStaffBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { signer_name, signature_image } = parsed.data;
  if (!SIGNATURE_RE.test(signature_image) || signature_image.length > SIGNATURE_MAX_LENGTH) {
    return error("簽名檔格式錯誤", 400);
  }

  const contract = await db.contracts.get(params.data.id);
  if (!contract) return error("Contract not found", 404);
  if (contract.status === "作廢" || contract.status === "已結案") return error("此合約已作廢或結案，不能再簽署", 409);

  const staff_signed_at = new Date();
  // Conditional update: two simultaneous submits can't both win.
  const updated = await db.contracts.update(
    { id: contract.id, staff_signed_at: null },
    {
      staff_signer_name: signer_name.trim(),
      staff_signature: signature_image,
      staff_signed_at,
      status: derivedStoredStatus({ ...contract, staff_signed_at }),
    },
  );
  if (!updated) return error("工作室已簽署過此合約", 409);
  return json(await selectContract(params.data.id));
}
