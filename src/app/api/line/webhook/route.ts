import { db } from "@/server/db";
import { replyLine, verifyWebhookSignature } from "@/server/line";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

const HELP =
  "歡迎加入青春止秒攝影工作室！\n要綁定會員，請先登入網站「會員中心」按「取得綁定驗證碼」，再把 6 位數驗證碼傳到這裡。";

// POST /api/line/webhook — set this URL in the Messaging API channel (needs LINE_MESSAGING_* env vars)
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-line-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return new Response("bad request", { status: 400 });
  }

  for (const ev of events) {
    const userId = ev.source?.userId;
    if (!ev.replyToken || !userId) continue;

    if (ev.type === "follow") {
      await replyLine(ev.replyToken, HELP);
      continue;
    }
    if (ev.type !== "message" || ev.message?.type !== "text") continue;

    const code = ev.message.text?.match(/\b(\d{6})\b/)?.[1];
    if (!code) {
      await replyLine(ev.replyToken, HELP);
      continue;
    }

    const row = await db.lineBindCodes.findOne({ code, expires_at: { $gt: new Date() } });
    if (!row) {
      await replyLine(ev.replyToken, "驗證碼不正確或已過期，請回會員中心重新取得。");
      continue;
    }

    const owner = await db.customers.findOne({ line_user_id: userId });
    if (owner && owner.id !== row.customer_id) {
      await replyLine(ev.replyToken, "這個 LINE 帳號已綁定其他會員，如需更換請聯絡工作室。");
      continue;
    }

    const customer = await db.customers.update(row.customer_id, { line_user_id: userId, line_bound: true });
    await db.lineBindCodes.remove(row.id);
    await replyLine(ev.replyToken, `綁定成功！${customer?.name ?? ""} 您好，之後預約進度會透過 LINE 通知您。`);
  }

  return new Response("ok");
}
