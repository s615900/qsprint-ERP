import type { NextRequest } from "next/server";
import { db, dailyNumber, rawCollection, type InvoiceTrack } from "@/server/db";
import { CreateInvoiceBody, ListInvoicesQueryParams } from "@/lib/api-zod";
import {
  PERIOD_FILED_MESSAGE,
  formatInvoiceNumber,
  getCompany,
  isPeriodFiled,
  selectInvoices,
} from "@/server/invoicing";
import { isValidTaxId, periodLabel, periodOf, splitTotal } from "@/lib/tax";
import { DATE_RE, error, json, readJson } from "@/server/http";
import { escapeRegex } from "@/server/search";

const MANUAL_NUMBER_RE = /^[A-Za-z]{2}\d{8}$/;

// GET /api/invoices
export async function GET(req: NextRequest) {
  const parsed = ListInvoicesQueryParams.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { period, status, kind, order_id, search } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (period) filter.period = period;
  if (status) filter.status = status;
  if (kind) filter.kind = kind;
  if (order_id) filter.order_id = order_id;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ invoice_number: rx }, { buyer_name: rx }, { buyer_tax_id: rx }];
  }
  return json(await selectInvoices(filter));
}

// POST /api/invoices
export async function POST(req: Request) {
  const parsed = CreateInvoiceBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const { kind, invoice_date, total, order_id, customer_id, items = [], carrier, donate_code, note } = parsed.data;
  const tax_type = parsed.data.tax_type ?? "應稅";
  const buyer_name = parsed.data.buyer_name.trim();
  const buyer_tax_id = parsed.data.buyer_tax_id?.trim() || null;
  const manualNumber = parsed.data.invoice_number?.trim().toUpperCase() || null;

  if (!DATE_RE.test(invoice_date)) return error("invoice_date must be YYYY-MM-DD", 400);
  if (kind === "三聯式" && !buyer_tax_id) return error("三聯式發票必須填寫買受人統一編號", 400);
  if (buyer_tax_id && !isValidTaxId(buyer_tax_id)) return error("買受人統一編號格式不正確", 400);
  if (manualNumber && kind === "免用發票") return error("免用發票由系統自動編號", 400);
  if (manualNumber && !MANUAL_NUMBER_RE.test(manualNumber)) return error("發票號碼格式應為 2 碼英文 + 8 碼數字", 400);
  if (kind !== "電子發票" && (carrier || donate_code)) return error("載具與捐贈碼只適用於電子發票", 400);
  if (carrier && donate_code) return error("載具與捐贈碼只能擇一", 400);

  const period = periodOf(invoice_date);
  if (await isPeriodFiled(invoice_date)) return error(PERIOD_FILED_MESSAGE, 409);
  if (order_id && !(await db.orders.get(order_id))) return error("找不到訂單", 400);

  const company = await getCompany();
  const amounts = splitTotal(total, tax_type, company.tax_rate);

  let invoice_number: string;
  let track_id: number | null = null;
  if (kind === "免用發票") {
    invoice_number = await dailyNumber("R");
  } else if (manualNumber) {
    invoice_number = manualNumber;
  } else {
    // Atomically take the next number from the first block with numbers left, so two
    // simultaneous invoices can never get the same one.
    const tracks = await rawCollection("invoice_tracks");
    const track = (await tracks.findOneAndUpdate(
      { period, kind, $expr: { $lte: ["$next_number", "$range_end"] } },
      { $inc: { next_number: 1 } },
      { sort: { id: 1 }, returnDocument: "before", projection: { _id: 0 } },
    )) as unknown as InvoiceTrack | null;
    if (!track) {
      return error(`尚未登錄「${periodLabel(period)}・${kind}」可用字軌，或號碼已用完；請先到字軌配號新增，或手動輸入發票號碼。`, 409);
    }
    invoice_number = formatInvoiceNumber(track.prefix, track.next_number);
    track_id = track.id;
  }

  if (await db.invoices.findOne({ invoice_number })) return error(`發票號碼 ${invoice_number} 已經存在`, 409);

  try {
    const row = await db.invoices.insert({
      invoice_number,
      track_id,
      kind,
      invoice_date,
      period,
      customer_id: customer_id ?? null,
      order_id: order_id ?? null,
      buyer_name,
      buyer_tax_id,
      tax_type,
      ...amounts,
      items,
      carrier: carrier || null,
      donate_code: donate_code || null,
      note: note || null,
    });
    const [full] = await selectInvoices({ id: row.id });
    return json(full, 201);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return error(`發票號碼 ${invoice_number} 已經存在`, 409);
    throw err;
  }
}
