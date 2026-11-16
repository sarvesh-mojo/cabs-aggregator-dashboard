export type RatingKey = "ALL" | "0-6" | "7-8" | "9-10";

export type DayBucket = {
  date: string;
  "0-6": number;
  "7-8": number;
  "9-10": number;
  total: number;
  nps: number;
};

export type MergedNpsRecordsPayload = {
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
  rating?: string;
};

export type MergedNpsDailyBreakdown = {
  date: string;
  label: string;
  "0-6": number;
  "7-8": number;
  "9-10": number;
  total: number;
};

export type MergedNpsScore = {
  score: string;
  promoters: number;
  detractors: number;
  total: number;
};

export type MergedNpsApiData = {
  logs: Record<string, unknown>[];
  ratingCounts: {
    all: number;
    "0-6": number;
    "7-8": number;
    "9-10": number;
  };
  npsScore: MergedNpsScore;
  dailyBreakdown: MergedNpsDailyBreakdown[];
  pagination: {
    currentPage: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
};

export function parseNpsMoneyValue(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number.parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export type NpsFinancialTotals = {
  totalFare: number;
  totalFareCount: number;
  disputeAmount: number;
  disputeCount: number;
  cashgramRedeemedDispute: number;
  cashgramRedeemedCount: number;
  cashgramActiveDispute: number;
  cashgramActiveCount: number;
};

export function sumNpsFinancialTotals(
  logs: Record<string, unknown>[],
): NpsFinancialTotals {
  let totalFare = 0;
  let totalFareCount = 0;
  let disputeAmount = 0;
  let disputeCount = 0;
  let cashgramActiveDispute = 0;
  let cashgramActiveCount = 0;
  let cashgramRedeemedDispute = 0;
  let cashgramRedeemedCount = 0;

  for (const log of logs) {
    const amount = parseNpsMoneyValue(log.amount);
    const fare = parseNpsMoneyValue(log.totalFare);

    disputeAmount += amount;
    if (amount > 0) disputeCount += 1;

    totalFare += fare;
    if (fare > 0) totalFareCount += 1;

    const status = String(log.cashgramStatus ?? "")
      .trim()
      .toUpperCase();
    if (status === "ACTIVE") {
      cashgramActiveDispute += amount;
      cashgramActiveCount += 1;
    } else if (status === "CASHGRAM_REDEEMED") {
      cashgramRedeemedDispute += amount;
      cashgramRedeemedCount += 1;
    }
  }

  return {
    totalFare,
    totalFareCount,
    disputeAmount,
    disputeCount,
    cashgramRedeemedDispute,
    cashgramRedeemedCount,
    cashgramActiveDispute,
    cashgramActiveCount,
  };
}

export function buildMergedNpsPayload(params: {
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
  rating: RatingKey;
}): MergedNpsRecordsPayload {
  return {
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit,
    ...(params.rating !== "ALL" ? { rating: params.rating } : {}),
  };
}

export function mapRatingCountsFromApi(
  counts: MergedNpsApiData["ratingCounts"],
): Record<RatingKey, number> {
  return {
    ALL: counts.all ?? 0,
    "0-6": counts["0-6"] ?? 0,
    "7-8": counts["7-8"] ?? 0,
    "9-10": counts["9-10"] ?? 0,
  };
}

export function mapDailyBreakdownToBuckets(
  breakdown: MergedNpsDailyBreakdown[],
): DayBucket[] {
  return breakdown.map((day) => ({
    date: day.label,
    "0-6": day["0-6"] ?? 0,
    "7-8": day["7-8"] ?? 0,
    "9-10": day["9-10"] ?? 0,
    total: day.total ?? 0,
    nps:
      day.total > 0
        ? Math.round(((day["9-10"] - day["0-6"]) / day.total) * 100)
        : 0,
  }));
}

const MERGED_NPS_HIDDEN_KEYS = new Set([
  "id",
  "opsRemarkAt",
  "opsRemarkTime",
  "ops_remark_at",
]);

/**
 * Merged NPS data column order. UI-only cols (ops remark time, remarks, WhatsApp) are assembled in NpsRecords.tsx.
 * Leading keys: cabPartner → city → button payload → tag → tell us more → dispute → cashgram → total fare → ops remark.
 */
export const MERGED_NPS_COLUMN_ORDER = [
   "npsTime",
  "cabPartner",
  "cityCode",
  "travelType",
  "button_payload",
  "tags",
  "tellusMore",
  "amount",
  "cashgramStatus",
  "totalFare",
  "ops_remark",
  "review",
  "pre_def_review",
  "journeyType",
  "reviewTime",
  "userName",
  "mobile",
  "rating",
  "paidAmount",
  "linkGeneratedAt",
  "statusUpdatedAt",
] as const;

/** WhatsApp status columns — before WhatsApp button, after remarks. */
export const MERGED_NPS_TRAILING_DATA_KEYS = [
  "npsWhatsappSent",
  "NpswhatsappsentTime",
] as const;

export const MERGED_NPS_LAST_COLUMN_KEY = "bookingId";

export type OrderedMergedNpsColumnKeys = {
  mainKeys: string[];
  trailingDataKeys: string[];
  lastKey: string | null;
};

export function getOrderedMergedNpsColumnKeys(
  sampleRow: Record<string, unknown>,
): OrderedMergedNpsColumnKeys {
  const allKeys = new Set(Object.keys(sampleRow));

  const mainKeys = MERGED_NPS_COLUMN_ORDER.filter(
    (key) => allKeys.has(key) && !MERGED_NPS_HIDDEN_KEYS.has(key),
  );

  const trailingDataKeys = MERGED_NPS_TRAILING_DATA_KEYS.filter((key) =>
    allKeys.has(key),
  );

  const knownKeys = new Set<string>([
    ...MERGED_NPS_COLUMN_ORDER,
    ...MERGED_NPS_TRAILING_DATA_KEYS,
    MERGED_NPS_LAST_COLUMN_KEY,
    ...MERGED_NPS_HIDDEN_KEYS,
  ]);

  const extraKeys = [...allKeys].filter(
    (key) => !knownKeys.has(key) && !MERGED_NPS_HIDDEN_KEYS.has(key),
  );

  const lastKey = allKeys.has(MERGED_NPS_LAST_COLUMN_KEY)
    ? MERGED_NPS_LAST_COLUMN_KEY
    : null;

  return {
    mainKeys: [...mainKeys, ...extraKeys],
    trailingDataKeys: [...trailingDataKeys],
    lastKey,
  };
}

export function getMergedNpsRowKey(record: Record<string, unknown>): string {
  return [
    record.id ?? "",
    record.bookingId ?? "",
    record.npsTime ?? "",
  ].join("-");
}
