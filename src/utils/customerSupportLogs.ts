import { CUSTOM_GENERIC_TABLE } from "../config/customerCare/operationsApicall";

const TABLE = "customer_support_logs";

export function toBookingLogKeys(bookingId?: string | null): string[] {
  const raw = String(bookingId ?? "").trim();
  if (!raw) return [];
  const withoutMjb = raw.startsWith("MJB") ? raw.slice(3) : raw;
  const withMjb = raw.startsWith("MJB") ? raw : `MJB${raw}`;
  return [...new Set([raw, withoutMjb, withMjb])];
}

const sortNewest = (rows: any[]) =>
  [...rows].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );

async function fetchByBookingId(
  partner: string,
  bookingId: string,
): Promise<any[]> {
  const res = await CUSTOM_GENERIC_TABLE(partner, {
    table: TABLE,
    limit: 50,
    page: 1,
    filters: { bookingId },
  });
  return Array.isArray(res?.data) ? sortNewest(res.data) : [];
}

async function fetchForBooking(
  booking: any,
  resolvePartner: (b: any) => string,
): Promise<any[]> {
  const partner = resolvePartner(booking);
  for (const id of toBookingLogKeys(booking?.bookingId)) {
    try {
      const rows = await fetchByBookingId(partner, id);
      if (rows.length) return rows;
    } catch (e) {
      console.error("fetchForBooking", id, e);
    }
  }
  return [];
}

async function fetchBatchByDateRange(
  bookings: any[],
  dateRange: [string, string],
  resolvePartner: (b: any) => string,
): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  const byPartner = new Map<string, Set<string>>();

  bookings.forEach((b) => {
    const p = resolvePartner(b);
    if (!byPartner.has(p)) byPartner.set(p, new Set());
    toBookingLogKeys(b.bookingId).forEach((k) => byPartner.get(p)!.add(k));
  });

  await Promise.all(
    [...byPartner.entries()].map(async ([partner, idSet]) => {
      try {
        const res = await CUSTOM_GENERIC_TABLE(partner, {
          table: TABLE,
          limit: 300,
          page: 1,
          filters: {
            createdAt: {
              gte: `${dateRange[0]} 00:00:00`,
              lte: `${dateRange[1]} 23:59:59`,
            },
          },
        });
        const rows = Array.isArray(res?.data) ? res.data : [];
        rows.forEach((row: any) => {
          const keys = toBookingLogKeys(row?.bookingId);
          const match = keys.find((k) => idSet.has(k));
          if (!match) return;
          if (!result[match]) result[match] = [];
          result[match].push(row);
          keys.forEach((k) => {
            if (idSet.has(k)) result[k] = result[match];
          });
        });
      } catch (e) {
        console.error("fetchBatchByDateRange", partner, e);
      }
    }),
  );

  Object.keys(result).forEach((k) => {
    result[k] = sortNewest(result[k]);
  });

  return result;
}

/** Fetch logs for table/search rows — always 1 genericSearch per partner (batch). */
export async function fetchSupportLogsForBookings(
  bookings: any[],
  dateRange: [string, string],
  resolvePartner: (b: any) => string,
): Promise<Record<string, any[]>> {
  if (!bookings.length) return {};
  return fetchBatchByDateRange(bookings, dateRange, resolvePartner);
}

export async function fetchSupportLogsForBooking(
  booking: any,
  resolvePartner: (b: any) => string,
): Promise<any[]> {
  return fetchForBooking(booking, resolvePartner);
}
