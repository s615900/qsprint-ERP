import { db } from "@/server/db";
import { DeleteInvoiceTrackParams } from "@/lib/api-zod";
import { error, noContent } from "@/server/http";

// DELETE /api/invoice-tracks/:id — only while no number has been used
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = DeleteInvoiceTrackParams.safeParse(await ctx.params);
  if (!params.success) return error(params.error.message, 400);

  const track = await db.invoiceTracks.get(params.data.id);
  if (!track) return error("Track not found", 404);
  if (track.next_number !== track.range_start) return error("這組字軌已經開過發票，不能刪除", 409);

  await db.invoiceTracks.remove(track.id);
  return noContent();
}
