import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Public sign links carry a signed record id, so the link itself is the
// credential. The kind is mixed into the signature so a quote token can't be
// replayed against the contract endpoints (or vice versa).
type Kind = "quote" | "contract" | "staff";

function secret(): string {
  const val = process.env.SESSION_SECRET;
  if (!val) throw new Error("SESSION_SECRET must be set. Did you forget to provision it?");
  return val;
}

function sign(kind: Kind, payload: string): string {
  return createHmac("sha256", secret()).update(`${kind}:${payload}`).digest("base64url");
}

export function signDocToken(kind: Kind, id: number): string {
  const payload = Buffer.from(String(id), "utf8").toString("base64url");
  return `${payload}.${sign(kind, payload)}`;
}

export function verifyDocToken(kind: Kind, token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = Buffer.from(sign(kind, payload));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const text = Buffer.from(payload, "base64url").toString("utf8");
  return /^\d+$/.test(text) ? Number(text) : null;
}

export const SIGNATURE_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
// ~300 KB of base64 is far more than a signature drawn on a 200px canvas needs.
export const SIGNATURE_MAX_LENGTH = 400_000;
