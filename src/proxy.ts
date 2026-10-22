import { NextResponse, type NextRequest } from "next/server";

// Gatekeeper for the back office. Runs before every page/API request.
// Public: customer-facing pages, the sign-by-link pages, and the few APIs they need.

const ADMIN_PAGE_PREFIXES = ["/dashboard", "/customers", "/bookings", "/products", "/quotes", "/orders", "/contracts", "/projects", "/accounting", "/staff", "/settings"];

const PUBLIC_API_PREFIXES = [
  "/api/auth/", // customer session + LINE Login
  "/api/admin-auth/", // admin sign-in itself
  "/api/line/webhook", // verified by LINE signature
  "/api/healthz",
  "/api/quote-sign/", // verified by signed link token
  "/api/contract-sign/",
  "/api/my-schedule",
];

// Read-only data the public booking page needs.
const PUBLIC_GET_API = ["/api/packages", "/api/photographers", "/api/availability", "/api/availability/slots", "/api/availability/month"];

const encoder = new TextEncoder();

async function verifySigned(raw: string | undefined): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!raw || !secret) return null;
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = raw.slice(0, idx);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  const expected = btoa(String.fromCharCode(...mac)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const actual = raw.slice(idx + 1);
  if (expected.length !== actual.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return diff === 0 ? value : null;
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const value = await verifySigned(req.cookies.get("admin_session")?.value);
  if (!value) return false;
  try {
    const s = JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof s.exp === "number" && s.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

async function isCustomer(req: NextRequest): Promise<boolean> {
  return (await verifySigned(req.cookies.get("customer_session")?.value)) !== null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Local editing shortcut; ignored in production builds even if the variable is set there.
  if (process.env.NODE_ENV === "development" && process.env.DISABLE_ADMIN_AUTH === "1") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (req.method === "GET" && PUBLIC_GET_API.includes(pathname)) return NextResponse.next();
    if (await isAdmin(req)) return NextResponse.next();
    // Members book through the public page, so a member session may create a booking.
    if (req.method === "POST" && pathname === "/api/bookings" && (await isCustomer(req))) return NextResponse.next();
    return NextResponse.json({ error: "請先登入管理後台" }, { status: 401 });
  }

  const isAdminPage = ADMIN_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isAdminPage && !(await isAdmin(req))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin-login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
