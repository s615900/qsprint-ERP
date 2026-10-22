import { ApiError } from "@/lib/api-client/custom-fetch";

// The API answers failures with { error: "中文原因" }; surface that text when present.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const data = err.data as { error?: unknown } | null;
    if (data && typeof data.error === "string" && data.error) return data.error;
  }
  return fallback;
}
