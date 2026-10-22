import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  appOrigin,
  bindLineToCustomer,
  fetchLineProfile,
  lineLoginConfigured,
  setPendingProfile,
  takeStateCookie,
} from "@/server/line";
import { getCustomerId, setCustomerSessionCookie } from "@/server/session";
import { handleAdminCallback } from "@/server/adminLogin";

// GET /api/auth/line/callback — LINE redirects here after the customer approves.
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const params = req.nextUrl.searchParams;
  const saved = await takeStateCookie();

  if (!lineLoginConfigured() || !saved || params.get("state") !== saved.state) {
    return NextResponse.redirect(`${origin}/login?line_error=state`);
  }
  const code = params.get("code");
  const failPage = saved.mode === "admin" ? "/admin-login" : saved.mode === "bind" ? "/account" : "/login";
  if (!code) {
    // Customer cancelled on LINE's page.
    return NextResponse.redirect(`${origin}${failPage}?line_error=cancelled`);
  }

  const profile = await fetchLineProfile(req, code);
  if (!profile) return NextResponse.redirect(`${origin}${failPage}?line_error=profile`);

  if (saved.mode === "admin") return handleAdminCallback(origin, profile, saved.next, saved.invite);

  if (saved.mode === "bind") {
    const customerId = await getCustomerId();
    if (customerId === undefined) return NextResponse.redirect(`${origin}/login?next=/account`);
    const ok = await bindLineToCustomer(customerId, profile);
    return NextResponse.redirect(`${origin}/account?${ok ? "line=bound" : "line_error=taken"}`);
  }

  const existing = await db.customers.findOne({ line_user_id: profile.userId });
  if (existing) {
    await setCustomerSessionCookie(existing.id);
    return NextResponse.redirect(`${origin}${saved.next}`);
  }

  // First visit with this LINE account: collect name/phone on the register page.
  await setPendingProfile(profile);
  return NextResponse.redirect(`${origin}/register?line=1&next=${encodeURIComponent(saved.next)}`);
}
