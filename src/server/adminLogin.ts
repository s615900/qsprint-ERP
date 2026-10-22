import "server-only";
import { NextResponse } from "next/server";
import { isAllowedAdmin, setAdminSession } from "@/server/adminSession";
import type { LineProfile } from "@/server/line";

// Finishes an admin LINE sign-in: only LINE accounts already linked as admins get a session.
// Anyone else is turned away (their LINE id is shown so it can be added to ADMIN_LINE_USER_IDS).
export async function handleAdminCallback(origin: string, profile: LineProfile, next: string): Promise<NextResponse> {
  if (!(await isAllowedAdmin(profile.userId))) {
    return NextResponse.redirect(
      `${origin}/admin-login?error=forbidden&uid=${encodeURIComponent(profile.userId)}&name=${encodeURIComponent(profile.displayName)}`,
    );
  }
  await setAdminSession(profile.userId, profile.displayName);
  return NextResponse.redirect(`${origin}${next}`);
}
