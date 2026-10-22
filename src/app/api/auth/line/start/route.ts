import { NextRequest, NextResponse } from "next/server";
import { appOrigin, buildAuthorizeUrl, lineLoginConfigured, newState, safeNext, setStateCookie } from "@/server/line";
import { getCustomerId } from "@/server/session";

// GET /api/auth/line/start?mode=login|bind&next=/book
// Sends the browser to LINE's consent page; the callback finishes the job.
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!lineLoginConfigured()) {
    return NextResponse.redirect(`${origin}/login?line_error=not_configured`);
  }

  const wantsBind = req.nextUrl.searchParams.get("mode") === "bind";
  if (wantsBind && (await getCustomerId()) === undefined) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);
  }

  const state = newState();
  await setStateCookie({ state, mode: wantsBind ? "bind" : "login", next });
  return NextResponse.redirect(buildAuthorizeUrl(req, state));
}
