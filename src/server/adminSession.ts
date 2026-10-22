import "server-only";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { sign, unsign } from "@/server/session";

export const ADMIN_COOKIE = "admin_session";
// Kept short because the cookie is not re-checked against the admin list on every request.
const ADMIN_MAX_AGE_S = 12 * 60 * 60;

export type AdminSession = { u: string; n: string; exp: number };

export async function setAdminSession(lineUserId: string, name: string): Promise<void> {
  const payload: AdminSession = { u: lineUserId, n: name, exp: Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE_S };
  const store = await cookies();
  store.set(ADMIN_COOKIE, sign(Buffer.from(JSON.stringify(payload)).toString("base64url")), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_MAX_AGE_S,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/" });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  const value = raw ? unsign(raw) : null;
  if (!value) return null;
  try {
    const s = JSON.parse(Buffer.from(value, "base64url").toString()) as AdminSession;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export function envAdminIds(): string[] {
  return (process.env.ADMIN_LINE_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function isAllowedAdmin(lineUserId: string): Promise<boolean> {
  if (envAdminIds().includes(lineUserId)) return true;
  return !!(await db.adminUsers.findOne({ line_user_id: lineUserId }));
}
