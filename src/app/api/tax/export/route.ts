import type { NextRequest } from "next/server";
import { buildTaxReport } from "@/server/invoicing";
import { DEDUCT_CODES, periodLabel } from "@/lib/tax";
import { error } from "@/server/http";

const PERIOD_RE = /^\d{4}-(01|03|05|07|09|11)$/;

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  // Quote everything; free text starting with = + - @ would be run as a formula by Excel.
  const safe = typeof v === "string" && /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csv(rows: (string | number | null | undefined)[][]): string {
  // BOM so Excel opens the Chinese text correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

// GET /api/tax/export?period=YYYY-MM&type=sales|purchases|summary
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "summary";
  if (!PERIOD_RE.test(period)) return error("period 應為單月起始，例如 2026-01", 400);

  const report = await buildTaxReport(period);
  let rows: (string | number | null | undefined)[][];
  let name: string;

  if (type === "sales") {
    name = "銷項發票明細";
    rows = [
      ["發票號碼", "日期", "格式", "買受人", "買受人統編", "課稅別", "銷售額", "營業稅", "總計", "狀態", "作廢原因", "訂單"],
      ...report.invoices.map((i) => [
        i.invoice_number, i.invoice_date, i.kind, i.buyer_name, i.buyer_tax_id, i.tax_type,
        i.status === "已作廢" ? 0 : i.sales_amount, i.status === "已作廢" ? 0 : i.tax_amount, i.status === "已作廢" ? 0 : i.total,
        i.status, i.void_reason, i.order_number,
      ]),
      ...report.allowance_list.map((a) => [
        a.allowance_number, a.allowance_date, "折讓單", "", "", `折讓 ${a.invoice_number}`,
        a.status === "有效" ? -a.sales_amount : 0, a.status === "有效" ? -a.tax_amount : 0, a.status === "有效" ? -a.total : 0,
        a.status, a.reason, "",
      ]),
    ];
  } else if (type === "purchases") {
    name = "進項憑證明細";
    rows = [
      ["憑證日期", "憑證類型", "憑證號碼", "賣方", "賣方統編", "科目", "含稅金額", "未稅金額", "稅額", "扣抵代號", "說明"],
      ...report.purchases.map((p) => [
        p.voucher_date ?? p.date, p.voucher_type, p.voucher_number, p.counterparty_name, p.counterparty_tax_id, p.category,
        p.amount, p.amount - p.tax_amount, p.tax_amount, p.deduct_code ? `${p.deduct_code} ${DEDUCT_CODES[p.deduct_code]}` : "", p.description,
      ]),
    ];
  } else {
    name = "營業稅401彙總";
    const r = report;
    rows = [
      ["項目", "份數", "金額（銷售額／進項金額）", "稅額"],
      [`營業稅申報 ${periodLabel(period)}（${r.start} ~ ${r.end}）`],
      [`營業人：${r.company.name}`, `統編：${r.company.tax_id}`, `稅籍編號：${r.company.tax_reg_number}`],
      ["【銷項】"],
      ...r.output_rows.map((x) => [`應稅 ${x.label}`, x.count, x.amount, x.tax]),
      [r.allowances.label, r.allowances.count, -r.allowances.amount, -r.allowances.tax],
      ["應稅銷售額合計", "", r.taxable_sales, r.taxable_tax],
      [r.zero_rate.label, r.zero_rate.count, r.zero_rate.amount, 0],
      [r.exempt.label, r.exempt.count, r.exempt.amount, 0],
      ["銷售額總計", "", r.sales_total, ""],
      ["【進項】"],
      ...r.input_rows.map((x) => [x.label, x.count, x.amount, x.tax]),
      ["得扣抵進項稅額合計", "", r.input_deductible_amount, r.input_deductible_tax],
      [r.non_deductible.label, r.non_deductible.count, r.non_deductible.amount, r.non_deductible.tax],
      ["【稅額計算】"],
      ["本期銷項稅額合計", "", "", r.output_tax],
      ["得扣抵進項稅額合計", "", "", r.input_tax],
      ["上期累積留抵稅額", "", "", r.carry_in],
      ["本期應實繳稅額", "", "", r.payable],
      ["本期申報留抵稅額", "", "", r.carry_out],
    ];
  }

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${name}_${period}.csv`)}`,
    },
  });
}
