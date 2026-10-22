import "server-only";
import { Repo } from "./mongo";
import type * as T from "./types";

// Every collection the app uses. Defaults mirror the old table defaults so API responses keep
// the same fields (nullable columns are explicit nulls).
export const db = {
  customers: new Repo<T.Customer>("customers", () => ({
    email: null, tags: [], member_tier: "一般", customer_type: "個人", company_name: null, tax_id: null,
    address: null, payment_terms: null, notes: null, line_bound: false, line_user_id: null, line_display_name: null,
  })),
  customerAccounts: new Repo<T.CustomerAccount>("customer_accounts", () => ({ password_hash: null }), { updated: false }),
  lineBindCodes: new Repo<T.LineBindCode>("line_bind_codes", () => ({}), { updated: false }),
  changeRequests: new Repo<T.CustomerChangeRequest>(
    "customer_change_requests",
    () => ({ requested_name: null, requested_phone: null, requested_email: null, status: "待審核", admin_note: null, reviewed_at: null }),
    { updated: false },
  ),
  interactions: new Repo<T.Interaction>("interactions", () => ({ staff: null }), { updated: false }),
  bookings: new Repo<T.Booking>("bookings", () => ({
    contact_email: null, status: "諮詢", assigned_staff: null, notes: null, customer_id: null,
  })),
  quotes: new Repo<T.Quote>("quotes", () => ({
    customer_id: null, contact_email: null, items: [], discount: 0, tax_mode: "含稅", tax_rate: 5, tax_amount: 0, total: 0,
    valid_until: null, status: "草稿", order_id: null, notes: null, terms: null, read_at: null, signer_name: null,
    signed_at: null, signature_image: null,
  })),
  orders: new Repo<T.Order>("orders", () => ({
    customer_id: null, quote_id: null, booking_id: null, contact_email: null, items: [], discount: 0, tax_mode: "含稅",
    tax_rate: 5, tax_amount: 0, total: 0, status: "已成立", delivery_date: null, notes: null,
  })),
  contracts: new Repo<T.Contract>("contracts", () => ({
    customer_id: null, quote_id: null, order_id: null, previous_contract_id: null, contact_email: null, tax_id: null,
    address: null, items: [], discount: 0, tax_mode: "含稅", tax_rate: 5, tax_amount: 0, total: 0, start_date: null,
    end_date: null, terms: null, nda: null, notes: null, status: "草稿", customer_signer_name: null,
    customer_signed_at: null, customer_signature: null, customer_read_at: null, staff_signer_name: null,
    staff_signed_at: null, staff_signature: null,
  })),
  projects: new Repo<T.Project>("projects", () => ({
    customer_id: null, order_id: null, contract_id: null, booking_id: null, contact_phone: null, project_type: "其他",
    status: "洽談中", shoot_date: null, due_date: null, location: null, assigned_staff: null, delivery_link: null, notes: null,
  })),
  transactions: new Repo<T.Transaction>("transactions", () => ({
    method: null, order_id: null, description: null, voucher_type: null, voucher_number: null, voucher_date: null,
    counterparty_name: null, counterparty_tax_id: null, tax_amount: 0, deduct_code: null,
  })),
  staff: new Repo<T.Staff>("staff", () => ({ role: "攝影師", phone: null, notes: null, active: true })),
  products: new Repo<T.Product>("products", () => ({
    description: "", duration: "", price: 0, category: "個人寫真", features: [], active: true, sort_order: 0,
  })),
  invoiceTracks: new Repo<T.InvoiceTrack>("invoice_tracks", () => ({}), { updated: false }),
  invoices: new Repo<T.Invoice>("invoices", () => ({
    track_id: null, customer_id: null, order_id: null, buyer_tax_id: null, tax_type: "應稅", items: [], carrier: null,
    donate_code: null, note: null, status: "已開立", void_reason: null, voided_at: null,
  })),
  invoiceAllowances: new Repo<T.InvoiceAllowance>(
    "invoice_allowances",
    () => ({ reason: null, status: "有效" }),
    { updated: false },
  ),
  adminUsers: new Repo<T.AdminUser>("admin_users", () => ({ display_name: "" }), { updated: false }),
  adminInvites: new Repo<T.AdminInvite>("admin_invites", () => ({ created_by: null, used_at: null }), { updated: false }),
};

export { rawCollection, dailyNumber, taipeiDate, nextId } from "./mongo";
export * from "./types";
export * from "./lineItems";
