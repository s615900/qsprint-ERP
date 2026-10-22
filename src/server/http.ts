import "server-only";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

// Extracts rows from db.execute() — the pg driver returns a QueryResult, not an array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
