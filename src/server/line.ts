import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { sign, unsign } from "@/server/session";

const AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const PROFILE_URL = "https://api.line.me/v2/profile";
const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

const STATE_COOKIE = "line_oauth_state";
const PENDING_COOKIE = "line_pending";
const TEN_MIN_S = 10 * 60;

export function lineLoginConfigured(): boolean {
  return !!(process.env.LINE_LOGIN_CHANNEL_ID && process.env.LINE_LOGIN_CHANNEL_SECRET);
}

export function lineBotConfigured(): boolean {
  return !!(process.env.LINE_MESSAGING_CHANNEL_SECRET && process.env.LINE_MESSAGING_ACCESS_TOKEN);
}

// Public origin of this site; LINE needs an exact, pre-registered callback URL.
export function appOrigin(req: Request): string {
  return process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

export function callbackUrl(req: Request): string {
  return `${appOrigin(req)}/api/auth/line/callback`;
}

// Only allow same-site relative redirects after login.
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/book";
}

type OAuthState = { state: string; mode: "login" | "bind" | "admin"; next: string; invite?: string };

export async function setStateCookie(value: OAuthState): Promise<void> {
  const store = await cookies();
  store.set(STATE_COOKIE, sign(JSON.stringify(value)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TEN_MIN_S,
    path: "/",
  });
}

export async function takeStateCookie(): Promise<OAuthState | null> {
  const store = await cookies();
  const raw = store.get(STATE_COOKIE)?.value;
  store.delete({ name: STATE_COOKIE, path: "/" });
  const json = raw ? unsign(raw) : null;
  if (!json) return null;
  try {
    return JSON.parse(json) as OAuthState;
  } catch {
    return null;
  }
}

export function newState(): string {
  return randomBytes(16).toString("base64url");
}

export function buildAuthorizeUrl(req: Request, state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINE_LOGIN_CHANNEL_ID!);
  url.searchParams.set("redirect_uri", callbackUrl(req));
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "profile");
  // Offers to add the official account as a friend so push notifications can reach the customer.
  url.searchParams.set("bot_prompt", "aggressive");
  return url.toString();
}

export type LineProfile = { userId: string; displayName: string };

export async function fetchLineProfile(req: Request, code: string): Promise<LineProfile | null> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(req),
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;

  const profileRes = await fetch(PROFILE_URL, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!profileRes.ok) return null;
  const p = (await profileRes.json()) as { userId?: string; displayName?: string };
  return p.userId ? { userId: p.userId, displayName: p.displayName ?? "" } : null;
}

// A LINE user who has no member account yet; held in a short-lived signed cookie until they fill in name/phone.
export async function setPendingProfile(profile: LineProfile): Promise<void> {
  const store = await cookies();
  store.set(PENDING_COOKIE, sign(JSON.stringify(profile)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TEN_MIN_S,
    path: "/",
  });
}

export async function getPendingProfile(): Promise<LineProfile | null> {
  const store = await cookies();
  const raw = store.get(PENDING_COOKIE)?.value;
  const json = raw ? unsign(raw) : null;
  if (!json) return null;
  try {
    return JSON.parse(json) as LineProfile;
  } catch {
    return null;
  }
}

export async function clearPendingProfile(): Promise<void> {
  (await cookies()).delete({ name: PENDING_COOKIE, path: "/" });
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("base64"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function callBot(url: string, body: unknown): Promise<boolean> {
  if (!lineBotConfigured()) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_MESSAGING_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function replyLine(replyToken: string, text: string): Promise<boolean> {
  return callBot(REPLY_URL, { replyToken, messages: [{ type: "text", text }] });
}

// Best-effort push; never throws, so a LINE outage cannot break a booking update.
export function pushLine(lineUserId: string, text: string): Promise<boolean> {
  return callBot(PUSH_URL, { to: lineUserId, messages: [{ type: "text", text }] });
}

// Push any LINE message objects (e.g. a Flex card) to a customer who has linked LINE.
export async function pushMessagesToCustomer(customerId: number | null | undefined, messages: unknown[]): Promise<void> {
  if (!customerId || !lineBotConfigured()) return;
  const c = await db.customers.get(customerId);
  if (c?.line_user_id) await callBot(PUSH_URL, { to: c.line_user_id, messages });
}

// Public member-center link for the card button; omitted when the site address isn't configured.
export function accountLink(): string | undefined {
  const origin = process.env.APP_URL?.replace(/\/$/, "");
  return origin ? `${origin}/account` : undefined;
}

// Attach a LINE identity to a customer. Returns false when that LINE user already belongs to someone else.
export async function bindLineToCustomer(customerId: number, profile: LineProfile): Promise<boolean> {
  const owner = await db.customers.findOne({ line_user_id: profile.userId });
  if (owner && owner.id !== customerId) return false;
  await db.customers.update(customerId, {
    line_user_id: profile.userId,
    line_display_name: profile.displayName,
    line_bound: true,
  });
  return true;
}
