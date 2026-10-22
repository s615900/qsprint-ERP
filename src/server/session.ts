import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "customer_session";
const COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set. Did you forget to provision it?");
  }
  return secret;
}

export function sign(value: string): string {
  const sig = createHmac("sha256", getSecret()).update(value).digest("base64url");
  return `${value}.${sig}`;
}

export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signed);
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? value : null;
}

export async function setCustomerSessionCookie(customerId: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(String(customerId)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_S,
    path: "/",
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete({ name: COOKIE_NAME, path: "/" });
}

// Reads the signed session cookie; returns the customer id or undefined.
export async function getCustomerId(): Promise<number | undefined> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return undefined;
  const value = unsign(raw);
  const customerId = value ? Number(value) : NaN;
  return Number.isNaN(customerId) ? undefined : customerId;
}
