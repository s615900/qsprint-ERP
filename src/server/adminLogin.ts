import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { isAllowedAdmin, setAdminSession } from "@/server/adminSession";
import type { LineProfile } from "@/server/line";

// Finishes an admin LINE sign-in: known admins get a session, an invite link can add a new admin,
// anyone else is turned away (their LINE id is shown so it can be added to ADMIN_LINE_USER_IDS).
export async function handleAdminCallback(
  origin: string,
  profile: LineProfile,
  next: string,
  invite: string | undefined,
): Promise<NextResponse> {
  let allowed = await isAllowedAdmin(profile.userId);

  if (!allowed && invite) {
    // Claim the invite atomically so one link can only add one admin.
    const row = await db.adminInvites.update(
      { token: invite, used_at: null, expires_at: { $gt: new Date() } },
      { used_at: new Date() },
    );
    if (row) {
      try {
        await db.adminUsers.insert({ line_user_id: profile.userId, display_name: profile.displayName });
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err; // already an admin
      }
      allowed = true;
    }
  }

  if (!allowed) {
    return NextResponse.redirect(
      `${origin}/admin-login?error=forbidden&uid=${encodeURIComponent(profile.userId)}&name=${encodeURIComponent(profile.displayName)}`,
    );
  }
  await setAdminSession(profile.userId, profile.displayName);
  return NextResponse.redirect(`${origin}${next}`);
}
