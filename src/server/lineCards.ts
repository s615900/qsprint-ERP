import "server-only";

// LINE Flex Message cards (the "圖卡" shown in the chat) for booking notifications.

type Booking = {
  booking_number: string;
  service_type: string;
  date: string; // YYYY-MM-DD
  time_slot: string;
  assigned_staff: string | null;
  status: string;
};

const STAGES = ["諮詢", "已預約", "已拍攝", "修圖中", "交件", "結案"] as const;

const BRAND = "#C4814E";
const INK = "#2B2420";
const MUTED = "#8C8077";
const LINE_GRAY = "#E6E0DA";

// Color + one-line explanation for each booking status.
const STATUS_STYLE: Record<string, { color: string; hint: string }> = {
  諮詢: { color: "#D9962B", hint: "我們已收到您的預約，工作室會盡快與您確認。" },
  已預約: { color: "#2E9E6B", hint: "預約已確認，請準時到場；若有異動會再通知您。" },
  已拍攝: { color: "#3B82C4", hint: "拍攝完成，感謝您！接下來會進行挑片與修圖。" },
  修圖中: { color: "#8B5CC6", hint: "您的照片正在精修中，完成後會通知您。" },
  交件: { color: "#1A9AA6", hint: "作品已完成交付，請查收。" },
  結案: { color: "#8C8077", hint: "本案已結案，感謝您的支持，歡迎再次預約！" },
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function prettyDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return `${ymd.replace(/-/g, "/")}（${WEEKDAYS[d.getUTCDay()]}）`;
}

function row(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      { type: "text", text: label, size: "sm", color: MUTED, flex: 2 },
      { type: "text", text: value, size: "sm", color: INK, flex: 5, wrap: true, weight: "bold" },
    ],
  };
}

// Six small bars, filled up to the current stage.
function progress(status: string, color: string) {
  const at = STAGES.indexOf(status as (typeof STAGES)[number]);
  return {
    type: "box",
    layout: "horizontal",
    spacing: "xs",
    margin: "lg",
    contents: STAGES.map((_, i) => ({
      type: "box",
      layout: "vertical",
      flex: 1,
      height: "6px",
      cornerRadius: "3px",
      backgroundColor: i <= at ? color : LINE_GRAY,
      contents: [],
    })),
  };
}

export type BookingCardKind = "created" | "status";

export function bookingCard(kind: BookingCardKind, b: Booking, accountUrl?: string) {
  const style = STATUS_STYLE[b.status] ?? { color: BRAND, hint: "" };
  const title = kind === "created" ? "已收到您的預約" : "預約進度更新";
  const rows = [
    row("單號", b.booking_number),
    row("服務", b.service_type),
    row("日期", prettyDate(b.date)),
    row("時段", b.time_slot),
    ...(b.assigned_staff ? [row("攝影師", b.assigned_staff)] : []),
  ];

  const bubble: Record<string, unknown> = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: style.color,
      paddingAll: "lg",
      contents: [
        { type: "text", text: "青春止秒攝影工作室", size: "xs", color: "#FFFFFFCC" },
        { type: "text", text: title, size: "xl", weight: "bold", color: "#FFFFFF", margin: "xs" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "lg",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            { type: "text", text: "目前狀態", size: "sm", color: MUTED, flex: 2 },
            { type: "text", text: `● ${b.status}`, size: "md", weight: "bold", color: style.color, flex: 5 },
          ],
        },
        progress(b.status, style.color),
        { type: "separator", margin: "lg", color: LINE_GRAY },
        { type: "box", layout: "vertical", spacing: "sm", margin: "lg", contents: rows },
        ...(style.hint
          ? [{ type: "text", text: style.hint, size: "xs", color: MUTED, wrap: true, margin: "lg" }]
          : []),
      ],
    },
  };

  if (accountUrl) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      paddingAll: "md",
      contents: [
        {
          type: "button",
          style: "link",
          height: "sm",
          color: BRAND,
          action: { type: "uri", label: "前往會員中心", uri: accountUrl },
        },
      ],
    };
  }

  return {
    type: "flex" as const,
    altText: `【青春止秒】${title}｜${b.booking_number}｜${b.status}`,
    contents: bubble,
  };
}
