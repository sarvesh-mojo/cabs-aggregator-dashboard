
import { useCallback, useEffect, useMemo, useRef, useState, type Key, type MouseEvent } from "react";
import {
  Modal,
  Input,
  Button,
  message,
  Tooltip,
  Spin,
  Descriptions,
} from "antd";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import DataTable from "../../components/tables/DataTable";
// import LogsTable  from "../../components/tables/DataTable";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_UPDATE,
  GET_MERGED_NPS_RECORDS,
  GETBOOKING_LOGS,
  SEND_NPS_WHATSAPP_API,
} from "../../config/customerCare/operationsApicall";
import {
  MERGED_NPS_SCROLLABLE_COLUMNS,
  USE_MERGED_NPS_API,
  formatMergedNpsColumnTitle,
  splitColumnTitleLines,
} from "../../config/npsConfig";
import {
  buildMergedNpsPayload,
  getMergedNpsRowKey,
  getOrderedMergedNpsColumnKeys,
  mapDailyBreakdownToBuckets,
  mapRatingCountsFromApi,
  sumNpsFinancialTotals,
  type NpsFinancialTotals,
  type MergedNpsScore,
  type RatingKey as MergedRatingKey,
} from "../../utils/npsMergedApi";
import type { GenericTablePayload } from "../../config/types";
import PageMeta from "../../components/common/PageMeta";
import { RangerPicker } from "../../components/common/RangePicker";
import { CsvDownload } from "../../components/common/CsvDownload";
import moment from "moment";
import { PartnerTab } from "../../components/common/PartnerTab";
import { NpsViewSwitch } from "./NpsPartnerDayBoard";
import { useSelector } from "react-redux";

type RatingKey = "ALL" | "0-6" | "7-8" | "9-10";

const { TextArea } = Input;

interface CustomerReviewRecord {
  id: number | string;
  bookingId?: string;
  review?: string;
  rating?: number;
  partnerName?: string;
  pre_def_review?: string;
  ops_remark?: string;
  opsRemarkAt?: string;
  opsRemarkTime?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const OPS_REMARK_AT_FORMAT = "YYYY-MM-DD HH:mm:ss";

function formatOpsRemarkAt(date?: moment.MomentInput): string {
  return moment(date).format(OPS_REMARK_AT_FORMAT);
}

function getOpsRemarkAt(record: CustomerReviewRecord): string | null {
  const raw =
    record.opsRemarkAt ??
    record.opsRemarkTime ??
    record.ops_remark_at;
  if (raw == null || String(raw).trim() === "") return null;
  return String(raw);
}

function insertColumnAfter<T extends { key?: Key }>(
  cols: T[],
  afterKey: Key,
  newCol: T,
): T[] {
  const idx = cols.findIndex((col) => col.key === afterKey);
  if (idx === -1) return [...cols, newCol];
  return [...cols.slice(0, idx + 1), newCol, ...cols.slice(idx + 1)];
}

/** Data cols → ops remark time → remarks → WhatsApp cols → WhatsApp btn → booking id. */
function assembleNpsTableColumns<T extends { key?: Key }>(
  ordered: ReturnType<typeof getOrderedMergedNpsColumnKeys>,
  buildDataColumn: (key: string) => T,
  opsRemarkTimeCol: T,
  actionCol: T,
  whatsappCol: T,
  tableMainKeys?: string[],
): T[] {
  const mainKeys = tableMainKeys ?? ordered.mainKeys;
  const dynamicCols = mainKeys.map(buildDataColumn);
  const trailingCols = ordered.trailingDataKeys.map(buildDataColumn);
  const lastCols = ordered.lastKey ? [buildDataColumn(ordered.lastKey)] : [];

  return [
    ...insertColumnAfter(dynamicCols, "ops_remark", opsRemarkTimeCol),
    actionCol,
    ...trailingCols,
    whatsappCol,
    ...lastCols,
  ];
}

function assembleNpsCsvColumns<T extends { key?: Key }>(
  ordered: ReturnType<typeof getOrderedMergedNpsColumnKeys>,
  mapCsvCol: (key: string) => T,
  opsRemarkTimeCsvCol: T,
): T[] {
  const cols = insertColumnAfter(
    ordered.mainKeys.map(mapCsvCol),
    "ops_remark",
    opsRemarkTimeCsvCol,
  );

  return [
    ...cols,
    ...ordered.trailingDataKeys.map(mapCsvCol),
    ...(ordered.lastKey ? [mapCsvCol(ordered.lastKey)] : []),
  ];
}

const OPS_REMARK_TIME_COLUMN_KEY = "opsRemarkInsertTime";
const OPS_REMARK_TIME_COLUMN_TITLE = "OPS REMARK TIME";

const TELL_US_MORE_COLUMN_KEYS = new Set(["tellusMore", "review"]);
const NPS_COMPACT_DATETIME_COLUMN_KEYS = new Set([
  "npsTime",
  "reviewTime",
  "linkGeneratedAt",
  "statusUpdatedAt",
]);
const TAG_COLUMN_KEYS = new Set(["tags", "pre_def_review"]);
const TAG_COLUMN_WIDTH = 86;

/** Compact table column widths (UI only). */
const NPS_COLUMN_WIDTHS: Record<string, number> = {
  npsTime: 78,
  button_payload: 82,
  tags: TAG_COLUMN_WIDTH,
  pre_def_review: TAG_COLUMN_WIDTH,
  tellusMore: 190,
  review: 190,
  amount: 68,
  cashgramStatus: 68,
  totalFare: 68,
  paidAmount: 68,
  ops_remark: 110,
  rating: 48,
  mobile: 84,
  userName: 92,
  journeyType: 68,
  reviewTime: 88,
  linkGeneratedAt: 88,
  statusUpdatedAt: 88,
  bookingId: 108,
  npsWhatsappSent: 72,
  NpswhatsappsentTime: 88,
};

/** UI-only merged table columns (CSV export keeps separate API keys). */
const NPS_TABLE_COMPOSITE_COLUMNS = [
  {
    key: "npsTripInfo",
    sources: ["cabPartner", "cityCode", "travelType"],
  },
  {
    key: "npsCustomerContact",
    sources: ["userName", "mobile"],
  },
] as const;

const NPS_TRIP_INFO_COLUMN_KEY = "npsTripInfo";
const NPS_TRIP_INFO_COLUMN_WIDTH = 92;
const NPS_CUSTOMER_CONTACT_COLUMN_KEY = "npsCustomerContact";
const NPS_CUSTOMER_CONTACT_COLUMN_WIDTH = 96;

const NPS_COMPOSITE_SOURCE_TO_KEY = new Map<string, string>(
  NPS_TABLE_COMPOSITE_COLUMNS.flatMap(({ key, sources }) =>
    sources.map((source) => [source, key]),
  ),
);

function getNpsTableMainKeys(mainKeys: string[]): string[] {
  const result: string[] = [];
  const compositeInserted = new Set<string>();
  for (const key of mainKeys) {
    const compositeKey = NPS_COMPOSITE_SOURCE_TO_KEY.get(key);
    if (compositeKey) {
      if (!compositeInserted.has(compositeKey)) {
        result.push(compositeKey);
        compositeInserted.add(compositeKey);
      }
      continue;
    }
    result.push(key);
  }
  return result;
}

function formatTripInfoField(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "-";
  }
  return String(value).trim();
}

function renderTripInfoColumnHeader() {
  return (
    <div className="leading-tight font-semibold text-[10px]">
      <div className="whitespace-nowrap">CAB PARTNER</div>
      <div className="whitespace-nowrap">CITY CODE</div>
      <div className="whitespace-nowrap">TRAVEL TYPE</div>
    </div>
  );
}

function renderTripInfoCell(record: CustomerReviewRecord) {
  const cab = formatTripInfoField(record.cabPartner);
  const city = formatTripInfoField(record.cityCode);
  const travel = formatTripInfoField(record.travelType);
  const tooltip = [cab, city, travel].join(" · ");
  return (
    <Tooltip title={tooltip}>
      <div
        className="text-[11px] leading-tight"
        style={{ maxWidth: NPS_TRIP_INFO_COLUMN_WIDTH }}
      >
        <div className="whitespace-nowrap overflow-hidden text-ellipsis">
          {cab}
        </div>
        <div className="text-[10px] whitespace-nowrap">{city}</div>
        <div className="text-[9px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
          {travel}
        </div>
      </div>
    </Tooltip>
  );
}

function renderCustomerContactColumnHeader() {
  return (
    <div className="leading-tight font-semibold text-[10px]">
      <div className="whitespace-nowrap">CUSTOMER NAME</div>
      <div className="whitespace-nowrap">PHONE NO.</div>
    </div>
  );
}

function renderCustomerContactCell(record: CustomerReviewRecord) {
  const name = formatTripInfoField(record.userName);
  const phone = formatTripInfoField(record.mobile);
  return (
    <Tooltip title={`${name} · ${phone}`}>
      <div
        className="text-[11px] leading-tight"
        style={{ maxWidth: NPS_CUSTOMER_CONTACT_COLUMN_WIDTH }}
      >
        <div className="break-words">{name}</div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {phone}
        </div>
      </div>
    </Tooltip>
  );
}

/** Split camelCase / spaced text into words without breaking inside a word. */
function splitTagIntoParts(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (/\s/.test(trimmed)) {
    return trimmed.split(/\s+/).filter(Boolean);
  }
  const spaced = trimmed
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced.split(/\s+/).filter(Boolean);
}

/** Up to two lines: first/second half of parts (e.g. wrongVehicle + FuelType). */
function tagValueToDisplayLines(text: string): string[] {
  const trimmed = text.trim();
  const hasSpaces = /\s/.test(trimmed);
  const parts = splitTagIntoParts(trimmed);
  if (parts.length <= 1) return [trimmed];
  if (parts.length === 2) return parts;
  const mid = Math.ceil(parts.length / 2);
  const joiner = hasSpaces ? " " : "";
  return [
    parts.slice(0, mid).join(joiner),
    parts.slice(mid).join(joiner),
  ];
}

function renderStackedNpsColumnHeader(title: string) {
  const lines = splitColumnTitleLines(title);
  if (lines.length <= 1) {
    return (
      <span className="block text-[10px] leading-tight font-semibold whitespace-nowrap">
        {lines[0] ?? title}
      </span>
    );
  }
  return (
    <div className="leading-tight font-semibold">
      {lines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          className="text-[10px] whitespace-nowrap"
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function renderTagCell(value: unknown) {
  const text = String(value).trim();
  if (!text) return "-";
  const lines = tagValueToDisplayLines(text);
  const body = (
    <div
      className="text-[11px] leading-tight"
      style={{ maxWidth: TAG_COLUMN_WIDTH }}
    >
      {lines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          className="whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {line}
        </div>
      ))}
    </div>
  );
  return lines.length > 1 || text.length > 14 ? (
    <Tooltip title={text}>{body}</Tooltip>
  ) : (
    body
  );
}

function renderCashgramStatusCell(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "-";
  }
  const raw = String(value).trim();
  const label = raw === "CASHGRAM_REDEEMED" ? "REDEEMED" : raw;
  const text = (
    <span className="text-[11px] whitespace-nowrap">{label}</span>
  );
  return label !== raw ? <Tooltip title={raw}>{text}</Tooltip> : text;
}

function renderCompactDateTimeCell(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "-";
  }
  const raw = String(value).trim();
  const spaceIdx = raw.indexOf(" ");
  if (spaceIdx > 0) {
    const datePart = raw.slice(0, spaceIdx);
    const timePart = raw.slice(spaceIdx + 1).trim();
    if (datePart && timePart) {
      return (
        <div className="leading-tight whitespace-nowrap">
          <div className="text-[11px]">{datePart}</div>
          <div className="text-[9px] text-gray-500 dark:text-gray-400">
            {timePart}
          </div>
        </div>
      );
    }
  }
  return String(value);
}

function renderTellUsMoreCell(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "-";
  }

  const text = String(value);
  return (
    <div
      className="text-[11px] leading-snug break-words whitespace-normal"
      style={{ maxWidth: NPS_COLUMN_WIDTHS.tellusMore }}
    >
      {text}
    </div>
  );
}

type BookingDetailsCacheEntry =
  | { status: "loading" }
  | { status: "loaded"; data: Record<string, unknown> }
  | { status: "not_found" }
  | { status: "error"; message: string };

type BookingDetailField = {
  label: string;
  getValue: (booking: Record<string, unknown>) => unknown;
};

function getNestedValue(
  booking: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, booking);
}

function formatDriverDetails(booking: Record<string, unknown>): string {
  const parts: string[] = [];

  if (booking.driverName || booking.driverMobile) {
    parts.push(
      [
        booking.driverName ? `Name: ${booking.driverName}` : "",
        booking.driverMobile ? `Mobile: ${booking.driverMobile}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  }

  const driverDetails = booking.driverDetails;
  if (Array.isArray(driverDetails)) {
    driverDetails.forEach((driver) => {
      if (!driver || typeof driver !== "object") return;

      const detail = driver as Record<string, unknown>;
      const name = detail.driverName ?? detail.name;
      const mobile = detail.driverMobile ?? detail.mobile;
      const vehicle = detail.vehicleNumber ?? detail.registration_number;

      const segment = [
        name ? `Name: ${name}` : "",
        mobile ? `Mobile: ${mobile}` : "",
        vehicle ? `Vehicle: ${vehicle}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      if (segment) parts.push(segment);
    });
  }

  return parts.length > 0 ? parts.join(" | ") : "-";
}

const NPS_BOOKING_DETAIL_FIELDS: BookingDetailField[] = [
  { label: "Booking ID", getValue: (b) => b.bookingId },
  {
    label: "Name",
    getValue: (b) => b.userName ?? b.customerName ?? b.user_name ?? b.name,
  },
  { label: "Mobile Number", getValue: (b) => b.mobile },
  { label: "Email Id", getValue: (b) => b.email },
  {
    label: "Source Address",
    getValue: (b) => b.sourceAddress ?? b.sourceName,
  },
  {
    label: "Destination Address",
    getValue: (b) => b.destinationAddress ?? b.destinationName,
  },
  { label: "Total Fare", getValue: (b) => b.totalFare },
  {
    label: "Total Paid Fare",
    getValue: (b) => b.paidAmount ?? b.paid,
  },
  {
    label: "Trip Progress",
    getValue: (b) => b.tripProgress ?? b.tripPercentage,
  },
  { label: "Travel Type", getValue: (b) => b.travelType },
  { label: "Vehicle Number", getValue: (b) => b.vehicleNumber },
  { label: "Fuel Type", getValue: (b) => b.fuelType },
  {
    label: "Status",
    getValue: (b) =>
      b.status ? String(b.status).replace(/_/g, " ") : b.status,
  },
  { label: "Trip Start Time", getValue: (b) => b.pickupTime },
  { label: "Created At", getValue: (b) => b.bookingTime },
  {
    label: "Coupon Code",
    getValue: (b) => b.offerCode ?? b.couponCode,
  },
  { label: "Pay Type", getValue: (b) => b.payType },
  { label: "OTP", getValue: (b) => b.otp ?? b.verificationOtp },
  { label: "Seats", getValue: (b) => b.seats },
  {
    label: "Fare - Toll Charges",
    getValue: (b) =>
      getNestedValue(b, "fareDetails.tollCharges") ?? b.tollCharges,
  },
  { label: "Device Type", getValue: (b) => b.deviceType },
  { label: "Driver Details", getValue: (b) => formatDriverDetails(b) },
  { label: "Vehicle Type", getValue: (b) => b.vehicleType },
  { label: "Cab Partner", getValue: (b) => b.cabPartner },
  {
    label: "Drop Off Time",
    getValue: (b) => b.dropOffTime ?? b.dropoffTime ?? b.tripEndTime,
  },
];

function formatBookingDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);

  const str = String(value);
  if (/\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.replace("T", " ").replace(".000Z", "").replace("Z", "");
  }
  return str;
}

function buildBookingDetailItems(booking: Record<string, unknown>) {
  return NPS_BOOKING_DETAIL_FIELDS.map(({ label, getValue }) => ({
    label,
    value: formatBookingDetailValue(getValue(booking)),
  }));
}

const BookingDetailsPanel = ({
  entry,
}: {
  entry: BookingDetailsCacheEntry | undefined;
}) => {
  if (!entry || entry.status === "loading") {
    return (
      <div className="py-6 text-center">
        <Spin size="small" />
      </div>
    );
  }

  if (entry.status === "not_found") {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        No booking details found for this ID.
      </div>
    );
  }

  if (entry.status === "error") {
    return (
      <div className="py-4 text-center text-red-500 text-sm">{entry.message}</div>
    );
  }

  const items = buildBookingDetailItems(entry.data);

  return (
    <Descriptions
      bordered
      size="small"
      column={{ xs: 1, sm: 2, md: 3, xl: 4 }}
      style={{ background: "#fff" }}
    >
      {items.map((item) => (
        <Descriptions.Item key={item.label} label={item.label}>
          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {item.value}
          </span>
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

const buildBookingDetailsPayload = (bookingId: string) => ({
  bookingId,
  pageName: "detail",
  partnerResponse: true,
});

function getBookingIdFromRecord(record: CustomerReviewRecord): string {
  const raw =
    record.bookingId ?? record.bookingid ?? record.BOOKINGID ?? "";
  return String(raw).trim();
}

const MAX_BOOKING_SEARCH_POOL = 1000;
const BOOKING_SEARCH_API_PAGE_LIMIT = 100;

function formatNpsRupeeAmount(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function matchesBookingIdSearch(
  record: CustomerReviewRecord,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return getBookingIdFromRecord(record)
    .toLowerCase()
    .includes(normalizedQuery);
}

function extractBookingFromLogsResponse(
  response: unknown,
): Record<string, unknown> | null {
  if (!response || typeof response !== "object") return null;

  const data = response as Record<string, unknown>;

  if (Array.isArray(data.bookings) && data.bookings.length > 0) {
    return data.bookings[0] as Record<string, unknown>;
  }

  if (data.booking && typeof data.booking === "object") {
    return data.booking as Record<string, unknown>;
  }

  if (data.bookingId) {
    return data;
  }

  if (Array.isArray(response) && response.length > 0) {
    return response[0] as Record<string, unknown>;
  }

  if (data.data && typeof data.data === "object") {
    return extractBookingFromLogsResponse(data.data);
  }

  return null;
}

// interface PaginationState {
//   current: number;
//   pageSize: number;
// }

interface DayBucket {
  date: string;
  "0-6": number;
  "7-8": number;
  "9-10": number;
  total: number;
  nps: number;
}

const TABLE_NAME = "customer_review";
// const EXCLUDED_COLUMN_KEYS: string[] = ["updatedAt"];
const EXCLUDED_COLUMN_KEYS: string[] = [
  "id",
  "opsRemarkAt",
  "opsRemarkTime",
  "ops_remark_at",
];
// const DEFAULT_PAGINATION: PaginationState = { current: 1, pageSize: 10 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRatingValue(
  item: CustomerReviewRecord,
  table: "nps_chat_logs" | "customer_review",
): number | null {
  if (table === "nps_chat_logs") {
    const v = parseInt(String(item.button_payload ?? ""));
    return isNaN(v) ? null : v;
  }
  const ratingStr = String(item.rating ?? "");
  if (ratingStr.includes("-")) {
    const n = Number(ratingStr.split("-")[0]);
    return isNaN(n) ? null : n;
  }
  const n = Number(ratingStr);
  return isNaN(n) ? null : n;
}

function getDateKey(
  item: CustomerReviewRecord,
  table: "nps_chat_logs" | "customer_review",
): string {
  const raw =
    table === "nps_chat_logs"
      ? String(item.sync_datetime ?? "")
      : String(item.createdAt ?? "");
  return raw.split(" ")[0].split("T")[0]; // "YYYY-MM-DD"
}

function buildDayBuckets(
  records: CustomerReviewRecord[],
  table: "nps_chat_logs" | "customer_review",
): DayBucket[] {
  const map: Record<
    string,
    { "0-6": number; "7-8": number; "9-10": number; total: number }
  > = {};

  records.forEach((item) => {
    const val = getRatingValue(item, table);
    const dateKey = getDateKey(item, table);
    if (!dateKey || val === null) return;
    if (!map[dateKey])
      map[dateKey] = { "0-6": 0, "7-8": 0, "9-10": 0, total: 0 };
    map[dateKey].total++;
    if (val <= 6) map[dateKey]["0-6"]++;
    else if (val <= 8) map[dateKey]["7-8"]++;
    else map[dateKey]["9-10"]++;
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, counts]) => ({
      date: moment(dateKey).format("DD-MMM"),
      "0-6": counts["0-6"],
      "7-8": counts["7-8"],
      "9-10": counts["9-10"],
      total: counts.total,
      nps:
        counts.total > 0
          ? Math.round(((counts["9-10"] - counts["0-6"]) / counts.total) * 100)
          : 0,
    }));
}

function grandTotals(buckets: DayBucket[]) {
  const agg = { "0-6": 0, "7-8": 0, "9-10": 0, total: 0, nps: 0 };
  buckets.forEach((b) => {
    agg["0-6"] += b["0-6"];
    agg["7-8"] += b["7-8"];
    agg["9-10"] += b["9-10"];
    agg.total += b.total;
  });
  agg.nps =
    agg.total > 0
      ? Math.round(((agg["9-10"] - agg["0-6"]) / agg.total) * 100)
      : 0;
  return agg;
}

const NpsFinancialSummaryChip = ({
  label,
  amount,
  count,
  loading,
}: {
  label: string;
  amount: number;
  count: number;
  loading: boolean;
}) => (
  <div
    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px]"
    title={`${label} for selected date range and rating filter`}
  >
    <span className="text-gray-700 whitespace-nowrap">
      {label}
      {!loading && (
        <span className="font-normal text-gray-500"> ({count})</span>
      )}
    </span>
    <span className="font-semibold text-gray-900 whitespace-nowrap">
      {loading ? "…" : `₹${formatNpsRupeeAmount(amount)}`}
    </span>
  </div>
);

// ─── NPS Score Badge ──────────────────────────────────────────────────────────

const NpsScoreBadge = ({
  counts,
  npsScore,
}: {
  counts: Record<RatingKey, number>;
  npsScore?: MergedNpsScore | null;
}) => {
  const total = npsScore?.total ?? counts["ALL"];
  const promoters = npsScore?.promoters ?? counts["9-10"];
  const detractors = npsScore?.detractors ?? counts["0-6"];
  const parsedScore = npsScore?.score
    ? Number.parseInt(npsScore.score.replace("%", ""), 10)
    : null;
  const npsScoreValue =
    parsedScore !== null && !Number.isNaN(parsedScore)
      ? parsedScore
      : total > 0
        ? Math.round(((promoters - detractors) / total) * 100)
        : null;

  const colors =
    npsScoreValue === null
      ? null
      : npsScoreValue >= 50
        ? {
            bg: "#f0fdf4",
            border: "#86efac",
            text: "#15803d",
            badge: "#16a34a",
          }
        : npsScoreValue >= 0
          ? {
              bg: "#fffbeb",
              border: "#fcd34d",
              text: "#92400e",
              badge: "#d97706",
            }
          : {
              bg: "#fef2f2",
              border: "#fca5a5",
              text: "#991b1b",
              badge: "#dc2626",
            };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        borderRadius: 12,
        border: `1.5px solid ${colors?.border ?? "#e5e7eb"}`,
        background: colors?.bg ?? "#f9fafb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        minWidth: 200,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: colors?.badge ?? "#9ca3af",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 8px ${colors?.badge ?? "#9ca3af"}55`,
        }}
      >
        <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
          {npsScoreValue !== null ? `${npsScoreValue}%` : "—"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: colors?.text ?? "#374151",
            letterSpacing: "0.04em",
          }}
        >
          NPS SCORE
        </span>
        <span style={{ fontSize: 10, color: "#6b7280" }}>
          {promoters} Promoters · {detractors} Detractors
        </span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>
          ({promoters} − {detractors}) ÷ {total} × 100
        </span>
      </div>
    </div>
  );
};

// ─── Day-wise Summary Table ───────────────────────────────────────────────────

const NpsSummaryTable = ({
  label,
  buckets,
  color,
}: {
  label: string;
  buckets: DayBucket[];
  color: string;
}) => {
  const gt = grandTotals(buckets);

  const cell: React.CSSProperties = {
    padding: "4px 10px",
    fontSize: 12,
    textAlign: "center",
    borderRight: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };
  const hCell: React.CSSProperties = {
    ...cell,
    background: color,
    color: "#fff",
    fontWeight: 700,
    fontSize: 11,
    padding: "6px 10px",
  };
  const labelCell: React.CSSProperties = {
    ...cell,
    textAlign: "left",
    fontWeight: 600,
    background: "#f8faff",
    color: "#374151",
    minWidth: 140,
  };
  // const npsCell = (val: number): React.CSSProperties => ({
  //   ...cell,
  //   fontWeight: 700,
  //   color: val >= 50 ? "#16a34a" : val >= 0 ? "#d97706" : "#dc2626",
  //   background: "#f0f9ff",
  // });

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "inline-block",
          background: color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 14px",
          borderRadius: "6px 6px 0 0",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          overflowX: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: "0 6px 6px 6px",
        }}
      >
        <table
          style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: 12 }}
        >
          <thead>
            <tr>
              <th style={{ ...hCell, textAlign: "left", minWidth: 140 }}>
                NPS
              </th>
              {buckets.map((b) => (
                <th key={b.date} style={hCell}>
                  {b.date}
                </th>
              ))}
              <th style={{ ...hCell, background: "#1d3a8a" }}>Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {(["0-6", "7-8", "9-10"] as const).map((key, idx) => (
              <tr
                key={key}
                style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <td style={labelCell}>
                  {key === "0-6"
                    ? " 0-6 Need Help"
                    : key === "7-8"
                      ? " 7-8 Good"
                      : " 9-10 Excellent"}
                </td>
                {buckets.map((b) => (
                  <td key={b.date} style={cell}>
                    {b[key] ?? 0}
                  </td>
                ))}
                <td style={{ ...cell, fontWeight: 700, background: "#f0f9ff" }}>
                  {gt[key]}
                </td>
              </tr>
            ))}
            <tr style={{ background: "#e8f0fe" }}>
              <td style={{ ...labelCell, fontWeight: 700 }}>Grand Total</td>
              {buckets.map((b) => (
                <td key={b.date} style={{ ...cell, fontWeight: 700 }}>
                  {b.total}
                </td>
              ))}
              <td style={{ ...cell, fontWeight: 700, background: "#dbeafe" }}>
                {gt.total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#374151" }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{p.value !== null ? `${p.value}%` : "—"}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Analytics Panel ──────────────────────────────────────────────────────────

const NpsAnalyticsPanel = ({
  npsLogBuckets,
  reviewBuckets,
}: {
  npsLogBuckets: DayBucket[];
  reviewBuckets: DayBucket[];
}) => {
  const allDates = Array.from(
    new Set([
      ...npsLogBuckets.map((b) => b.date),
      ...reviewBuckets.map((b) => b.date),
    ]),
  ).sort(
    (a, b) => moment(a, "DD-MMM").valueOf() - moment(b, "DD-MMM").valueOf(),
  );

  const chartData = [
    ...allDates.map((date) => ({
      date,
      "NPS Button Clicks":
        npsLogBuckets.find((b) => b.date === date)?.nps ?? null,
      "Customer Reviews":
        reviewBuckets.find((b) => b.date === date)?.nps ?? null,
    })),
    {
      date: "Grand Total",
      "NPS Button Clicks": grandTotals(npsLogBuckets).nps,
      "Customer Reviews": grandTotals(reviewBuckets).nps,
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "20px 20px 16px",
        marginBottom: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 4,
            height: 20,
            background: "linear-gradient(180deg,#3b82f6,#1d3a8a)",
            borderRadius: 4,
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1e293b",
            letterSpacing: "0.03em",
          }}
        >
          NPS Analytics — Day-wise Comparison
        </span>
      </div>

      {/* Summary tables */}
      {npsLogBuckets.length > 0 && (
        <NpsSummaryTable
          label="NPS BUTTON CLICKS"
          buckets={npsLogBuckets}
          color="#3b82f6"
        />
      )}
      {reviewBuckets.length > 0 && (
        <NpsSummaryTable
          label="CUSTOMER REVIEWS"
          buckets={reviewBuckets}
          color="#8b5cf6"
        />
      )}

      {/* Line chart */}
      {chartData.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.08em",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            NPS % Trend
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={["auto", "auto"]}
              />
              <ReTooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
              />
              <ReferenceLine
                y={0}
                stroke="#f87171"
                strokeDasharray="4 2"
                label=""
              />
              <Line
                type="monotone"
                dataKey="NPS Button Clicks"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
                connectNulls
                label={{
                  position: "top",
                  fontSize: 10,
                  fill: "#3b82f6",
                  formatter: (v: any) => (v !== null ? `${v}%` : ""),
                }}
              />
              <Line
                type="monotone"
                dataKey="Customer Reviews"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
                connectNulls
                label={{
                  position: "bottom",
                  fontSize: 10,
                  fill: "#8b5cf6",
                  formatter: (v: any) => (v !== null ? `${v}%` : ""),
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {npsLogBuckets.length === 0 && reviewBuckets.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "#94a3b8",
            padding: "24px 0",
            fontSize: 13,
          }}
        >
          No data found for selected date range.
        </div>
      )}
    </div>
  );
};

const MergedNpsAnalyticsPanel = ({ buckets }: { buckets: DayBucket[] }) => {
  const chartData = [
    ...buckets.map((bucket) => ({
      date: bucket.date,
      "NPS Score": bucket.nps,
    })),
    {
      date: "Grand Total",
      "NPS Score": grandTotals(buckets).nps,
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "20px 20px 16px",
        marginBottom: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 4,
            height: 20,
            background: "linear-gradient(180deg,#3b82f6,#1d3a8a)",
            borderRadius: 4,
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1e293b",
            letterSpacing: "0.03em",
          }}
        >
          NPS Analytics — Day-wise Breakdown
        </span>
      </div>

      {buckets.length > 0 ? (
        <>
          <NpsSummaryTable
            label="MERGED NPS"
            buckets={buckets}
            color="#3b82f6"
          />
          {chartData.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                NPS % Trend
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
                  margin={{ top: 16, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={["auto", "auto"]}
                  />
                  <ReTooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#f87171"
                    strokeDasharray="4 2"
                    label=""
                  />
                  <Line
                    type="monotone"
                    dataKey="NPS Score"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    label={{
                      position: "top",
                      fontSize: 10,
                      fill: "#3b82f6",
                      formatter: (v: unknown) =>
                        v !== null && v !== undefined ? `${v}%` : "",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#94a3b8",
            padding: "24px 0",
            fontSize: 13,
          }}
        >
          No data found for selected date range.
        </div>
      )}
    </div>
  );
};

const RATING_FILTERS: { label: string; value: RatingKey }[] = [
  { label: "All", value: "ALL" },
  { label: "Rating (0-6)", value: "0-6" },
  { label: "Rating (7-8)", value: "7-8" },
  { label: "Rating (9-10)", value: "9-10" },
];

const NPS_CHAT_LOG_COLUMNS: ColumnsType<CustomerReviewRecord> = [
  { title: "ID", dataIndex: "id", key: "id" },
  {
    title: "BOOKING ID",
    dataIndex: "bookingId",
    key: "bookingId",
  },
  {
    title: "CUSTOMER NAME",
    dataIndex: "user_name",
    key: "user_name",
    render: (v) => v ?? "-",
  },
  {
    title: "PHONE NO.",
    dataIndex: "phone",
    key: "phone",
    render: (v) => v ?? "-",
  },
  {
    title: "SYNC DATE & TIME",
    dataIndex: "sync_datetime",
    key: "sync_datetime",
    render: (v) => v ?? "-",
  },
  {
    title: "BUTTON PAYLOAD",
    dataIndex: "button_payload",
    key: "button_payload",
    render: (v) => v ?? "-",
  },
];

const NPS_CHAT_LOG_CSV_COLUMNS = NPS_CHAT_LOG_COLUMNS.map((col) => ({
  title: String(col.title),
  dataIndex: String((col as any).dataIndex),
  key: String(col.key),
}));

// ─── Main Component ───────────────────────────────────────────────────────────

const NpsRecords = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);

  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "indigo";

  const [data, setData] = useState<CustomerReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  // const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [pagination, setPagination] = useState<any>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<CustomerReviewRecord | null>(null);
  const [remarkInput, setRemarkInput] = useState("");
  const [opsRemarkAtInput, setOpsRemarkAtInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [bookingIdSearch, setBookingIdSearch] = useState("");
  const [searchPool, setSearchPool] = useState<CustomerReviewRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>([
    moment().subtract(2, "days").format("YYYY-MM-DD"),
    moment().format("YYYY-MM-DD"),
  ]);
  const [activeTable, setActiveTable] = useState<
    "customer_review" | "nps_chat_logs"
  >("nps_chat_logs");
  const [ratingCounts, setRatingCounts] = useState<Record<RatingKey, number>>({
    ALL: 0,
    "0-6": 0,
    "7-8": 0,
    "9-10": 0,
  });

  // Analytics
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [npsLogAllData, setNpsLogAllData] = useState<CustomerReviewRecord[]>(
    [],
  );
  const [reviewAllData, setReviewAllData] = useState<CustomerReviewRecord[]>(
    [],
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [mergedNpsScore, setMergedNpsScore] = useState<MergedNpsScore | null>(
    null,
  );
  const [financialTotals, setFinancialTotals] =
    useState<NpsFinancialTotals | null>(null);
  const [financialTotalsLoading, setFinancialTotalsLoading] = useState(false);
  const [mergedDailyBuckets, setMergedDailyBuckets] = useState<DayBucket[]>(
    [],
  );

  const COLUMN_TITLE_MAP: Record<string, string> = {
    review: "TELL US MORE",
    createdAt: "REVIEW TIME",
    updatedAt: "UPDATED TIME",
    pre_def_review: "TAGS",
    partnerName: "PARTNER",
    amount: "DISPUTE AMT",
  };

  const [remarkModal, setRemarkModal] = useState<{
    visible: boolean;
    text: string;
  }>({
    visible: false,
    text: "",
  });

  const bookingDetailsCacheRef = useRef<
    Record<string, BookingDetailsCacheEntry>
  >({});
  const bookingDetailsInFlightRef = useRef<Set<string>>(new Set());
  const [bookingDetailsCache, setBookingDetailsCache] = useState<
    Record<string, BookingDetailsCacheEntry>
  >({});
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);

  const getRecordRowKey = useCallback(
    (record: CustomerReviewRecord): Key =>
      USE_MERGED_NPS_API
        ? getMergedNpsRowKey(record)
        : String(record.id),
    [],
  );

  const resolveBookingPartner = useCallback(
    (record: CustomerReviewRecord) => {
      const fromRecord = String(record.partnerName ?? "")
        .trim()
        .toLowerCase();
      return fromRecord || selectedPartner;
    },
    [selectedPartner],
  );

  const getBookingCacheKey = useCallback(
    (bookingId: string, record: CustomerReviewRecord) => {
      const partner = resolveBookingPartner(record);
      return `${partner}:${bookingId.trim()}`;
    },
    [resolveBookingPartner],
  );

  const fetchBookingDetails = useCallback(
    async (bookingId: string, record: CustomerReviewRecord) => {
      const normalizedId = bookingId.trim();
      if (!normalizedId) return;

      const cacheKey = getBookingCacheKey(normalizedId, record);
      const existing = bookingDetailsCacheRef.current[cacheKey];

      if (existing && existing.status !== "loading") {
        return existing;
      }

      if (bookingDetailsInFlightRef.current.has(cacheKey)) {
        return;
      }

      bookingDetailsInFlightRef.current.add(cacheKey);
      bookingDetailsCacheRef.current[cacheKey] = { status: "loading" };
      setBookingDetailsCache({ ...bookingDetailsCacheRef.current });

      try {
        const response: unknown = await GETBOOKING_LOGS(
          resolveBookingPartner(record),
          buildBookingDetailsPayload(normalizedId),
        );

        const booking = extractBookingFromLogsResponse(response);
        bookingDetailsCacheRef.current[cacheKey] = booking
          ? { status: "loaded", data: booking }
          : { status: "not_found" };

        return bookingDetailsCacheRef.current[cacheKey];
      } catch (error) {
        console.error("Failed to fetch booking details:", error);
        bookingDetailsCacheRef.current[cacheKey] = {
          status: "error",
          message: "Failed to load booking details.",
        };
        message.error("Failed to load booking details.");
        return bookingDetailsCacheRef.current[cacheKey];
      } finally {
        bookingDetailsInFlightRef.current.delete(cacheKey);
        setBookingDetailsCache({ ...bookingDetailsCacheRef.current });
      }
    },
    [getBookingCacheKey, resolveBookingPartner],
  );

  const handleBookingDetailsToggle = useCallback(
    async (event: MouseEvent, record: CustomerReviewRecord) => {
      event.stopPropagation();

      const bookingId = getBookingIdFromRecord(record);
      const rowKey = getRecordRowKey(record);

      if (!bookingId) {
        message.warning("Booking ID not available.");
        return;
      }

      if (expandedRowKeys.includes(rowKey)) {
        setExpandedRowKeys([]);
        return;
      }

      setExpandedRowKeys([rowKey]);
      await fetchBookingDetails(bookingId, record);
    },
    [expandedRowKeys, fetchBookingDetails, getRecordRowKey],
  );

  const renderBookingIdCell = useCallback(
    (_value: unknown, record: CustomerReviewRecord) => {
      const bookingId = getBookingIdFromRecord(record) || "-";
      const rowKey = getRecordRowKey(record);
      const isExpanded = expandedRowKeys.includes(rowKey);
      const cacheKey =
        bookingId !== "-"
          ? getBookingCacheKey(bookingId, record)
          : "";
      const isLoading =
        cacheKey !== "" &&
        bookingDetailsCache[cacheKey]?.status === "loading";

      return (
        <div
          className={`flex items-center gap-1 min-w-[140px] ${
            bookingId !== "-"
              ? "cursor-pointer text-gray-800 hover:text-blue-600"
              : ""
          }`}
          role={bookingId !== "-" ? "button" : undefined}
          tabIndex={bookingId !== "-" ? 0 : undefined}
          onClick={(event) => {
            if (bookingId !== "-") {
              handleBookingDetailsToggle(event, record);
            }
          }}
          onKeyDown={(event) => {
            if (
              bookingId !== "-" &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              handleBookingDetailsToggle(event as unknown as MouseEvent, record);
            }
          }}
        >
          {isLoading ? (
            <Spin size="small" />
          ) : isExpanded ? (
            <CaretDownOutlined style={{ color: "#1677ff" }} />
          ) : (
            <CaretRightOutlined style={{ color: "#6b7280" }} />
          )}
          <span>{bookingId}</span>
        </div>
      );
    },
    [
      bookingDetailsCache,
      expandedRowKeys,
      getBookingCacheKey,
      getRecordRowKey,
      handleBookingDetailsToggle,
    ],
  );

  useEffect(() => {
    bookingDetailsCacheRef.current = {};
    bookingDetailsInFlightRef.current.clear();
    setBookingDetailsCache({});
    setExpandedRowKeys([]);
  }, [selectedPartner, activeTable]);

  const SCROLLABLE_COLUMNS = ["TAGS"];

  const fetchData = useCallback(
    // async (_page: number, _limit: number) => {
    async (page: number = 1, limit: number = 10) => {
      setLoading(true);
      try {
        const dateField =
          activeTable === "nps_chat_logs" ? "sync_datetime" : "createdAt";
        const payload: GenericTablePayload = {
          table: activeTable,
          page: page,
          limit: limit,

          // };
          filters: {
            // Server-side dynamic filtering condition applied directly to core layout
            //   ...(ratingFilter !== "ALL" && activeTable !== "nps_chat_logs"
            //     ? { rating: ratingFilter }
            //     : {}),
            //   ...(dateRange
            //     ? { [dateField]: { gte: `${dateRange[0]} 00:00:00`, lte: `${dateRange[1]} 23:59:59` } }
            //     : {}),
            // },
            ...(ratingFilter !== "ALL"
              ? {
                  [activeTable === "nps_chat_logs"
                    ? "button_payload"
                    : "rating"]:
                    activeTable === "nps_chat_logs"
                      ? ratingFilter === "0-6"
                        ? "0-6 Need Help"
                        : ratingFilter === "7-8"
                          ? "7-8 Good"
                          : "9-10 Excellent"
                      : ratingFilter,
                }
              : {}),
            ...(dateRange
              ? {
                  [dateField]: {
                    gte: `${dateRange[0]} 00:00:00`,
                    lte: `${dateRange[1]} 23:59:59`,
                  },
                }
              : {}),
          },
        };

        const res = await CUSTOM_GENERIC_TABLE(selectedPartner, payload);

        if (res?.code === 200 && Array.isArray(res.data)) {
          // Frontend parsing client-side array filter logic completely removed to allow server matching
          setData(res.data);

          // Extrapolates aggregate database counts seamlessly based on returned metadata keys
          const paginationObj = res?.pagination || res?.data?.pagination;
          const total =
          paginationObj?.totalCount || paginationObj?.totalRecords ||
 res?.totalCount || res?.totalRecords || res?.data?.length || 0;
  //         const total =
  // res?.pagination?.totalCount ??
  // res?.totalCount ??
  // res?.totalRecords ??
  // res?.data?.length ??
  // 0;
          setTotalRecords(total);
          setPagination((prev: any) => ({
            ...prev,
            current: page,
            pageSize: limit,
            total,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch NPS Records:", error);
        message.error("Failed to load NPS records.");
        setData([]);
        setTotalRecords(0);
        setPagination((prev: any) => ({ ...prev, total: 0 }));
      } finally {
        setLoading(false);
      }
    },
    [selectedPartner, ratingFilter, activeTable, dateRange],
  );

  const fetchCounts = useCallback(async () => {
    try {
      const dateField =
        activeTable === "nps_chat_logs" ? "sync_datetime" : "createdAt";
      const res = await CUSTOM_GENERIC_TABLE(selectedPartner, {
        table: activeTable,
        page: 1,
        limit: 1500,
        ...(dateRange
          ? {
              filters: {
                [dateField]: {
                  gte: `${dateRange[0]} 00:00:00`,
                  lte: `${dateRange[1]} 23:59:59`,
                },
              },
            }
          : {}),
      });

      if (res?.code === 200 && Array.isArray(res.data)) {
        const allData = res.data as CustomerReviewRecord[];
        const counts: Record<RatingKey, number> = {
          ALL: allData.length,
          "0-6": 0,
          "7-8": 0,
          "9-10": 0,
        };

        allData.forEach((item) => {
          const val = getRatingValue(item, activeTable);
          if (val !== null) {
            if (val <= 6) counts["0-6"]++;
            else if (val <= 8) counts["7-8"]++;
            else counts["9-10"]++;
          }
        });

        setRatingCounts(counts);
      }
    } catch (err) {
      console.error("Count fetch failed", err);
    }
  }, [selectedPartner, activeTable, dateRange]);

  const fetchMergedNpsRecords = useCallback(
    async (page: number = 1, limit: number = 10) => {
      if (!dateRange) return;

      setLoading(true);
      try {
        const payload = buildMergedNpsPayload({
          startDate: dateRange[0],
          endDate: dateRange[1],
          page,
          limit,
          rating: ratingFilter as MergedRatingKey,
        });

        const res = await GET_MERGED_NPS_RECORDS(selectedPartner, payload);

        if (res?.code === 200 && res?.data) {
          const {
            logs = [],
            ratingCounts: apiRatingCounts,
            npsScore,
            dailyBreakdown = [],
            pagination: apiPagination,
          } = res.data;

          setData(Array.isArray(logs) ? logs : []);
          setRatingCounts(mapRatingCountsFromApi(apiRatingCounts ?? {}));
          setMergedNpsScore(npsScore ?? null);
          setMergedDailyBuckets(mapDailyBreakdownToBuckets(dailyBreakdown));

          const total = apiPagination?.totalRecords ?? logs.length ?? 0;
          setTotalRecords(total);
          setPagination((prev: any) => ({
            ...prev,
            current: apiPagination?.currentPage ?? page,
            pageSize: apiPagination?.limit ?? limit,
            total,
          }));
          return;
        }

        setData([]);
        setTotalRecords(0);
        setRatingCounts({ ALL: 0, "0-6": 0, "7-8": 0, "9-10": 0 });
        setMergedNpsScore(null);
        setMergedDailyBuckets([]);
        setPagination((prev: any) => ({ ...prev, total: 0 }));
      } catch (error) {
        console.error("Failed to fetch merged NPS records:", error);
        message.error("Failed to load NPS records.");
        setData([]);
        setTotalRecords(0);
        setPagination((prev: any) => ({ ...prev, total: 0 }));
      } finally {
        setLoading(false);
      }
    },
    [selectedPartner, ratingFilter, dateRange],
  );

  const fetchAllFilteredRecords = useCallback(async (): Promise<
    CustomerReviewRecord[]
  > => {
    if (!dateRange) return [];

    const maxRecords = Math.min(
      Math.max(totalRecords, BOOKING_SEARCH_API_PAGE_LIMIT),
      MAX_BOOKING_SEARCH_POOL,
    );

    if (USE_MERGED_NPS_API) {
      const allRecords: CustomerReviewRecord[] = [];
      let page = 1;
      let knownTotal = maxRecords;

      while (allRecords.length < maxRecords) {
        const payload = buildMergedNpsPayload({
          startDate: dateRange[0],
          endDate: dateRange[1],
          page,
          limit: BOOKING_SEARCH_API_PAGE_LIMIT,
          rating: ratingFilter as MergedRatingKey,
        });
        const res = await GET_MERGED_NPS_RECORDS(selectedPartner, payload);
        if (res?.code !== 200 || !res?.data) break;

        const logs = Array.isArray(res.data.logs) ? res.data.logs : [];
        allRecords.push(...logs);

        knownTotal =
          res.data.pagination?.totalRecords ?? Math.max(knownTotal, allRecords.length);

        if (
          logs.length < BOOKING_SEARCH_API_PAGE_LIMIT ||
          allRecords.length >= knownTotal
        ) {
          break;
        }
        page += 1;
      }

      return allRecords.slice(0, maxRecords);
    }

    const dateField =
      activeTable === "nps_chat_logs" ? "sync_datetime" : "createdAt";
    const legacyFilters = {
      ...(ratingFilter !== "ALL"
        ? {
            [activeTable === "nps_chat_logs" ? "button_payload" : "rating"]:
              activeTable === "nps_chat_logs"
                ? ratingFilter === "0-6"
                  ? "0-6 Need Help"
                  : ratingFilter === "7-8"
                    ? "7-8 Good"
                    : "9-10 Excellent"
                : ratingFilter,
          }
        : {}),
      [dateField]: {
        gte: `${dateRange[0]} 00:00:00`,
        lte: `${dateRange[1]} 23:59:59`,
      },
    };

    const allRecords: CustomerReviewRecord[] = [];
    let page = 1;
    let knownTotal = maxRecords;

    while (allRecords.length < maxRecords) {
      const res = await CUSTOM_GENERIC_TABLE(selectedPartner, {
        table: activeTable,
        page,
        limit: BOOKING_SEARCH_API_PAGE_LIMIT,
        filters: legacyFilters,
      });

      if (res?.code !== 200 || !Array.isArray(res.data)) break;

      const batch = res.data as CustomerReviewRecord[];
      allRecords.push(...batch);

      const paginationObj = res?.pagination || res?.data?.pagination;
      knownTotal =
        paginationObj?.totalCount ||
        paginationObj?.totalRecords ||
        res?.totalCount ||
        res?.totalRecords ||
        Math.max(knownTotal, allRecords.length);

      if (
        batch.length < BOOKING_SEARCH_API_PAGE_LIMIT ||
        allRecords.length >= knownTotal
      ) {
        break;
      }
      page += 1;
    }

    return allRecords.slice(0, maxRecords);
  }, [activeTable, dateRange, ratingFilter, selectedPartner, totalRecords]);

  const refreshNpsRecords = useCallback(() => {
    if (USE_MERGED_NPS_API) {
      fetchMergedNpsRecords(pagination.current, pagination.pageSize);
      return;
    }
    fetchData(pagination.current, pagination.pageSize);
  }, [
    fetchMergedNpsRecords,
    fetchData,
    pagination.current,
    pagination.pageSize,
  ]);

   // Fetch BOTH tables' data for analytics (respects dateRange)
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const buildPayload = (
        table: "nps_chat_logs" | "customer_review",
      ): GenericTablePayload => {
        const dateField =
          table === "nps_chat_logs" ? "sync_datetime" : "createdAt";
        return {
          table,
          page: 1,
          limit: 1500,
          ...(dateRange
            ? {
                filters: {
                  [dateField]: {
                    gte: `${dateRange[0]} 00:00:00`,
                    lte: `${dateRange[1]} 23:59:59`,
                  },
                },
              }
            : {}),
        };
      };

      const [npsRes, reviewRes] = await Promise.all([
        CUSTOM_GENERIC_TABLE(selectedPartner, buildPayload("nps_chat_logs")),
        CUSTOM_GENERIC_TABLE(selectedPartner, buildPayload("customer_review")),
      ]);

      if (npsRes?.code === 200 && Array.isArray(npsRes.data))
        setNpsLogAllData(npsRes.data as CustomerReviewRecord[]);
      if (reviewRes?.code === 200 && Array.isArray(reviewRes.data))
        setReviewAllData(reviewRes.data as CustomerReviewRecord[]);
    } catch (err) {
      console.error("Analytics fetch failed", err);
      message.error("Failed to load analytics data.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedPartner, dateRange]);

  useEffect(() => {
    if (bookingIdSearch.trim()) return;

    if (USE_MERGED_NPS_API) {
      fetchMergedNpsRecords(pagination.current, pagination.pageSize);
      return;
    }
    fetchData(pagination.current, pagination.pageSize);
  }, [
    USE_MERGED_NPS_API,
    fetchMergedNpsRecords,
    fetchData,
    pagination.current,
    pagination.pageSize,
    ratingFilter,
    dateRange,
    activeTable,
    bookingIdSearch,
  ]);

  useEffect(() => {
    setBookingIdSearch("");
    setSearchPool([]);
  }, [dateRange, ratingFilter, selectedPartner, activeTable]);

  /** Sum dispute + fare across all pages for current filters (FE until BE aggregates). */
  useEffect(() => {
    if (!USE_MERGED_NPS_API || !dateRange) {
      setFinancialTotals(null);
      setFinancialTotalsLoading(false);
      return;
    }

    let cancelled = false;
    setFinancialTotalsLoading(true);

    (async () => {
      try {
        const allRecords: Record<string, unknown>[] = [];
        let page = 1;
        let totalFromApi = Number.POSITIVE_INFINITY;

        while (allRecords.length < totalFromApi) {
          const payload = buildMergedNpsPayload({
            startDate: dateRange[0],
            endDate: dateRange[1],
            page,
            limit: BOOKING_SEARCH_API_PAGE_LIMIT,
            rating: ratingFilter as MergedRatingKey,
          });
          const res = await GET_MERGED_NPS_RECORDS(selectedPartner, payload);
          if (res?.code !== 200 || !res?.data) break;

          const logs = Array.isArray(res.data.logs) ? res.data.logs : [];
          if (logs.length === 0) break;

          allRecords.push(...logs);
          totalFromApi =
            res.data.pagination?.totalRecords ?? allRecords.length;

          if (
            logs.length < BOOKING_SEARCH_API_PAGE_LIMIT ||
            allRecords.length >= totalFromApi
          ) {
            break;
          }
          page += 1;
        }

        if (cancelled) return;
        setFinancialTotals(sumNpsFinancialTotals(allRecords));
      } catch (error) {
        console.error("NPS financial totals fetch failed:", error);
        if (!cancelled) setFinancialTotals(null);
      } finally {
        if (!cancelled) setFinancialTotalsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateRange, ratingFilter, selectedPartner]);

  useEffect(() => {
    const query = bookingIdSearch.trim();
    if (!query) {
      setSearchPool([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setSearchLoading(true);
      try {
        const records = await fetchAllFilteredRecords();
        if (!cancelled) setSearchPool(records);
      } catch (error) {
        console.error("Booking ID search pool fetch failed:", error);
        if (!cancelled) {
          setSearchPool([]);
          message.error("Failed to load records for Booking ID search.");
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingIdSearch, fetchAllFilteredRecords]);

  const isBookingSearchActive = Boolean(bookingIdSearch.trim());

  const displayData = useMemo(() => {
    if (!isBookingSearchActive) return data;
    return searchPool.filter((record) =>
      matchesBookingIdSearch(record, bookingIdSearch),
    );
  }, [data, searchPool, bookingIdSearch, isBookingSearchActive]);

  useEffect(() => {
    if (USE_MERGED_NPS_API) return;
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (USE_MERGED_NPS_API || !analyticsOpen) return;
    fetchAnalytics();
  }, [analyticsOpen, fetchAnalytics]);

  // const handleTableChange = (p: { current?: number; pageSize?: number }) =>
  //   setPagination({ current: p.current ?? 1, pageSize: p.pageSize ?? 10 });

  const handleTableChange = (newPagination: any) => {
    setPagination((prev: any) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  const handleRatingFilter = (value: string) => {
    setRatingFilter(value);
    setPagination((prev: any) => ({ ...prev, current: 1 }));
  };

  const handleBookingIdSearch = (value: string) => {
    setBookingIdSearch(value.trim());
    setPagination((prev: any) => ({ ...prev, current: 1 }));
  };

  const handleTableSwitch = (table: "customer_review" | "nps_chat_logs") => {
    setActiveTable(table);
    setData([]);
    setRatingFilter("ALL");
    setPagination((prev: any) => ({ ...prev, current: 1 }));
  };

  const handleOpenModal = (record: CustomerReviewRecord) => {
    if (!record.id) {
      message.warning("Remarks can only be added when a customer review exists.");
      return;
    }
    setSelectedRecord(record);
    setRemarkInput("");
    setOpsRemarkAtInput(formatOpsRemarkAt());
    setIsModalVisible(true);
  };
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedRecord(null);
    setRemarkInput("");
    setOpsRemarkAtInput("");
  };

  const handleUpdateSubmit = async () => {
    if (!selectedRecord) return;
    if (!remarkInput.trim()) {
      message.warning("Please enter a remark before updating.");
      return;
    }
    setSubmitting(true);
    const opsRemarkAt = formatOpsRemarkAt();
    setOpsRemarkAtInput(opsRemarkAt);
    try {
      await CUSTOM_GENERIC_UPDATE(selectedPartner, {
        table: TABLE_NAME,
        id: selectedRecord.id,
        data: {
          bookingId: selectedRecord.bookingId,
          review: selectedRecord.review ?? selectedRecord.tellusMore,
          rating: selectedRecord.rating,
          partnerName: selectedRecord.partnerName,
          pre_def_review:
            selectedRecord.pre_def_review ?? selectedRecord.tags,
          ops_remark: remarkInput.trim(),
          opsRemarkAt,
        },
      });
      setData((prev) =>
        prev.map((item) =>
          item.id === selectedRecord.id
            ? {
                ...item,
                ops_remark: remarkInput.trim(),
                opsRemarkAt,
                opsRemarkTime: opsRemarkAt,
              }
            : item,
        ),
      );
      message.success("Remark updated successfully!");
      handleCloseModal();
      refreshNpsRecords();
    } catch (error) {
      console.error("Remark update failed:", error);
      message.error("Failed to update remark. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsapp = async (record: CustomerReviewRecord) => {
    if (!record.bookingId) {
      message.warning("Booking ID not available.");
      return;
    }

    try {
      await SEND_NPS_WHATSAPP_API(selectedPartner, {
        bookingId: String(record.bookingId),
      });

      message.success("WhatsApp sent successfully");

      setData((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, npsWhatsappSent: 1 } : item,
        ),
      );
    } catch (error) {
      console.error(error);
      message.error("Failed to send WhatsApp");
    }
  };

  const csvColumns = useMemo(() => {
    const opsRemarkTimeCsvCol = {
      title: OPS_REMARK_TIME_COLUMN_TITLE,
      dataIndex: OPS_REMARK_TIME_COLUMN_KEY,
      key: OPS_REMARK_TIME_COLUMN_KEY,
    };

    if (USE_MERGED_NPS_API) {
      if (data.length === 0) return [];
      const ordered = getOrderedMergedNpsColumnKeys(data[0]);
      const mapCsvCol = (key: string) => ({
        title: formatMergedNpsColumnTitle(key),
        dataIndex: key,
        key,
      });
      return assembleNpsCsvColumns(ordered, mapCsvCol, opsRemarkTimeCsvCol);
    }
    if (activeTable === "nps_chat_logs") return NPS_CHAT_LOG_CSV_COLUMNS;
    if (data.length === 0) return [];
    const ordered = getOrderedMergedNpsColumnKeys(data[0]);
    const mapCsvCol = (key: string) => ({
      title: COLUMN_TITLE_MAP[key] ?? key.replace(/_/g, " ").toUpperCase(),
      dataIndex: key,
      key,
    });
    return assembleNpsCsvColumns(
      {
        ...ordered,
        mainKeys: ordered.mainKeys.filter(
          (key) => !EXCLUDED_COLUMN_KEYS.includes(key),
        ),
      },
      mapCsvCol,
      opsRemarkTimeCsvCol,
    );
  }, [data, activeTable]);

  const loadCSVData = useCallback(
    async () =>
      displayData.map((record) => {
        const row: Record<string, unknown> = {};
        csvColumns.forEach((col) => {
          if (col.key === OPS_REMARK_TIME_COLUMN_KEY) {
            row[col.key] = getOpsRemarkAt(record) ?? "-";
            return;
          }
          row[col.key] = record[col.dataIndex] ?? "-";
        });
        return row;
      }),
    [displayData, csvColumns],
  );

  const columns = useMemo((): ColumnsType<CustomerReviewRecord> => {
    const bookingIdColumn: ColumnsType<CustomerReviewRecord>[number] = {
      title: renderStackedNpsColumnHeader("BOOKING ID"),
      dataIndex: "bookingId",
      key: "bookingId",
      render: renderBookingIdCell,
    };

    const opsRemarkTimeCol: ColumnsType<CustomerReviewRecord>[number] = {
      title: renderStackedNpsColumnHeader(OPS_REMARK_TIME_COLUMN_TITLE),
      key: OPS_REMARK_TIME_COLUMN_KEY,
      width: 112,
      render: (_: unknown, record: CustomerReviewRecord) =>
        getOpsRemarkAt(record) ?? "-",
    };

    const actionCol: ColumnsType<CustomerReviewRecord>[number] = {
      title: renderStackedNpsColumnHeader("REMARKS"),
      key: "actions",
      width: 86,
      render: (_: unknown, record: CustomerReviewRecord) => (
        <Button
          type="link"
          size="small"
          style={{ fontSize: 10 }}
          disabled={!record.id}
          onClick={() => handleOpenModal(record)}
        >
          Insert Remark
        </Button>
      ),
    };

    const whatsappCol: ColumnsType<CustomerReviewRecord>[number] = {
      title: renderStackedNpsColumnHeader("NPS WHATSAPP"),
      key: "whatsapp",
      width: 72,
      render: (_: unknown, record: CustomerReviewRecord) => (
        <Button
          type="primary"
          size="small"
          disabled={
            !record.bookingId || Number(record.npsWhatsappSent) === 1
          }
          onClick={() => handleSendWhatsapp(record)}
        >
          {Number(record.npsWhatsappSent) === 1 ? "Sent" : "Send"}
        </Button>
      ),
    };

    if (USE_MERGED_NPS_API) {
      if (data.length === 0) return [];

      const buildMergedDataColumn = (
        key: string,
      ): ColumnsType<CustomerReviewRecord>[number] => {
        if (key === NPS_TRIP_INFO_COLUMN_KEY) {
          return {
            title: renderTripInfoColumnHeader(),
            key: NPS_TRIP_INFO_COLUMN_KEY,
            width: NPS_TRIP_INFO_COLUMN_WIDTH,
            ellipsis: false,
            render: (_: unknown, record: CustomerReviewRecord) =>
              renderTripInfoCell(record),
          };
        }
        if (key === NPS_CUSTOMER_CONTACT_COLUMN_KEY) {
          return {
            title: renderCustomerContactColumnHeader(),
            key: NPS_CUSTOMER_CONTACT_COLUMN_KEY,
            width: NPS_CUSTOMER_CONTACT_COLUMN_WIDTH,
            ellipsis: false,
            render: (_: unknown, record: CustomerReviewRecord) =>
              renderCustomerContactCell(record),
          };
        }
        const headerTitle = formatMergedNpsColumnTitle(key);
        return {
        title: renderStackedNpsColumnHeader(headerTitle),
        dataIndex: key,
        key,
        ...(NPS_COLUMN_WIDTHS[key] != null ? { width: NPS_COLUMN_WIDTHS[key] } : {}),
        ellipsis:
          !TELL_US_MORE_COLUMN_KEYS.has(key) &&
          !NPS_COMPACT_DATETIME_COLUMN_KEYS.has(key) &&
          !TAG_COLUMN_KEYS.has(key),
        render: (value: unknown, record: CustomerReviewRecord) => {
          if (key === "bookingId") {
            return renderBookingIdCell(value, record);
          }
          if (NPS_COMPACT_DATETIME_COLUMN_KEYS.has(key)) {
            return renderCompactDateTimeCell(value);
          }
          if (key === "cashgramStatus") {
            return renderCashgramStatusCell(value);
          }
          if (TELL_US_MORE_COLUMN_KEYS.has(key)) {
            return renderTellUsMoreCell(value);
          }
          if (value === null || value === undefined || value === "") {
            return "-";
          }
          if (TAG_COLUMN_KEYS.has(key)) {
            return renderTagCell(value);
          }
          if (key === "ops_remark") {
            const text = String(value || "-");
            const opsRemarkWidth = NPS_COLUMN_WIDTHS.ops_remark;
            return (
              <Tooltip title={text}>
                <div
                  className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                  style={{ maxWidth: opsRemarkWidth }}
                  onClick={() => setRemarkModal({ visible: true, text })}
                >
                  {text}
                </div>
              </Tooltip>
            );
          }
          const mappedTitle = headerTitle;
          if (MERGED_NPS_SCROLLABLE_COLUMNS.has(mappedTitle)) {
            const opsRemarkWidth = NPS_COLUMN_WIDTHS.ops_remark;
            return (
              <div
                style={{
                  fontSize: 11,
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                  width: opsRemarkWidth,
                  maxWidth: opsRemarkWidth,
                  maxHeight: 72,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                className="hide-scrollbar"
              >
                {String(value)}
              </div>
            );
          }
          return String(value).substring(0, 56);
        },
      };
      };

      const ordered = getOrderedMergedNpsColumnKeys(data[0]);
      return assembleNpsTableColumns(
        ordered,
        buildMergedDataColumn,
        opsRemarkTimeCol,
        actionCol,
        whatsappCol,
        getNpsTableMainKeys(ordered.mainKeys),
      );
    }

    if (activeTable === "nps_chat_logs") {
      return NPS_CHAT_LOG_COLUMNS.map((col) => {
        const base =
          col.key === "bookingId" ? bookingIdColumn : col;
        if (typeof base.title === "string") {
          return {
            ...base,
            title: renderStackedNpsColumnHeader(base.title),
          };
        }
        return base;
      });
    }
    if (data.length === 0) return [];

    const ordered = getOrderedMergedNpsColumnKeys(data[0]);
    const buildLegacyDataColumn = (
      key: string,
    ): ColumnsType<CustomerReviewRecord>[number] => {
        if (key === NPS_TRIP_INFO_COLUMN_KEY) {
          return {
            title: renderTripInfoColumnHeader(),
            key: NPS_TRIP_INFO_COLUMN_KEY,
            width: NPS_TRIP_INFO_COLUMN_WIDTH,
            ellipsis: false,
            render: (_: unknown, record: CustomerReviewRecord) =>
              renderTripInfoCell(record),
          };
        }
        if (key === NPS_CUSTOMER_CONTACT_COLUMN_KEY) {
          return {
            title: renderCustomerContactColumnHeader(),
            key: NPS_CUSTOMER_CONTACT_COLUMN_KEY,
            width: NPS_CUSTOMER_CONTACT_COLUMN_WIDTH,
            ellipsis: false,
            render: (_: unknown, record: CustomerReviewRecord) =>
              renderCustomerContactCell(record),
          };
        }
        const headerTitle =
          COLUMN_TITLE_MAP[key] ?? key.replace(/_/g, " ").toUpperCase();
        return {
        title: renderStackedNpsColumnHeader(headerTitle),
        dataIndex: key,
        key,
        ...(NPS_COLUMN_WIDTHS[key] != null ? { width: NPS_COLUMN_WIDTHS[key] } : {}),
        ellipsis:
          !TELL_US_MORE_COLUMN_KEYS.has(key) &&
          !NPS_COMPACT_DATETIME_COLUMN_KEYS.has(key) &&
          !TAG_COLUMN_KEYS.has(key),
        render: (value: unknown, record: CustomerReviewRecord) => {
          if (key === "bookingId") {
            return renderBookingIdCell(value, record);
          }
          if (NPS_COMPACT_DATETIME_COLUMN_KEYS.has(key)) {
            return renderCompactDateTimeCell(value);
          }
          if (key === "cashgramStatus") {
            return renderCashgramStatusCell(value);
          }
          if (TELL_US_MORE_COLUMN_KEYS.has(key)) {
            return renderTellUsMoreCell(value);
          }
          if (value === null || value === undefined) return "-";
          if (TAG_COLUMN_KEYS.has(key)) {
            return renderTagCell(value);
          }
          if (key === "ops_remark") {
            const text = String(value || "-");
            const opsRemarkWidth = NPS_COLUMN_WIDTHS.ops_remark;
            return (
              <Tooltip title={text}>
                <div
                  className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer"
                  style={{ maxWidth: opsRemarkWidth }}
                  onClick={() => setRemarkModal({ visible: true, text })}
                >
                  {text}
                </div>
              </Tooltip>
            );
          }
          const mappedTitle =
            COLUMN_TITLE_MAP[key] ?? key.replace(/_/g, " ").toUpperCase();
          if (SCROLLABLE_COLUMNS.includes(mappedTitle)) {
            const opsRemarkWidth = NPS_COLUMN_WIDTHS.ops_remark;
            return (
              <div
                style={{
                  fontSize: 11,
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                  width: opsRemarkWidth,
                  maxWidth: opsRemarkWidth,
                  maxHeight: 72,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                className="hide-scrollbar"
              >
                {String(value)}
              </div>
            );
          }
          return String(value).substring(0, 56);
        },
      };
    };

    const legacyMainKeys = ordered.mainKeys.filter(
      (key) => !EXCLUDED_COLUMN_KEYS.includes(key),
    );
    return assembleNpsTableColumns(
      {
        ...ordered,
        mainKeys: legacyMainKeys,
      },
      buildLegacyDataColumn,
      opsRemarkTimeCol,
      actionCol,
      whatsappCol,
      getNpsTableMainKeys(legacyMainKeys),
    );
  }, [data, activeTable, renderBookingIdCell]);

  const tableExpandable = useMemo(
    () => ({
      expandedRowKeys,
      expandIcon: () => null,
      showExpandColumn: false,
      rowExpandable: (record: CustomerReviewRecord) =>
        Boolean(getBookingIdFromRecord(record)),
      expandedRowRender: (record: CustomerReviewRecord) => {
        const bookingId = getBookingIdFromRecord(record);
        if (!bookingId) return null;

        const cacheKey = getBookingCacheKey(bookingId, record);
        return (
          <BookingDetailsPanel entry={bookingDetailsCache[cacheKey]} />
        );
      },
    }),
    [bookingDetailsCache, expandedRowKeys, getBookingCacheKey],
  );

  const npsLogBuckets = useMemo(
    () => buildDayBuckets(npsLogAllData, "nps_chat_logs"),
    [npsLogAllData],
  );
  const reviewBuckets = useMemo(
    () => buildDayBuckets(reviewAllData, "customer_review"),
    [reviewAllData],
  );

  return (
    <div className="w-full min-w-0">
      <PageMeta title="NPS Records" description="NPS Records" />
      {/* <IndigoPartnerHeader /> */}
      <PartnerTab propsData={{ isall: false }} rightSlot={<NpsViewSwitch />} />

      <div className="bg-white px-2 py-3 sm:px-3 sm:py-4 rounded-xl shadow-sm">
        <div className="flex flex-col gap-4">
          {/* ─── Toolbar: date, search, rating filters, CSV ─── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pb-4 border-b border-gray-100">
            <RangerPicker
              compact
              updateDate={[
                moment().subtract(2, "days").format("YYYY-MM-DD"),
                moment().format("YYYY-MM-DD"),
              ]}
              selectedRange={(range) => setDateRange(range)}
            />

            <div
              className="hidden md:block w-px h-9 bg-gray-200 shrink-0"
              aria-hidden
            />

            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                Filter by Rating:
              </span>
              {RATING_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  type={ratingFilter === f.value ? "primary" : "default"}
                  size="small"
                  onClick={() => handleRatingFilter(f.value)}
                  style={{
                    borderRadius: 20,
                    fontSize: 12,
                    ...(ratingFilter !== f.value && {
                      borderColor: "#d9d9d9",
                      color: "#555",
                    }),
                  }}
                >
                  {f.label} ({ratingCounts[f.value] ?? 0})
                </Button>
              ))}
            </div>

            <div className="inline-flex flex-nowrap items-center gap-2 shrink-0 ml-auto">
              <Input.Search
                placeholder="Search by Booking ID"
                allowClear
                size="middle"
                style={{ width: 220 }}
                onSearch={handleBookingIdSearch}
                onChange={(event) => {
                  if (!event.target.value.trim()) {
                    handleBookingIdSearch("");
                  }
                }}
              />
              <CsvDownload
                Headcolumns={csvColumns}
                filename={`${
                  USE_MERGED_NPS_API ? "nps_merged" : activeTable
                }_${moment().format("YYYY-MM-DD")}.csv`}
                loadCSVData={loadCSVData}
              />
              {!USE_MERGED_NPS_API && (
                <>
                  <Button
                    type={
                      activeTable === "customer_review" ? "primary" : "default"
                    }
                    size="small"
                    onClick={() => handleTableSwitch("customer_review")}
                    style={{ borderRadius: 20, fontSize: 12 }}
                  >
                    Customer Reviews
                  </Button>
                  <Button
                    type={
                      activeTable === "nps_chat_logs" ? "primary" : "default"
                    }
                    size="small"
                    onClick={() => handleTableSwitch("nps_chat_logs")}
                    style={{ borderRadius: 20, fontSize: 12 }}
                  >
                    NPS Button clicks
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ─── NPS Score + Analytics + financial summary ─── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <NpsScoreBadge
                counts={ratingCounts}
                npsScore={USE_MERGED_NPS_API ? mergedNpsScore : null}
              />
              <Button
                type={analyticsOpen ? "primary" : "default"}
                size="small"
                loading={!USE_MERGED_NPS_API && analyticsLoading}
                onClick={() => setAnalyticsOpen((v) => !v)}
                style={{
                  borderRadius: 20,
                  fontSize: 12,
                  ...(!analyticsOpen && {
                    borderColor: "#3b82f6",
                    color: "#3b82f6",
                  }),
                }}
              >
                {analyticsOpen ? "Hide Analytics" : "📊 Show Analytics"}
              </Button>
              {USE_MERGED_NPS_API && (
                <>
                  <NpsFinancialSummaryChip
                    label="Total Fare"
                    amount={financialTotals?.totalFare ?? 0}
                    count={financialTotals?.totalFareCount ?? 0}
                    loading={financialTotalsLoading}
                  />
                  <NpsFinancialSummaryChip
                    label="Dispute Amount"
                    amount={financialTotals?.disputeAmount ?? 0}
                    count={financialTotals?.disputeCount ?? 0}
                    loading={financialTotalsLoading}
                  />
                  <NpsFinancialSummaryChip
                    label="Cashgram Redeemed"
                    amount={financialTotals?.cashgramRedeemedDispute ?? 0}
                    count={financialTotals?.cashgramRedeemedCount ?? 0}
                    loading={financialTotalsLoading}
                  />
                  <NpsFinancialSummaryChip
                    label="Cashgram Active"
                    amount={financialTotals?.cashgramActiveDispute ?? 0}
                    count={financialTotals?.cashgramActiveCount ?? 0}
                    loading={financialTotalsLoading}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Analytics Panel ─── */}
        {analyticsOpen && (
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            {USE_MERGED_NPS_API ? (
              <MergedNpsAnalyticsPanel buckets={mergedDailyBuckets} />
            ) : analyticsLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                Loading analytics…
              </div>
            ) : (
              <NpsAnalyticsPanel
                npsLogBuckets={npsLogBuckets}
                reviewBuckets={reviewBuckets}
              />
            )}
          </div>
        )}
        
        {/* <LogsTable */}
         <DataTable
          title="NPS Records"
          size="small"
          tableClassName="nps-records-compact-table"
          columns={columns}
          dataSource={displayData}
          loading={loading || (isBookingSearchActive && searchLoading)}
          rowKey={(record) =>
            USE_MERGED_NPS_API
              ? getMergedNpsRowKey(record)
              : String(record.id)
          }
          scroll={{ x: "max-content" }}
          expandable={tableExpandable}
          pagination={{
            ...pagination,
            pageSize: pagination.pageSize,
            total: isBookingSearchActive ? displayData.length : totalRecords,
            showSizeChanger: true,
            showTotal: (total) =>
              isBookingSearchActive
                ? `Total ${total} matching records`
                : `Total ${total} records`,
          }}
          onChange={handleTableChange}
        />
      </div>

      <Modal
        open={isModalVisible}
        onCancel={handleCloseModal}
        onOk={handleUpdateSubmit}
        confirmLoading={submitting}
        okText="Update"
        destroyOnClose
      >
        <div className="mt-4 mb-2 space-y-4">
          <div>
            <label className="font-semibold text-gray-700 block mb-2">
              Remark Date &amp; Time:
            </label>
            <Input value={opsRemarkAtInput} readOnly />
          </div>
          <div>
            <label className="font-semibold text-gray-700 block mb-2">
              Ops Remark:
            </label>
            <TextArea
              rows={4}
              placeholder="Type your remark here…"
              value={remarkInput}
              onChange={(e) => setRemarkInput(e.target.value)}
            />
          </div>
        </div>
      </Modal>


      <Modal
        title="Remark Details"
        open={remarkModal.visible}
        onCancel={() => setRemarkModal({ visible: false, text: "" })}
        footer={null}
      >
        <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
          {remarkModal.text}
        </div>
      </Modal>
    </div>
  );
};

export default NpsRecords;
