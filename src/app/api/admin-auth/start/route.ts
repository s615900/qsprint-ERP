import { NextRequest, NextResponse } from "next/server";
import { appOrigin, buildAuthorizeUrl, lineLoginConfigured, newState, safeNext, setStateCookie } from "@/server/line";

// GET /api/admin-auth/start?next=/&invite=TOKEN — sends the admin to LINE; /api/auth/line/callback finishes it
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  if (!lineLoginConfigured()) return NextResponse.redirect(`${origin}/admin-login?error=not_configured`);

  const state = newState();
  const invite = req.nextUrl.searchParams.get("invite") ?? undefined;
  await setStateCookie({ state, mode: "admin", next: safeNext(req.nextUrl.searchParams.get("next") ?? "/"), invite });
  return NextResponse.redirect(buildAuthorizeUrl(req, state));
}
