import { rawCollection } from "@/server/db";
import { UpdateTaxFilingParams, UpdateTaxFilingBody } from "@/lib/api-zod";
import { getFiling } from "@/server/invoicing";
import { error, json, readJson } from "@/server/http";

const PERIOD_RE = /^\d{4}-(01|03|05|07|09|11)$/;

// PUT /api/tax/filings/:period
export async function PUT(req: Request, ctx: { params: Promise<{ period: string }> }) {
  const params = UpdateTaxFilingParams.safeParse(await ctx.params);
  if (!params.success || !PERIOD_RE.test(params.data.period)) return error("period 應為單月起始，例如 2026-01", 400);
  const parsed = UpdateTaxFilingBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);

  const period = params.data.period;
  const current = await getFiling(period);
  const { status, carry_in_override, note } = parsed.data;
  if (current.status === "已申報" && (carry_in_override !== undefined) && status !== "未申報") {
    return error("這一期已申報，請先撤銷申報狀態再修改上期留抵稅額", 409);
  }

  const set = {
    ...(status !== undefined && { status, filed_at: status === "已申報" ? new Date() : null }),
    ...(carry_in_override !== undefined && { carry_in_override }),
    ...(note !== undefined && { note }),
  };
  const defaults: Record<string, unknown> = { period, status: "未申報", filed_at: null, carry_in_override: null, note: null };
  for (const key of Object.keys(set)) delete defaults[key];
  const col = await rawCollection("tax_filings");
  const row = await col.findOneAndUpdate(
    { period },
    { $set: { ...set, updated_at: new Date() }, $setOnInsert: defaults },
    { upsert: true, returnDocument: "after", projection: { _id: 0 } },
  );
  return json(row);
}
