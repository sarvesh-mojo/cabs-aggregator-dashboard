export function bookingRowId(booking: { bookingId?: string; bookingid?: string } | null | undefined) {
  const raw = String(booking?.bookingId ?? booking?.bookingid ?? "").trim();
  return raw.replace(/^MJB/i, "");
}

/** ALL-tab searches call every platform. The same booking can come back more than once. */
export function dedupeBookingsById<T extends { bookingId?: string; bookingid?: string }>(
  bookings: T[] = [],
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const booking of bookings) {
    const id = bookingRowId(booking);
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    unique.push(booking);
  }

  return unique;
}
