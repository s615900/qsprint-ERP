export const INVOICE_STATUS_COLOR: Record<string, string> = {
  已開立: "bg-emerald-100 text-emerald-700 border-emerald-200",
  已作廢: "bg-rose-100 text-rose-700 border-rose-200",
};

export const KIND_HINT: Record<string, string> = {
  三聯式: "賣給公司行號，需買受人統編，稅額分列。",
  二聯式: "賣給一般消費者，金額含稅。",
  電子發票: "經電子發票加值服務中心開立；號碼來自平台配號，可選載具或捐贈。",
  免用發票: "金額小、依法可免開統一發票時留存的收據，系統自動編號。",
};
