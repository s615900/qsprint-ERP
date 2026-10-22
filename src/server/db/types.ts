import type { LineItem } from "./lineItems";

// Document shapes stored in MongoDB. Field names match the REST API, ids are sequential integers.
type Ts = { created_at: Date; updated_at: Date };
type YMD = string; // YYYY-MM-DD

export interface Customer extends Ts {
  id: number;
  customer_number: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  category: string;
  tags: string[];
  member_tier: string;
  customer_type: string;
  company_name: string | null;
  tax_id: string | null;
  address: string | null;
  payment_terms: string | null;
  notes: string | null;
  line_bound: boolean;
  line_user_id: string | null;
  line_display_name: string | null;
}

export interface CustomerAccount {
  id: number;
  customer_id: number;
  phone: string;
  password_hash: string | null;
  created_at: Date;
}

export interface LineBindCode {
  id: number;
  code: string;
  customer_id: number;
  expires_at: Date;
  created_at: Date;
}

export interface CustomerChangeRequest {
  id: number;
  customer_id: number;
  requested_name: string | null;
  requested_phone: string | null;
  requested_email: string | null;
  status: string;
  admin_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

export interface Interaction {
  id: number;
  customer_id: number;
  type: string;
  content: string;
  staff: string | null;
  created_at: Date;
}

export interface Booking extends Ts {
  id: number;
  booking_number: string;
  customer_id: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  service_type: string;
  date: YMD;
  time_slot: string;
  status: string;
  assigned_staff: string | null;
  notes: string | null;
}

export interface Quote extends Ts {
  id: number;
  quote_number: string;
  customer_id: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  title: string;
  items: LineItem[];
  discount: number;
  tax_mode: string;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: YMD | null;
  status: string;
  order_id: number | null;
  notes: string | null;
  terms: string | null;
  read_at: Date | null;
  signer_name: string | null;
  signed_at: Date | null;
  signature_image: string | null;
}

export interface Order extends Ts {
  id: number;
  order_number: string;
  customer_id: number | null;
  quote_id: number | null;
  booking_id: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  title: string;
  items: LineItem[];
  discount: number;
  tax_mode: string;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  delivery_date: YMD | null;
  notes: string | null;
}

export interface Contract extends Ts {
  id: number;
  contract_number: string;
  customer_id: number | null;
  quote_id: number | null;
  order_id: number | null;
  previous_contract_id: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  tax_id: string | null;
  address: string | null;
  title: string;
  items: LineItem[];
  discount: number;
  tax_mode: string;
  tax_rate: number;
  tax_amount: number;
  total: number;
  start_date: YMD | null;
  end_date: YMD | null;
  terms: string | null;
  nda: string | null;
  notes: string | null;
  status: string;
  customer_signer_name: string | null;
  customer_signed_at: Date | null;
  customer_signature: string | null;
  customer_read_at: Date | null;
  staff_signer_name: string | null;
  staff_signed_at: Date | null;
  staff_signature: string | null;
}

export interface Project extends Ts {
  id: number;
  project_number: string;
  name: string;
  customer_id: number | null;
  order_id: number | null;
  contract_id: number | null;
  booking_id: number | null;
  contact_name: string;
  contact_phone: string | null;
  project_type: string;
  status: string;
  shoot_date: YMD | null;
  due_date: YMD | null;
  location: string | null;
  assigned_staff: string | null;
  delivery_link: string | null;
  notes: string | null;
}

export interface Transaction extends Ts {
  id: number;
  type: string;
  category: string;
  amount: number;
  date: YMD;
  method: string | null;
  order_id: number | null;
  description: string | null;
  voucher_type: string | null;
  voucher_number: string | null;
  voucher_date: YMD | null;
  counterparty_name: string | null;
  counterparty_tax_id: string | null;
  tax_amount: number;
  deduct_code: number | null;
}

export interface Staff extends Ts {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
}

export interface Product extends Ts {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  features: string[];
  active: boolean;
  sort_order: number;
}

export interface CompanySettings {
  id: number;
  name: string;
  tax_id: string;
  tax_reg_number: string;
  owner: string;
  address: string;
  phone: string;
  email: string;
  bank_account: string;
  tax_rate: number;
  updated_at: Date;
}

export interface InvoiceTrack {
  id: number;
  period: string;
  kind: string;
  prefix: string;
  range_start: number;
  range_end: number;
  next_number: number;
  created_at: Date;
}

export interface Invoice extends Ts {
  id: number;
  invoice_number: string;
  track_id: number | null;
  kind: string;
  invoice_date: YMD;
  period: string;
  customer_id: number | null;
  order_id: number | null;
  buyer_name: string;
  buyer_tax_id: string | null;
  tax_type: string;
  sales_amount: number;
  tax_amount: number;
  total: number;
  items: LineItem[];
  carrier: string | null;
  donate_code: string | null;
  note: string | null;
  status: string;
  void_reason: string | null;
  voided_at: Date | null;
}

export interface InvoiceAllowance {
  id: number;
  allowance_number: string;
  invoice_id: number;
  allowance_date: YMD;
  period: string;
  sales_amount: number;
  tax_amount: number;
  total: number;
  reason: string | null;
  status: string;
  created_at: Date;
}

export interface TaxFiling {
  period: string;
  status: string;
  filed_at: Date | null;
  carry_in_override: number | null;
  note: string | null;
  updated_at: Date;
}

export interface WeeklySlots {
  staff_id: number;
  weekday: number;
  slots: string[];
  updated_at: Date;
}

export interface DateOverride {
  staff_id: number;
  date: YMD;
  slots: string[];
  note: string | null;
  updated_at: Date;
}

export interface StudioWeekly {
  weekday: number;
  slots: string[];
  updated_at: Date;
}

export interface AdminUser {
  id: number;
  line_user_id: string;
  display_name: string;
  staff_id: number | null; // the 人員管理 record this login belongs to
  created_at: Date;
}

// A new admin added in the back office. They send `code` to the official LINE account to link their LINE.
export interface AdminInvite {
  id: number;
  name: string;
  staff_id: number | null;
  code: string; // "A" + 6 digits
  created_by: number | null;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}
