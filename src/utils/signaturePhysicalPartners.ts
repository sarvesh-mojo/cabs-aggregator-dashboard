import { GETBOOKING_LOGS } from "../config/customerCare/operationsApicall";
import { SIGNATURE_PHYSICAL_CAB_PARTNERS } from "../config/customerCare/constant";
import { isRequestCanceled } from "../config/apiMethods";

type BookingLogsResponse = {
  bookings?: any[];
  totalRecords?: number;
};

export function resolveSignatureCabPartners(
  selectedCabPartner?: string,
): string[] {
  const selected = selectedCabPartner?.trim();
  if (selected) return [selected];
  return [...SIGNATURE_PHYSICAL_CAB_PARTNERS];
}

/** Merge Signature tab bookings across all physical cab partners (bookingLogs API). */
export async function fetchSignaturePhysicalPartnerLogs(
  platformPartners: string[],
  basePayload: Record<string, unknown>,
  options: {
    signal?: AbortSignal;
    page: number;
    limit: number;
    mode: "count" | "list";
    selectedCabPartner?: string;
  },
): Promise<BookingLogsResponse> {
  const cabPartners = resolveSignatureCabPartners(options.selectedCabPartner);
  const fetchLimit =
    options.mode === "list" ? options.page * options.limit : options.limit;

  const tasks = platformPartners.flatMap((platform) =>
    cabPartners.map((cabPartner) => ({
      platform,
      payload: {
        ...basePayload,
        cabPartner,
        page: options.mode === "list" ? 1 : options.page,
        limit: fetchLimit,
      },
    })),
  );

  const results = await Promise.all(
    tasks.map(async ({ platform, payload }) => {
      try {
        return (await GETBOOKING_LOGS(
          platform,
          payload as any,
          options.signal,
        )) as BookingLogsResponse;
      } catch (error: any) {
        if (isRequestCanceled(error)) throw error;
        console.error(
          "fetchSignaturePhysicalPartnerLogs",
          platform,
          payload.cabPartner,
          error,
        );
        return null;
      }
    }),
  );

  const seen = new Set<string>();
  let mergedBookings: any[] = [];
  let total = 0;

  results.forEach((resp) => {
    if (!resp) return;
    (resp.bookings || []).forEach((booking) => {
      const id = String(booking?.bookingId ?? "").trim();
      if (id) {
        if (seen.has(id)) return;
        seen.add(id);
      }
      mergedBookings.push(booking);
    });
    total += resp.totalRecords || 0;
  });

  if (options.mode === "list") {
    mergedBookings.sort(
      (a, b) =>
        new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime(),
    );
    const startIndex = (options.page - 1) * options.limit;
    mergedBookings = mergedBookings.slice(
      startIndex,
      startIndex + options.limit,
    );
  }

  return { bookings: mergedBookings, totalRecords: total };
}

/** Count-only fetch (limit 1) per physical partner — for sub-tab badges. */
export async function fetchSignaturePartnerCounts(
  platformPartners: string[],
  basePayload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ counts: Record<string, number>; total: number }> {
  const counts: Record<string, number> = {};
  SIGNATURE_PHYSICAL_CAB_PARTNERS.forEach((cabPartner) => {
    counts[cabPartner] = 0;
  });

  const tasks = platformPartners.flatMap((platform) =>
    SIGNATURE_PHYSICAL_CAB_PARTNERS.map((cabPartner) => ({
      platform,
      cabPartner,
    })),
  );

  await Promise.all(
    tasks.map(async ({ platform, cabPartner }) => {
      try {
        const resp = (await GETBOOKING_LOGS(
          platform,
          {
            ...basePayload,
            cabPartner,
            page: 1,
            limit: 1,
          } as any,
          signal,
        )) as BookingLogsResponse;
        counts[cabPartner] =
          (counts[cabPartner] || 0) + (resp?.totalRecords || 0);
      } catch (error: any) {
        if (isRequestCanceled(error)) throw error;
        console.error(
          "fetchSignaturePartnerCounts",
          platform,
          cabPartner,
          error,
        );
      }
    }),
  );

  const total = SIGNATURE_PHYSICAL_CAB_PARTNERS.reduce(
    (sum, cabPartner) => sum + (counts[cabPartner] || 0),
    0,
  );

  return { counts, total };
}
