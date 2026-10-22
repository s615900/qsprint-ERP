import { db } from "@/server/db";
import { GetPublicContractParams, SignPublicContractParams, SignPublicContractBody } from "@/lib/api-zod";
import { verifyDocToken, SIGNATURE_RE, SIGNATURE_MAX_LENGTH } from "@/server/tokens";
import { publicContract } from "@/server/publicDocs";
import { derivedStoredStatus } from "@/lib/contractStatus";
import { error, json, readJson } from "@/server/http";

type Ctx = { params: Promise<{ token: string }> };

async function findContract(token: string) {
  const id = verifyDocToken("contract", token);
  if (!id) return undefined;
  return db.contracts.get(id);
}

// GET /api/contract-sign/:token
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetPublicContractParams.safeParse(await ctx.params);
  if (!params.success) return error("連結無效或已失效", 404);
  const contract = await findContract(params.data.token);
  if (!contract) return error("連結無效或已失效", 404);
  if (contract.status === "作廢") return error("這份合約已作廢，請與工作室聯繫", 410);

  if (!contract.customer_read_at) {
    await db.contracts.update({ id: contract.id, customer_read_at: null }, { customer_read_at: new Date() });
  }
  return json(await publicContract(contract));
}

// POST /api/contract-sign/:token
export async function POST(req: Request, ctx: Ctx) {
  const params = SignPublicContractParams.safeParse(await ctx.params);
  if (!params.success) return error("連結無效或已失效", 404);
  const parsed = SignPublicContractBody.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫簽署人姓名並簽名", 400);
  const { signer_name, signature_image } = parsed.data;
  if (!SIGNATURE_RE.test(signature_image) || signature_image.length > SIGNATURE_MAX_LENGTH) {
    return error("簽名檔格式錯誤", 400);
  }

  const id = verifyDocToken("contract", params.data.token);
  const contract = id ? await db.contracts.get(id) : undefined;
  if (!contract) return error("連結無效或已失效", 404);
  if (contract.status === "作廢" || contract.status === "已結案") {
    return error("這份合約已作廢或結案，請與工作室聯繫", 410);
  }

  const customer_signed_at = new Date();
  // Conditional update: two simultaneous submits can't both win.
  const updated = await db.contracts.update(
    { id: contract.id, customer_signed_at: null },
    {
      customer_signer_name: signer_name.trim(),
      customer_signature: signature_image,
      customer_signed_at,
      status: derivedStoredStatus({ ...contract, customer_signed_at }),
    },
  );
  if (!updated) return error("這份合約已經簽署過了", 409);
  return json({ success: true });
}
