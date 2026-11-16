import { CUSTOM_GENERIC_TABLE } from "../config/customerCare/operationsApicall";
import { toBookingLogKeys } from "./customerSupportLogs";
import type { CachedBookingRemark } from "../components/tables/columns";

const TABLE = "ops_booking_remarks";
export const BOOKING_REMARKS_SESSION_KEY = "homecx-booking-remarks-v1";

const sortNewest = (rows: any[]) =>
  [...rows].sort(
    (a, b) =>
      new Date(b.createdAt || b.opsRemarkCreatedAt || 0).getTime() -
      new Date(a.createdAt || a.opsRemarkCreatedAt || 0).getTime(),
  );

export function readRemarkCacheFromSession(): Record<string, CachedBookingRemark> {
  try {
    const raw = sessionStorage.getItem(BOOKING_REMARKS_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeRemarkCacheToSession(
  cache: Record<string, CachedBookingRemark>,
) {
  try {
    sessionStorage.setItem(BOOKING_REMARKS_SESSION_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

function rowToCacheEntry(row: any, count: number): CachedBookingRemark {
  return {
    remark: String(row?.remark ?? row?.opsRemarks ?? "").trim(),
    createdAt: String(
      row?.createdAt ?? row?.opsRemarkCreatedAt ?? new Date().toISOString(),
    ),
    count,
  };
}

function assignRemarkRows(
  result: Record<string, CachedBookingRemark>,
  bookingId: string | undefined | null,
  rows: any[],
  idSet: Set<string>,
) {
  if (!rows.length) return;
  const sorted = sortNewest(rows);
  const latest = sorted[0];
  const entry = rowToCacheEntry(latest, sorted.length);
  if (!entry.remark) return;

  toBookingLogKeys(bookingId).forEach((key) => {
    if (idSet.has(key)) result[key] = entry;
  });
}

/**
 * Batch hydrate — 1 genericSearch per partner, match by bookingId.
 * No createdAt date filter (remarks stay visible after midnight).
 * View all still uses getOpsBookingRemarks separately.
 */
export async function fetchOpsRemarksForBookings(
  bookings: any[],
  _dateRange: [string, string],
  resolvePartner: (b: any) => string,
): Promise<Record<string, CachedBookingRemark>> {
  const result: Record<string, CachedBookingRemark> = {};
  if (!bookings.length) return result;

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
          limit: 500,
          page: 1,
          filters: {},
        });
        const rows = Array.isArray(res?.data) ? res.data : [];
        const grouped: Record<string, any[]> = {};

        rows.forEach((row: any) => {
          const keys = toBookingLogKeys(row?.bookingId);
          const match = keys.find((k) => idSet.has(k));
          if (!match) return;
          if (!grouped[match]) grouped[match] = [];
          grouped[match].push(row);
        });

        Object.entries(grouped).forEach(([bookingKey, remarkRows]) => {
          assignRemarkRows(result, bookingKey, remarkRows, idSet);
        });
      } catch (e) {
        console.error("fetchOpsRemarksForBookings", partner, e);
      }
    }),
  );

  return result;
}
