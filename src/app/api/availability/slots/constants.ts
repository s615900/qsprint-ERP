import { PERIODS } from "@/lib/periods";

// Periods open on a weekday that has never been configured.
export const DEFAULT_SLOTS: string[] = [...PERIODS];

export const MAX_BOOKINGS_PER_SLOT = 1;
