import { HealthCheckResponse } from "@/lib/api-zod";
import { json } from "@/server/http";

export async function GET() {
  return json(HealthCheckResponse.parse({ status: "ok" }));
}
