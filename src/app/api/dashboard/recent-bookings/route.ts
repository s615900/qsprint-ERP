import { db } from "@/server/db";
import { json } from "@/server/http";

// GET /api/dashboard/recent-bookings
export async function GET() {
  const rows = await db.bookings.find({}, { sort: { created_at: -1 }, limit: 5 });
  return json(
    rows.map((b) => ({
      id: b.id,
      customer_id: b.customer_id,
      customer_name: b.contact_name,
      customer_phone: b.contact_phone,
      service_type: b.service_type,
      date: b.date,
      time_slot: b.time_slot,
      status: b.status,
      assigned_staff: b.assigned_staff,
      notes: b.notes,
      created_at: b.created_at,
    })),
  );
}
