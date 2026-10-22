import { db } from "@/server/db";
import { GetPublicQuoteParams, SignPublicQuoteParams, SignPublicQuoteBody } from "@/lib/api-zod";
import { verifyDocToken, SIGNATURE_RE, SIGNATURE_MAX_LENGTH } from "@/server/tokens";
import { publicQuote } from "@/server/publicDocs";
import { error, json, readJson } from "@/server/http";

type Ctx = { params: Promise<{ token: string }> };

async function findQuote(token: string) {
  const id = verifyDocToken("quote", token);
  return id ? db.quotes.get(id) : undefined;
}

// GET /api/quote-sign/:token
export async function GET(_req: Request, ctx: Ctx) {
  const params = GetPublicQuoteParams.safeParse(await ctx.params);
  if (!params.success) return error("連結無效或已失效", 404);
  const quote = await findQuote(params.data.token);
  if (!quote) return error("連結無效或已失效", 404);

  // Remember the first time the customer opened it, so staff can see it was read.
  if (!quote.read_at) await db.quotes.update({ id: quote.id, read_at: null }, { read_at: new Date() });
  return json(await publicQuote(quote));
}

// POST /api/quote-sign/:token — signing accepts the quote
export async function POST(req: Request, ctx: Ctx) {
  const params = SignPublicQuoteParams.safeParse(await ctx.params);
  if (!params.success) return error("連結無效或已失效", 404);
  const parsed = SignPublicQuoteBody.safeParse(await readJson(req));
  if (!parsed.success) return error("請填寫簽署人姓名並簽名", 400);
  const { signer_name, signature_image } = parsed.data;
  if (!SIGNATURE_RE.test(signature_image) || signature_image.length > SIGNATURE_MAX_LENGTH) {
    return error("簽名檔格式錯誤", 400);
  }

  const quote = await findQuote(params.data.token);
  if (!quote) return error("連結無效或已失效", 404);

  // Conditional update: two simultaneous submits can't both win.
  const updated = await db.quotes.update(
    { id: quote.id, signed_at: null },
    { signer_name: signer_name.trim(), signature_image, signed_at: new Date(), status: "已接受" },
  );
  if (!updated) return error("這份報價單已經簽署過了", 409);
  return json({ success: true });
}
