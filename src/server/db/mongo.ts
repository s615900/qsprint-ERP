import "server-only";
import { MongoClient, type Collection, type Document, type Sort } from "mongodb";

// ---- connection -------------------------------------------------------------

type Cache = { client?: Promise<MongoClient>; indexes?: Promise<void> };
const globalForMongo = globalThis as unknown as { __mongo?: Cache };
const cache: Cache = (globalForMongo.__mongo ??= {});

export function dbName(): string {
  return process.env.MONGODB_DB || "studio_qcms";
}

function client(): Promise<MongoClient> {
  if (!cache.client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI must be set.");
    cache.client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, ignoreUndefined: true }).connect().catch((err) => {
      cache.client = undefined; // let the next request retry
      throw err;
    });
  }
  return cache.client;
}

export async function rawCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const c = await client();
  await (cache.indexes ??= ensureIndexes(c).catch((err) => {
    cache.indexes = undefined; // retry on the next request instead of failing forever
    throw err;
  }));
  return c.db(dbName()).collection<T>(name);
}

// ---- repositories -----------------------------------------------------------

type Filter = Record<string, unknown>;
type FindOpts = { sort?: Sort; limit?: number };

const NO_ID = { projection: { _id: 0 } } as const;

function stripId<T>(doc: unknown): T {
  const { _id: _unused, ...rest } = doc as Document;
  void _unused;
  return rest as T;
}

// A collection of documents that carry a sequential integer `id`.
export class Repo<T extends { id: number }> {
  constructor(
    readonly name: string,
    private readonly defaults: () => Partial<T> = () => ({}),
    private readonly stamps: { updated: boolean } = { updated: true },
  ) {}

  col(): Promise<Collection<Document>> {
    return rawCollection(this.name);
  }

  async find(filter: Filter = {}, opts: FindOpts = {}): Promise<T[]> {
    const c = await this.col();
    let cursor = c.find(filter, NO_ID);
    if (opts.sort) cursor = cursor.sort(opts.sort);
    if (opts.limit) cursor = cursor.limit(opts.limit);
    return (await cursor.toArray()) as unknown as T[];
  }

  async findOne(filter: Filter): Promise<T | undefined> {
    const c = await this.col();
    return ((await c.findOne(filter, NO_ID)) as unknown as T | null) ?? undefined;
  }

  get(id: number): Promise<T | undefined> {
    return this.findOne({ id });
  }

  async count(filter: Filter = {}): Promise<number> {
    return (await this.col()).countDocuments(filter);
  }

  async insert(data: Partial<Omit<T, "id">>): Promise<T> {
    const now = new Date();
    const doc = {
      ...this.defaults(),
      ...data,
      id: await nextId(this.name),
      created_at: now,
      ...(this.stamps.updated ? { updated_at: now } : {}),
    };
    await (await this.col()).insertOne({ ...doc });
    return doc as unknown as T;
  }

  // Updates the first match; returns the updated document (undefined if none matched).
  async update(filter: Filter | number, patch: Partial<T>): Promise<T | undefined> {
    const c = await this.col();
    const f = typeof filter === "number" ? { id: filter } : filter;
    const $set = { ...patch, ...(this.stamps.updated ? { updated_at: new Date() } : {}) };
    const res = await c.findOneAndUpdate(f, { $set }, { returnDocument: "after", projection: { _id: 0 } });
    return (res as unknown as T | null) ?? undefined;
  }

  async updateMany(filter: Filter, patch: Partial<T>): Promise<number> {
    const c = await this.col();
    const $set = { ...patch, ...(this.stamps.updated ? { updated_at: new Date() } : {}) };
    return (await c.updateMany(filter, { $set })).modifiedCount;
  }

  // Deletes the first match; returns it (undefined if none matched).
  async remove(filter: Filter | number): Promise<T | undefined> {
    const c = await this.col();
    const f = typeof filter === "number" ? { id: filter } : filter;
    const res = await c.findOneAndDelete(f, { projection: { _id: 0 } });
    return (res as unknown as T | null) ?? undefined;
  }

  async removeMany(filter: Filter): Promise<number> {
    return (await (await this.col()).deleteMany(filter)).deletedCount;
  }
}

// ---- counters ---------------------------------------------------------------

async function bump(key: string): Promise<number> {
  const c = await rawCollection<{ _id: string; seq: number }>("counters");
  const res = await c.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return res!.seq;
}

export function nextId(collection: string): Promise<number> {
  return bump(`id:${collection}`);
}

type DailyPrefix = "C" | "B" | "Q" | "O" | "K" | "J" | "R" | "D";

// Today in Taiwan, YYYYMMDD — numbers roll over at local midnight wherever the server runs.
export function taipeiDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(d); // YYYY-MM-DD
}

// "C" / "B" / ... + YYYYMMDD + 3-digit daily sequence. The counter is atomic, so concurrent
// requests never receive the same number.
export async function dailyNumber(prefix: DailyPrefix): Promise<string> {
  const datePart = taipeiDate().replace(/-/g, "");
  const seq = await bump(`daily:${prefix}${datePart}`);
  return `${prefix}${datePart}${String(seq).padStart(3, "0")}`;
}

// ---- indexes ----------------------------------------------------------------

async function ensureIndexes(c: MongoClient): Promise<void> {
  const d = c.db(dbName());
  const unique = (col: string, key: Document, extra: Document = {}) =>
    d.collection(col).createIndex(key, { unique: true, ...extra });
  const plain = (col: string, key: Document) => d.collection(col).createIndex(key);
  const isString = (field: string) => ({ partialFilterExpression: { [field]: { $type: "string" } } });

  // Leftovers from earlier versions of the app (admin invite links, member invite links).
  await d.collection("admin_invites").dropIndex("token_1").catch(() => undefined);
  await d.collection("admin_invites").deleteMany({ code: { $exists: false } }); // old link-style invites
  await d.collection("member_invites").drop().catch(() => undefined);
  await d.collection("products").updateMany({ duration: { $exists: true } }, { $unset: { duration: "" } }); // 拍攝時間欄位已移除

  await Promise.all([
    unique("customers", { id: 1 }),
    unique("customers", { customer_number: 1 }),
    unique("customers", { line_user_id: 1 }, isString("line_user_id")),
    plain("customers", { phone: 1 }),
    unique("customer_accounts", { id: 1 }),
    unique("customer_accounts", { customer_id: 1 }),
    unique("customer_accounts", { phone: 1 }),
    unique("line_bind_codes", { code: 1 }),
    plain("line_bind_codes", { customer_id: 1 }),
    unique("customer_change_requests", { id: 1 }),
    plain("customer_change_requests", { customer_id: 1 }),
    unique("interactions", { id: 1 }),
    plain("interactions", { customer_id: 1 }),
    unique("bookings", { id: 1 }),
    unique("bookings", { booking_number: 1 }),
    plain("bookings", { customer_id: 1 }),
    plain("bookings", { assigned_staff: 1, date: 1 }),
    unique("quotes", { id: 1 }),
    unique("quotes", { quote_number: 1 }),
    unique("orders", { id: 1 }),
    unique("orders", { order_number: 1 }),
    // One order per booking / quote, even if the button is double-clicked.
    unique("orders", { booking_id: 1 }, { partialFilterExpression: { booking_id: { $type: "number" } } }),
    unique("orders", { quote_id: 1 }, { partialFilterExpression: { quote_id: { $type: "number" } } }),
    unique("contracts", { id: 1 }),
    unique("contracts", { contract_number: 1 }),
    unique("projects", { id: 1 }),
    unique("projects", { project_number: 1 }),
    unique("transactions", { id: 1 }),
    plain("transactions", { order_id: 1 }),
    plain("transactions", { date: 1 }),
    unique("staff", { id: 1 }),
    unique("staff", { name: 1 }),
    unique("products", { id: 1 }),
    unique("products", { name: 1 }),
    unique("invoice_tracks", { id: 1 }),
    unique("invoice_tracks", { period: 1, kind: 1, prefix: 1, range_start: 1 }),
    unique("invoices", { id: 1 }),
    unique("invoices", { invoice_number: 1 }),
    plain("invoices", { period: 1 }),
    unique("invoice_allowances", { id: 1 }),
    unique("invoice_allowances", { allowance_number: 1 }),
    plain("invoice_allowances", { invoice_id: 1 }),
    unique("tax_filings", { period: 1 }),
    unique("company_settings", { id: 1 }),
    unique("staff_availability_weekly", { staff_id: 1, weekday: 1 }),
    unique("staff_availability_overrides", { staff_id: 1, date: 1 }),
    unique("availability_weekly", { weekday: 1 }),
    unique("admin_users", { id: 1 }),
    unique("admin_users", { line_user_id: 1 }),
    unique("admin_invites", { id: 1 }),
    unique("admin_invites", { code: 1 }),
  ]);
}

export { stripId };
