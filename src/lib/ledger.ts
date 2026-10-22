// Ledger vocab shared by orders (recording payments) and accounting.
export const INCOME_CATEGORIES = ["訂金", "尾款", "加購", "其他收入"] as const;
export const EXPENSE_CATEGORIES = [
  "器材",
  "場地租金",
  "人事薪資",
  "外包修圖",
  "服裝道具",
  "印刷相冊",
  "行銷廣告",
  "交通",
  "其他支出",
] as const;
export const PAYMENT_METHODS = ["銀行轉帳", "現金", "信用卡", "LINE Pay"] as const;
