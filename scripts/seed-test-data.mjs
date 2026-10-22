// Seeds demo customers, bookings, quotes, orders and ledger entries.
// Every row is tagged so `--clean` (and each re-run) removes only test data:
//   customers.tags contains 'test-data'; other tables carry TAG in notes/description.
//
//   npm run db:seed          # wipe previous test data, insert fresh
//   npm run db:seed -- --clean   # wipe only
import { MongoClient } from "mongodb";

try {
  process.loadEnvFile(".env.local");
} catch {
  try {
    process.loadEnvFile(".env");
  } catch {}
}
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be set");

const TAG = "[測試資料]";
const cleanOnly = process.argv.includes("--clean");
const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Same numbering as src/server/db/mongo.ts, but for an arbitrary day.
async function nextNumber(prefix, day) {
  const datePart = day.replaceAll("-", "");
  const res = await db.collection("counters").findOneAndUpdate(
    { _id: `daily:${prefix}${datePart}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return `${prefix}${datePart}${String(res.seq).padStart(3, "0")}`;
}

async function nextId(collection) {
  const res = await db.collection("counters").findOneAndUpdate(
    { _id: `id:${collection}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return res.seq;
}

async function insert(collection, doc) {
  const row = { ...doc, id: await nextId(collection) };
  await db.collection(collection).insertOne({ ...row });
  return row.id;
}

const at = (day) => new Date(`${day}T00:00:00+08:00`);

const total = (items, discount) =>
  Math.max(0, items.reduce((s, i) => s + i.quantity * i.unit_price, 0) - discount);

async function clean() {
  const rx = { $regex: TAG.replace(/[[\]]/g, "\\$&") };
  await db.collection("transactions").deleteMany({ description: rx });
  await db.collection("orders").deleteMany({ notes: rx });
  await db.collection("quotes").deleteMany({ notes: rx });
  await db.collection("bookings").deleteMany({ notes: rx });
  await db.collection("customers").deleteMany({ tags: "test-data" });
}

const customers = [
  { key: "wang", name: "王小明", phone: "0912-345-678", email: "ming@example.com", source: "社群", category: "新人婚紗", tier: "VIP" },
  { key: "lin", name: "林佳怡", phone: "0923-456-789", email: "jiayi@example.com", source: "介紹", category: "親子寫真", tier: "一般" },
  { key: "chen", name: "陳志豪", phone: "0934-567-890", email: null, source: "官網", category: "個人寫真", tier: "一般" },
  { key: "corp", name: "晨光咖啡（張經理）", phone: "02-2345-6789", email: "pr@morninglight.example", source: "廣告", category: "企業商業客戶", tier: "VVIP" },
];

const PKG = {
  weddingPlus: { name: "新人婚紗精緻套組", description: "3個拍攝場景、2套婚紗禮服、造型師全程、100張精修照、精裝相冊兩本、影片剪輯", quantity: 1, unit_price: 48000 },
  family: { name: "親子寫真套組", description: "棚拍或外拍、30張精修照、數位檔案、線上相簿", quantity: 1, unit_price: 8000 },
  portraitPlus: { name: "個人寫真進階套組", description: "外拍+棚拍、3套服裝、50張精修照、數位檔案、1分鐘影片", quantity: 1, unit_price: 12000 },
  corp: { name: "企業商業形象拍攝", description: "企業形象照、產品拍攝、活動記錄、50張精修照、商業授權", quantity: 1, unit_price: 18000 },
};

async function seed() {
  const ids = {};
  for (const c of customers) {
    ids[c.key] = await insert("customers", {
      customer_number: await nextNumber("C", "2026-03-02"),
      name: c.name, phone: c.phone, email: c.email, source: c.source, category: c.category,
      tags: ["test-data"], member_tier: c.tier, customer_type: "個人", company_name: null, tax_id: null,
      address: null, payment_terms: null, notes: TAG, line_bound: false, line_user_id: null, line_display_name: null,
      created_at: at("2026-03-02"), updated_at: at("2026-03-02"),
    });
  }

  const bookings = {};
  for (const [key, cust, service, day, slot, status] of [
    ["wang", "wang", "新人婚紗精緻套組", "2026-08-16", "整天", "修圖中"],
    ["lin", "lin", "親子寫真套組", "2026-09-20", "下午", "交件"],
    ["chen", "chen", "個人寫真進階套組", "2026-10-18", "早上", "已預約"],
  ]) {
    const c = customers.find((x) => x.key === cust);
    bookings[key] = await insert("bookings", {
      booking_number: await nextNumber("B", "2026-07-10"),
      customer_id: ids[cust], contact_name: c.name, contact_phone: c.phone, contact_email: c.email,
      service_type: service, date: day, time_slot: slot, status, assigned_staff: "陳攝影師", notes: TAG,
      created_at: at("2026-07-10"), updated_at: at("2026-07-10"),
    });
  }

  async function insertQuote(q) {
    const c = customers.find((x) => x.key === q.cust);
    const t = total(q.items, q.discount);
    return insert("quotes", {
      quote_number: await nextNumber("Q", q.day),
      customer_id: ids[q.cust], contact_name: c.name, contact_phone: c.phone, contact_email: c.email,
      title: q.title, items: q.items, discount: q.discount, tax_mode: "含稅", tax_rate: 5,
      tax_amount: t - Math.round((t * 100) / 105), total: t, valid_until: q.validUntil, status: q.status,
      order_id: null, notes: `${q.notes ?? "簽約時支付 30% 訂金，交件時付清尾款。"}\n${TAG}`, terms: null,
      read_at: null, signer_name: null, signed_at: null, signature_image: null,
      created_at: at(q.day), updated_at: at(q.day),
    });
  }

  async function insertOrder(o) {
    const c = customers.find((x) => x.key === o.cust);
    const t = total(o.items, o.discount);
    const id = await insert("orders", {
      order_number: await nextNumber("O", o.day),
      customer_id: ids[o.cust], quote_id: o.quoteId ?? null, booking_id: o.bookingId ?? null,
      contact_name: c.name, contact_phone: c.phone, contact_email: c.email, title: o.title, items: o.items,
      discount: o.discount, tax_mode: "含稅", tax_rate: 5, tax_amount: t - Math.round((t * 100) / 105), total: t,
      status: o.status, delivery_date: o.delivery ?? null, notes: `${o.notes ?? ""}\n${TAG}`.trim(),
      created_at: at(o.day), updated_at: at(o.day),
    });
    if (o.quoteId) await db.collection("quotes").updateOne({ id: o.quoteId }, { $set: { order_id: id } });
    return id;
  }

  // Wedding: quote accepted -> order in production, deposit paid.
  const weddingItems = [PKG.weddingPlus, { name: "加購精修照", description: "每張 300 元", quantity: 20, unit_price: 300 }];
  const qWedding = await insertQuote({ cust: "wang", day: "2026-07-05", title: "王小明 & 李小華 婚紗拍攝", items: weddingItems, discount: 2000, validUntil: "2026-07-19", status: "已接受" });
  const oWedding = await insertOrder({ cust: "wang", day: "2026-07-08", quoteId: qWedding, bookingId: bookings.wang, title: "王小明 & 李小華 婚紗拍攝", items: weddingItems, discount: 2000, status: "製作中", delivery: "2026-10-30" });

  // Family: delivered and fully paid.
  const familyItems = [PKG.family, { name: "實體相框 8x10", description: null, quantity: 2, unit_price: 800 }];
  const qFamily = await insertQuote({ cust: "lin", day: "2026-08-25", title: "林佳怡 全家福親子寫真", items: familyItems, discount: 0, validUntil: "2026-09-08", status: "已接受" });
  const oFamily = await insertOrder({ cust: "lin", day: "2026-08-28", quoteId: qFamily, bookingId: bookings.lin, title: "林佳怡 全家福親子寫真", items: familyItems, discount: 0, status: "已交付", delivery: "2026-10-04" });

  // Corporate: direct order (no quote), closed, fully paid.
  const corpItems = [PKG.corp, { name: "活動紀錄（半天）", description: "開幕活動側拍", quantity: 1, unit_price: 9000 }];
  const oCorp = await insertOrder({ cust: "corp", day: "2026-05-12", title: "晨光咖啡 品牌形象與開幕活動", items: corpItems, discount: 3000, status: "已結案", delivery: "2026-06-10", notes: "需開立統編發票" });

  // Portrait: just ordered, nothing paid yet.
  const oPortrait = await insertOrder({ cust: "chen", day: "2026-10-01", bookingId: bookings.chen, title: "陳志豪 個人形象寫真", items: [PKG.portraitPlus], discount: 0, status: "已成立", delivery: "2026-11-15" });

  // Open quotes in various states.
  await insertQuote({ cust: "corp", day: "2026-09-28", title: "晨光咖啡 秋季新品產品攝影", items: [{ name: "產品去背攝影", description: "白底去背，每品項 3 角度", quantity: 12, unit_price: 1200 }, { name: "情境照", description: "店內情境擺拍", quantity: 6, unit_price: 2500 }], discount: 1400, validUntil: "2026-10-12", status: "已送出" });
  await insertQuote({ cust: "chen", day: "2026-09-01", title: "陳志豪 畢業紀念寫真", items: [{ name: "個人寫真基礎套組", description: "棚拍、1套服裝、20張精修照、數位檔案", quantity: 1, unit_price: 6000 }], discount: 0, validUntil: "2026-09-15", status: "已送出" });
  await insertQuote({ cust: "lin", day: "2026-10-03", title: "林佳怡 寶寶週歲寫真", items: [PKG.family], discount: 500, validUntil: "2026-10-17", status: "草稿", notes: "待確認拍攝日期" });
  await insertQuote({ cust: "wang", day: "2026-06-10", title: "王小明 婚禮當天動態錄影", items: [{ name: "婚禮錄影（全天）", description: "雙機拍攝、精華影片 5 分鐘", quantity: 1, unit_price: 35000 }], discount: 0, validUntil: "2026-06-24", status: "已拒絕", notes: "客戶預算考量，改找親友拍攝" });

  // Ledger: order payments + monthly running costs across the year.
  const tx = (type, category, amount, date, method, orderId, description) =>
    insert("transactions", {
      type, category, amount, date, method, order_id: orderId, description: `${description ? description + " " : ""}${TAG}`,
      voucher_type: null, voucher_number: null, voucher_date: null, counterparty_name: null, counterparty_tax_id: null,
      tax_amount: 0, deduct_code: null, created_at: new Date(), updated_at: new Date(),
    });

  // Earlier closed jobs so each month has realistic income on the chart.
  const history = [
    ["wang", "01-08", "02-06", PKG.weddingPlus, "林大同 & 吳小琪 婚紗拍攝"],
    ["lin", "01-20", "02-14", PKG.family, "張家 親子寫真"],
    ["corp", "02-10", "03-08", PKG.corp, "好日子烘焙 產品攝影"],
    ["wang", "03-03", "04-10", PKG.weddingPlus, "黃志明 & 蔡依婷 婚紗拍攝"],
    ["chen", "03-22", "04-02", PKG.portraitPlus, "劉品妍 個人寫真"],
    ["wang", "04-15", "05-20", PKG.weddingPlus, "許家豪 & 鄭雅文 婚紗拍攝"],
    ["lin", "05-02", "05-25", PKG.family, "周家 全家福"],
    ["wang", "06-01", "07-12", PKG.weddingPlus, "蘇俊傑 & 何美玲 婚紗拍攝"],
    ["chen", "06-18", "07-01", PKG.portraitPlus, "楊雅筑 個人寫真"],
    ["corp", "07-15", "08-12", PKG.corp, "山嵐民宿 形象攝影"],
    ["wang", "08-03", "09-14", PKG.weddingPlus, "郭建宏 & 謝佩珊 婚紗拍攝"],
    ["chen", "09-05", "09-22", PKG.portraitPlus, "江柏翰 個人寫真"],
  ];
  for (const [cust, orderDay, paidDay, pkg, title] of history) {
    const amount = pkg.unit_price;
    const id = await insertOrder({ cust, day: `2026-${orderDay}`, title, items: [pkg], discount: 0, status: "已結案", delivery: `2026-${paidDay}` });
    const deposit = Math.round(amount * 0.3);
    await tx("收入", "訂金", deposit, `2026-${orderDay}`, "銀行轉帳", id, null);
    await tx("收入", "尾款", amount - deposit, `2026-${paidDay}`, "銀行轉帳", id, null);
  }

  await tx("收入", "訂金", 7200, "2026-05-12", "銀行轉帳", oCorp, "匯款末五碼 55021");
  await tx("收入", "尾款", 16800, "2026-06-12", "銀行轉帳", oCorp, null);
  await tx("收入", "訂金", 15000, "2026-07-08", "銀行轉帳", oWedding, "匯款末五碼 31877");
  await tx("收入", "訂金", 3000, "2026-08-28", "LINE Pay", oFamily, null);
  await tx("收入", "尾款", 6600, "2026-10-04", "現金", oFamily, "交件時付清");
  await tx("收入", "其他收入", 3500, "2026-04-18", "現金", null, "攝影棚場地出租 2 小時");
  await tx("收入", "其他收入", 2400, "2026-09-07", "銀行轉帳", null, "證件照 6 位");

  for (const m of ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]) {
    await tx("支出", "場地租金", 12000, `2026-${m}-05`, "銀行轉帳", null, "攝影棚月租");
    if (m !== "10") await tx("支出", "人事薪資", 15000, `2026-${m}-28`, "銀行轉帳", null, "兼職助理薪資");
  }
  await tx("支出", "器材", 38900, "2026-03-15", "信用卡", null, "85mm f/1.4 鏡頭");
  await tx("支出", "器材", 6800, "2026-07-02", "信用卡", null, "持續燈 x2");
  await tx("支出", "外包修圖", 8000, "2026-08-30", "銀行轉帳", null, "婚紗精修 100 張");
  await tx("支出", "服裝道具", 4500, "2026-07-20", "信用卡", null, "婚紗頭飾、捧花");
  await tx("支出", "印刷相冊", 5200, "2026-09-25", "銀行轉帳", null, "林家相框與相本");
  await tx("支出", "行銷廣告", 6000, "2026-09-10", "信用卡", null, "Meta 廣告");
  await tx("支出", "行銷廣告", 4000, "2026-10-02", "信用卡", null, "Meta 廣告");
  await tx("支出", "交通", 1350, "2026-08-16", "現金", null, "婚紗外拍車資");
}

await client.connect();
db = client.db(process.env.MONGODB_DB || "studio_qcms");
try {
  await clean();
  if (!cleanOnly) await seed();
  console.log(cleanOnly ? "已清除測試資料" : "測試資料已建立");
} finally {
  await client.close();
}
