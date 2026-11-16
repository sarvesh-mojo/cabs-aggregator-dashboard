/**
 * Toggle merged NPS API (`getNpsRecords`) vs legacy dual-table genericSearch flow.
 * Set to `false` to restore the previous behaviour instantly.
 */
export const USE_MERGED_NPS_API = true;

/** Human-readable column titles for merged API log keys. */
export const MERGED_NPS_COLUMN_TITLES: Record<string, string> = {
  bookingId: "BOOKING ID",
  cabPartner: "CAB PARTNER",
  userName: "CUSTOMER NAME",
  mobile: "PHONE NO.",
  npsTime: "NPS CLICK TIME",
  button_payload: "BUTTON PAYLOAD",
  travelType: "TRAVEL TYPE",
  totalFare: "TOTAL FARE",
  paidAmount: "PAID AMOUNT",
  id: "ID",
  rating: "RATING",
  tags: "TAGS",
  pre_def_review: "TAGS",
  review: "TELL US MORE",
  tellusMore: "TELL US MORE",
  reviewTime: "REVIEW SUBMITTED TIME",
  npsWhatsappSent: "NPS WHATSAPP SENT",
  NpswhatsappsentTime: "NPS WHATSAPP SENT TIME",
  amount: "DISPUTE AMT",
  ops_remark: "OPS REMARK",
  cityCode: "CITY CODE",
  journeyType: "JOURNEY TYPE",
  linkGeneratedAt: "LINK GENERATED AT",
  statusUpdatedAt: "STATUS UPDATED AT",
  cashgramStatus: "CASHGRAM STATUS",
};

/** Split header label into up to two lines (e.g. CAB / PARTNER). */
export function splitColumnTitleLines(title: string): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [""];
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return parts;
  if (parts.length === 2) return parts;
  const mid = Math.ceil(parts.length / 2);
  return [
    parts.slice(0, mid).join(" "),
    parts.slice(mid).join(" "),
  ];
}

/** camelCase / snake_case API keys → spaced header (same font as other NPS columns). */
export function formatMergedNpsColumnTitle(key: string): string {
  const mapped = MERGED_NPS_COLUMN_TITLES[key];
  if (mapped) return mapped;
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .toUpperCase();
}

export const MERGED_NPS_SCROLLABLE_COLUMNS = new Set([
  "TAGS",
  "OPS REMARK",
]);
