import "server-only";
import { getPhotographer, type Photographer } from "@/server/availability";

// Reads ?staff_id=…; returns undefined when absent, null when invalid/unknown.
export async function readStaffParam(params: URLSearchParams): Promise<Photographer | undefined | null> {
  const raw = params.get("staff_id");
  if (raw === null || raw === "") return undefined;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return (await getPhotographer(id)) ?? null;
}
