import { db, rawCollection, taipeiDate } from "@/server/db";
import { json } from "@/server/http";

// GET /api/dashboard/summary
export async function GET() {
  const today = taipeiDate();
  const firstOfMonth = new Date(`${today.slice(0, 7)}-01T00:00:00+08:00`);
  const bookings = await rawCollection("bookings");
  const [todayBookings, monthNewCustomers, totalCustomers, totalBookings, byStatus] = await Promise.all([
    db.bookings.count({ date: today }),
    db.customers.count({ created_at: { $gte: firstOfMonth } }),
    db.customers.count(),
    db.bookings.count(),
    bookings.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);
  return json({
    todayBookings,
    monthNewCustomers,
    totalCustomers,
    totalBookings,
    bookingsByStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
  });
}
