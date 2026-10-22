import { db } from "@/server/db";
import { CreateQuoteSignLinkParams } from "@/lib/api-zod";
import { signDocToken } from "@/server/tokens";
import { error, json } from "@/server/http";

// POST /api/quotes/:id/sign-link
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = CreateQuoteSignLinkParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);
  const quote = await db.quotes.get(params.data.id);
  if (!quote) return error("Quote not found", 404);

  // Handing the link out means the quote has been sent.
  if (quote.status === "草稿") await db.quotes.update(quote.id, { status: "已送出" });

  const token = signDocToken("quote", quote.id);
  return json({ path: `/quote-sign?token=${encodeURIComponent(token)}`, token });
}
