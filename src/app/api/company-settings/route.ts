import { rawCollection, type CompanySettings } from "@/server/db";
import { UpdateCompanySettingsBody } from "@/lib/api-zod";
import { DEFAULT_COMPANY, getCompany } from "@/server/invoicing";
import { isValidTaxId } from "@/lib/tax";
import { error, json, readJson } from "@/server/http";

// GET /api/company-settings
export async function GET() {
  return json(await getCompany());
}

// PUT /api/company-settings
export async function PUT(req: Request) {
  const parsed = UpdateCompanySettingsBody.safeParse(await readJson(req));
  if (!parsed.success) return error(parsed.error.message, 400);
  const data = parsed.data;
  if (data.tax_id && !isValidTaxId(data.tax_id)) return error("統一編號格式不正確（8 碼數字，且需通過檢查碼）", 400);
  if (data.tax_reg_number && !/^[A-Za-z0-9]{9}$/.test(data.tax_reg_number)) {
    return error("稅籍編號應為 9 碼英數字", 400);
  }

  // Single document (id = 1): fields not being set start from their defaults on first save.
  const defaults: Record<string, unknown> = { ...DEFAULT_COMPANY };
  for (const key of Object.keys(data)) delete defaults[key];
  const col = await rawCollection("company_settings");
  const row = await col.findOneAndUpdate(
    { id: 1 },
    { $set: { ...data, updated_at: new Date() }, $setOnInsert: { id: 1, ...defaults } },
    { upsert: true, returnDocument: "after", projection: { _id: 0 } },
  );
  return json(row as unknown as CompanySettings);
}
