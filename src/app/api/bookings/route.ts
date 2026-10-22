import type { NextRequest } from "next/server";
import { db, dailyNumber } from "@/server/db";
import { CreateBookingBody } from "@/lib/api-zod";
import { DATE_RE, error, json, readJson } from "@/server/http";
import { isBookable } from "@/server/availability";
import { toBookingResponses } from "@/server/bookings";
import { pushToCustomer } from "@/server/line";
import { escapeRegex } from "@/server/search";

// GET /api/bookings
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const status = q.get("status");
  const date = q.get("date");
  const search = q.get("search");
  // Orval generates zod.date() for date-format query params which rejects
  // plain HTTP strings — validate manually instead.
  if (date && !DATE_RE.test(date)) {
    return error("date must be YYYY-MM-DD", 400);
  }

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (date) filter.date = date;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ contact_name: rx }, { service_type: rx }, { booking_number: rx }];
  }

  const rows = await db.bookings.find(filter, { sort: { date: -1, time_slot: 1 } });
  return json(await toBookingResponses(rows));
}

// POST /api/bookings
export async function POST(req: Request) {
  const parsed = CreateBookingBody.safeParse(await readJson(req));
  if (!parsed.success) {
    return error(parsed.error.message, 400);
  }

  const { customer_id, contact_name, contact_phone, contact_email, date, ...rest } = parsed.data;
  // Orval coerces format:date fields to a JS Date; the column is stored
  // as a plain string, so convert back via UTC to avoid a day-shift.
  const day = date instanceof Date ? date.toISOString().slice(0, 10) : date;

  // A photographer's period can only be taken once — re-check at submit time
  // in case someone else booked it after the customer loaded the page.
  if (rest.assigned_staff && !(await isBookable(rest.assigned_staff, day, rest.time_slot))) {
    return error("這個時段剛剛被預約走了，請選擇其他時段", 409);
  }

  const row = await db.bookings.insert({
    booking_number: await dailyNumber("B"),
    customer_id: customer_id ?? null,
    contact_name,
    contact_phone,
    contact_email,
    date: day,
    ...rest,
    status: "諮詢",
  });

  const [created] = await toBookingResponses([row]);
  await pushToCustomer(
    row.customer_id,
    `已收到您的預約！\n單號：${row.booking_number}\n服務：${row.service_type}\n時間：${row.date} ${row.time_slot}\n我們會盡快與您確認。`,
  );
  return json(created, 201);
}
