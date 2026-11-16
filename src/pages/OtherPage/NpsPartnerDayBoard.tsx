import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { Button, Input, Modal, Spin, Tooltip, message } from "antd";
import {
  CaretUpOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { useSelector } from "react-redux";
import { shouldHideNpsPartnerDay } from "../../utils/partnerAccess";
import PageMeta from "../../components/common/PageMeta";
import { PartnerTab } from "../../components/common/PartnerTab";
import { RangerPicker } from "../../components/common/RangePicker";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_UPDATE,
  GETBOOKING_LOGS,
  GET_MERGED_NPS_RECORDS,
  SEND_NPS_WHATSAPP_API,
} from "../../config/customerCare/operationsApicall";
import { USE_MERGED_NPS_API, splitColumnTitleLines } from "../../config/npsConfig";
import {
  buildMergedNpsPayload,
  getMergedNpsRowKey,
  parseNpsMoneyValue,
} from "../../utils/npsMergedApi";

const NPS_RECORDS_PATH = "/dashboard/OtherPage/NPSRecord";
const NPS_DAY_BOARD_PATH = "/dashboard/OtherPage/NPSDayBoard";
const DAY_PAGE_LIMIT = 100;
const DAY_MAX_PAGES = 30;
const REVIEW_TABLE = "customer_review";

type RatingFilter = "ALL" | "0-6" | "7-8" | "9-10";
type ScoreBand = "issue" | "mixed" | "excellent" | "none";

type NpsDayRecord = {
  id?: number | string;
  bookingId?: string;
  cabPartner?: string;
  partnerName?: string;
  cityCode?: string;
  travelType?: string;
  journeyType?: string;
  tellusMore?: string;
  review?: string;
  tags?: string;
  pre_def_review?: string;
  button_payload?: string;
  rating?: number | string;
  npsTime?: string;
  reviewTime?: string;
  createdAt?: string;
  sync_datetime?: string;
  ops_remark?: string;
  opsRemarkAt?: string;
  opsRemarkTime?: string;
  npsWhatsappSent?: number | string;
  [key: string]: unknown;
};

type BookingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: Record<string, unknown> }
  | { status: "missing" }
  | { status: "error" };

const RATING_FILTERS: { label: string; value: RatingFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Rating (0-6)", value: "0-6" },
  { label: "Rating (7-8)", value: "7-8" },
  { label: "Rating (9-10)", value: "9-10" },
];

const BAND_STYLE: Record<
  ScoreBand,
  { background: string; border: string; accent: string; label: string }
> = {
  issue: {
    background: "#fdecec",
    border: "#f3b4b4",
    accent: "#e11d48",
    label: "Issue",
  },
  mixed: {
    background: "#fff6e8",
    border: "#f3d19a",
    accent: "#d97706",
    label: "Mixed",
  },
  excellent: {
    background: "#e9f8ee",
    border: "#b7e4c7",
    accent: "#15803d",
    label: "Excellent",
  },
  none: {
    background: "#f3f4f6",
    border: "#e5e7eb",
    accent: "#9ca3af",
    label: "No score",
  },
};

const BAND_RANK: Record<ScoreBand, number> = {
  issue: 0,
  mixed: 1,
  excellent: 2,
  none: 3,
};

const BOOKING_FIELDS: { label: string; keys: string[]; group: string; wide?: boolean }[] = [
  { label: "Booking ID", keys: ["bookingId"], group: "Trip" },
  { label: "Status", keys: ["status"], group: "Trip" },
  { label: "Travel Type", keys: ["travelType"], group: "Trip" },
  { label: "Trip Progress", keys: ["tripProgress", "tripPercentage"], group: "Trip" },
  { label: "Trip Start Time", keys: ["pickupTime"], group: "Trip" },
  { label: "Drop Off Time", keys: ["dropOffTime", "dropoffTime", "tripEndTime"], group: "Trip" },
  { label: "Created At", keys: ["bookingTime"], group: "Trip" },
  { label: "Cab Partner", keys: ["cabPartner"], group: "Trip" },
  { label: "Name", keys: ["userName", "customerName", "user_name", "name"], group: "Customer" },
  { label: "Mobile Number", keys: ["mobile"], group: "Customer" },
  { label: "Email Id", keys: ["email"], group: "Customer", wide: true },
  { label: "Seats", keys: ["seats"], group: "Customer" },
  { label: "OTP", keys: ["otp", "verificationOtp"], group: "Customer" },
  { label: "Device Type", keys: ["deviceType"], group: "Customer" },
  { label: "Source Address", keys: ["sourceAddress", "sourceName"], group: "Route" },
  { label: "Destination Address", keys: ["destinationAddress", "destinationName"], group: "Route" },
  { label: "Total Fare", keys: ["totalFare"], group: "Fare" },
  { label: "Total Paid Fare", keys: ["paidAmount", "paid"], group: "Fare" },
  { label: "Pay Type", keys: ["payType"], group: "Fare" },
  { label: "Coupon Code", keys: ["offerCode", "couponCode"], group: "Fare" },
  { label: "Vehicle Number", keys: ["vehicleNumber"], group: "Vehicle" },
  { label: "Vehicle Type", keys: ["vehicleType"], group: "Vehicle" },
  { label: "Fuel Type", keys: ["fuelType"], group: "Vehicle" },
];

const BOOKING_GROUPS = ["Trip", "Customer", "Route", "Fare", "Vehicle"];

export function NpsViewSwitch() {
  const { pathname } = useLocation();
  const loginUsername = useSelector(
    (state: { authStore?: { login_username?: string } }) =>
      state.authStore?.login_username,
  );
  const loginPartners = useSelector(
    (state: { authStore?: { login_partners?: string[] } }) =>
      state.authStore?.login_partners,
  );
  const items = [
    { to: NPS_RECORDS_PATH, label: "NPS Records" },
    ...(shouldHideNpsPartnerDay(loginUsername, loginPartners)
      ? []
      : [{ to: NPS_DAY_BOARD_PATH, label: "Partner Day" }]),
  ];
  if (!items.some((item) => pathname === item.to)) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              active
                ? "border-[#0f2c5b] bg-[#0f2c5b] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function textOf(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => textOf(item)).filter(Boolean);
  }
  const text = textOf(value);
  if (!text || text === "-") return [];
  return text
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getScoreBand(record: NpsDayRecord): ScoreBand {
  const payload = textOf(record.button_payload).toLowerCase();
  if (payload.includes("0-6") || payload.includes("need help")) return "issue";
  if (payload.includes("7-8") || /\bgood\b/.test(payload)) return "mixed";
  if (payload.includes("9-10") || payload.includes("excellent")) return "excellent";

  const numeric = Number.parseInt(textOf(record.rating ?? record.button_payload), 10);
  if (Number.isNaN(numeric)) return "none";
  if (numeric <= 6) return "issue";
  if (numeric <= 8) return "mixed";
  return "excellent";
}

function bandMatchesFilter(band: ScoreBand, filter: RatingFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "0-6") return band === "issue";
  if (filter === "7-8") return band === "mixed";
  return band === "excellent";
}

function partnerKey(record: NpsDayRecord, fallbackPartner: string): string {
  const name = textOf(record.cabPartner) || textOf(record.partnerName) || fallbackPartner;
  return name.toUpperCase();
}

function cityOf(record: NpsDayRecord): string {
  return textOf(record.cityCode) || "—";
}

function travelOf(record: NpsDayRecord): string {
  return textOf(record.travelType) || textOf(record.journeyType) || "—";
}

function clockOf(record: NpsDayRecord): string {
  const raw = record.npsTime ?? record.reviewTime ?? record.sync_datetime ?? record.createdAt;
  if (!raw) return "";
  const parsed = moment(raw);
  return parsed.isValid() ? parsed.format("HH:mm") : "";
}

function whatsappSentTimeOf(record: NpsDayRecord): string {
  const raw =
    record.NpswhatsappsentTime ??
    record.npsWhatsappSentTime ??
    record.npswhatsappsentTime;
  return textOf(raw);
}

function reviewIdOf(record: NpsDayRecord): string | number | undefined {
  const direct = [record.id, record.reviewId, record.review_id, record.customerReviewId];
  for (const value of direct) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    if (textOf(value) === "") continue;
    return value as string | number;
  }
  return undefined;
}

function bookingIdOf(record: NpsDayRecord): string {
  return textOf(record.bookingId ?? record.bookingid ?? record.BOOKINGID);
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || textOf(value) === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatDetailValue(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  const text = textOf(value);
  if (/\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = moment(text);
    if (parsed.isValid()) return parsed.format("DD MMM YYYY, HH:mm");
  }
  return text;
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

function npsColor(value: number | null): string {
  if (value === null) return "#64748b";
  if (value > 0) return "#15803d";
  if (value < 0) return "#dc2626";
  return "#b45309";
}

function npsCardStyle(nps: number | null) {
  if (nps === null) return BAND_STYLE.none;
  if (nps > 0) return BAND_STYLE.excellent;
  if (nps < 0) return BAND_STYLE.issue;
  return BAND_STYLE.mixed;
}

type TagCount = { label: string; count: number };

function tagCounts(records: NpsDayRecord[]): TagCount[] {
  const counts = new Map<string, TagCount>();
  records.forEach((record) => {
    const tags = splitTags(record.tags ?? record.pre_def_review);
    const seen = new Set<string>();
    tags.forEach((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const current = counts.get(key);
      if (current) current.count += 1;
      else counts.set(key, { label: tag, count: 1 });
    });
  });
  return [...counts.values()].sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label),
  );
}

function topTag(records: NpsDayRecord[]): TagCount | null {
  return tagCounts(records)[0] ?? null;
}

type PartnerLinkKind = "top" | "comment" | "remark";

function hasTellUsMore(record: NpsDayRecord): boolean {
  return Boolean(textOf(record.tellusMore) || textOf(record.review));
}

function hasOpsRemark(record: NpsDayRecord): boolean {
  return Boolean(textOf(record.ops_remark));
}

function hasTopTag(record: NpsDayRecord, label: string): boolean {
  const needle = label.toLowerCase();
  return splitTags(record.tags ?? record.pre_def_review).some(
    (tag) => tag.toLowerCase() === needle,
  );
}

function ridesForPartnerLink(
  rides: NpsDayRecord[],
  kind: PartnerLinkKind,
  topLabel: string | null,
): NpsDayRecord[] {
  if (kind === "top") {
    if (!topLabel) return [];
    return rides.filter((record) => hasTopTag(record, topLabel));
  }
  if (kind === "comment") return rides.filter(hasTellUsMore);
  return rides.filter(hasOpsRemark);
}

function commentCounts(records: NpsDayRecord[]): TagCount[] {
  const counts = new Map<string, TagCount>();
  records.forEach((record) => {
    const comment = textOf(record.tellusMore) || textOf(record.review);
    if (!comment) return;
    const key = comment.toLowerCase();
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { label: comment, count: 1 });
  });
  return [...counts.values()].sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label),
  );
}

type ScoreStats = {
  nps: number | null;
  happiness: number | null;
  excellent: number;
  mixed: number;
  issue: number;
  scored: number;
};

type CityCard = {
  city: string;
  rides: NpsDayRecord[];
  arrival: number;
  departure: number;
  otherTravel: TagCount[];
  tags: TagCount[];
  comments: TagCount[];
  stats: ScoreStats;
  totalFare: number;
  issueDispute: number;
};

function formatCardRupee(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function cityMoney(records: NpsDayRecord[]): { totalFare: number; issueDispute: number } {
  let totalFare = 0;
  let issueDispute = 0;
  records.forEach((record) => {
    totalFare += parseNpsMoneyValue(record.totalFare);
    if (getScoreBand(record) === "issue") {
      issueDispute += parseNpsMoneyValue(record.amount);
    }
  });
  return { totalFare, issueDispute };
}

function travelKind(record: NpsDayRecord): "arrival" | "departure" | "other" {
  const value = travelOf(record).toLowerCase();
  if (value.includes("arriv")) return "arrival";
  if (value.includes("depart")) return "departure";
  return "other";
}

function buildCityCards(rides: NpsDayRecord[]): CityCard[] {
  const groups = new Map<string, NpsDayRecord[]>();
  rides.forEach((record) => {
    const city = cityOf(record);
    const current = groups.get(city);
    if (current) current.push(record);
    else groups.set(city, [record]);
  });

  return [...groups.entries()]
    .map(([city, cityRides]) => {
      const sorted = [...cityRides].sort((left, right) =>
        clockOf(left).localeCompare(clockOf(right)),
      );
      let arrival = 0;
      let departure = 0;
      const other = new Map<string, TagCount>();
      sorted.forEach((record) => {
        const kind = travelKind(record);
        if (kind === "arrival") arrival += 1;
        else if (kind === "departure") departure += 1;
        else {
          const label = travelOf(record);
          const key = label.toLowerCase();
          const current = other.get(key);
          if (current) current.count += 1;
          else other.set(key, { label, count: 1 });
        }
      });
      const money = cityMoney(sorted);
      return {
        city,
        rides: sorted,
        arrival,
        departure,
        otherTravel: [...other.values()],
        tags: tagCounts(sorted),
        comments: commentCounts(sorted),
        stats: scoreStats(sorted),
        totalFare: money.totalFare,
        issueDispute: money.issueDispute,
      };
    })
    .sort((left, right) => left.city.localeCompare(right.city));
}

function scoreStats(records: NpsDayRecord[]): ScoreStats {
  let excellent = 0;
  let mixed = 0;
  let issue = 0;
  records.forEach((record) => {
    const band = getScoreBand(record);
    if (band === "excellent") excellent += 1;
    else if (band === "mixed") mixed += 1;
    else if (band === "issue") issue += 1;
  });
  const scored = excellent + mixed + issue;
  return {
    nps: scored > 0 ? Math.round(((excellent - issue) / scored) * 100) : null,
    happiness: scored > 0 ? Math.round((excellent / scored) * 100) : null,
    excellent,
    mixed,
    issue,
    scored,
  };
}

function partnerStats(records: NpsDayRecord[]) {
  const stats = scoreStats(records);
  return { nps: stats.nps, happiness: stats.happiness, top: topTag(records) };
}

function matchesBookingSearch(record: NpsDayRecord, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return bookingIdOf(record).toLowerCase().includes(normalized);
}

function bookingStatusTone(status: string): string {
  const text = status.toLowerCase();
  if (text.includes("complete")) return "bg-emerald-50 text-emerald-700";
  if (text.includes("cancel")) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

function BookingDetailsView({ booking }: { booking: Record<string, unknown> }) {
  const driver = formatDriver(booking);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {BOOKING_GROUPS.map((group) => {
        const fields = BOOKING_FIELDS.filter((field) => field.group === group);
        const fullWidth = group === "Route";
        return (
          <section
            key={group}
            className={`rounded-md border border-slate-200 bg-white p-3 ${fullWidth ? "lg:col-span-2" : ""}`}
          >
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {group}
            </h4>
            <dl className={`grid gap-x-5 gap-y-3 ${fullWidth ? "sm:grid-cols-2" : "grid-cols-2"}`}>
              {fields.map((field) => {
                const value = formatDetailValue(firstPresent(booking, field.keys));
                const empty = value === "-";
                return (
                  <div key={field.label} className={field.wide ? "col-span-2" : ""}>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {field.label}
                    </dt>
                    <dd
                      className={`mt-0.5 break-words text-[13px] leading-snug ${
                        empty ? "text-slate-300" : "font-medium text-slate-900"
                      }`}
                    >
                      {field.label === "Status" && !empty ? (
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold ${bookingStatusTone(value)}`}
                        >
                          {value}
                        </span>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
      <section className="rounded-md border border-slate-200 bg-white p-3 lg:col-span-2">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Driver
        </h4>
        {driver ? (
          <div className="space-y-1.5">
            {driver.split(" | ").map((line) => (
              <p key={line} className="text-[13px] font-medium leading-snug text-slate-900">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-slate-300">-</p>
        )}
      </section>
    </div>
  );
}

function plainField(record: NpsDayRecord, key: string): string {
  const value = textOf(record[key]);
  return value || "-";
}

function tableDateLines(value: unknown): { date: string; time: string } | null {
  const text = textOf(value);
  if (!text || !/\d{4}-\d{2}-\d{2}/.test(text)) return null;
  const parsed = moment(text);
  if (!parsed.isValid()) return null;
  return { date: parsed.format("YYYY-MM-DD"), time: parsed.format("HH:mm:ss") };
}

function StackedHeader({ lines }: { lines: string[] }) {
  return (
    <div className="text-[10px] font-semibold leading-tight text-slate-700">
      {lines.map((line) => (
        <div key={line} className="whitespace-nowrap">
          {line}
        </div>
      ))}
    </div>
  );
}

function RemarkPreview({ text }: { text: string }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [holdClosed, setHoldClosed] = useState(false);
  const open = pinned || (hover && !holdClosed);

  return (
    <Tooltip
      open={open}
      title={<span style={{ whiteSpace: "pre-wrap" }}>{text}</span>}
      overlayInnerStyle={{ maxWidth: 280 }}
    >
      <div
        className="max-w-[110px] cursor-pointer truncate text-[11px]"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setHoldClosed(false);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (pinned) {
            setPinned(false);
            setHoldClosed(true);
            return;
          }
          setPinned(true);
          setHoldClosed(false);
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
}

function RecordTableRow({
  record,
  selected,
  onSelect,
  bodyCell,
  sending,
  resolving,
  bookingOpen,
  onInsertRemark,
  onSendWhatsapp,
  onViewBooking,
}: {
  record: NpsDayRecord;
  selected: boolean;
  onSelect: (record: NpsDayRecord) => void;
  bodyCell: string;
  sending: boolean;
  resolving: boolean;
  bookingOpen: boolean;
  onInsertRemark: () => void;
  onSendWhatsapp: () => void;
  onViewBooking: () => void;
}) {
  const clickTime = tableDateLines(record.npsTime);
  const reviewTime = tableDateLines(record.reviewTime);
  const linkTime = tableDateLines(record.linkGeneratedAt);
  const statusTime = tableDateLines(record.statusUpdatedAt);
  const remarkTime = tableDateLines(record.opsRemarkAt ?? record.opsRemarkTime ?? record.ops_remark_at);
  const tags = plainField(record, "tags") !== "-" ? plainField(record, "tags") : plainField(record, "pre_def_review");
  const tellUsMore = plainField(record, "tellusMore") !== "-" ? plainField(record, "tellusMore") : plainField(record, "review");
  const remarkText = plainField(record, "ops_remark");

  return (
    <tr
      className={selected ? "cursor-pointer bg-[#e8f1ff]" : "cursor-pointer bg-white hover:bg-slate-50"}
      onClick={() => onSelect(record)}
    >
      <td className={bodyCell}>
        <div>{clickTime?.date ?? plainField(record, "npsTime")}</div>
        {clickTime && <div className="text-[10px] text-slate-500">{clickTime.time}</div>}
      </td>
      <td className={bodyCell}>
        <div className="font-medium">{plainField(record, "cabPartner")}</div>
        <div>{plainField(record, "cityCode")}</div>
        <div className="text-[10px] text-slate-500">{plainField(record, "travelType")}</div>
      </td>
      <td className={`${bodyCell} max-w-[120px] whitespace-pre-wrap`}>{plainField(record, "button_payload")}</td>
      <td className={`${bodyCell} max-w-[110px] whitespace-pre-wrap break-words`}>{tags}</td>
      <td className={bodyCell}>
        {tellUsMore === "-" ? "-" : <RemarkPreview text={tellUsMore} />}
      </td>
      <td className={bodyCell}>{plainField(record, "amount")}</td>
      <td className={bodyCell}>{plainField(record, "cashgramStatus")}</td>
      <td className={bodyCell}>{plainField(record, "totalFare")}</td>
      <td className={bodyCell}>
        {remarkText === "-" ? "-" : <RemarkPreview text={remarkText} />}
      </td>
      <td className={bodyCell}>
        <div>{remarkTime?.date ?? "-"}</div>
        {remarkTime && <div className="text-[10px] text-slate-500">{remarkTime.time}</div>}
      </td>
      <td className={bodyCell}>{plainField(record, "journeyType")}</td>
      <td className={bodyCell}>
        <div>{reviewTime?.date ?? "-"}</div>
        {reviewTime && <div className="text-[10px] text-slate-500">{reviewTime.time}</div>}
      </td>
      <td className={bodyCell}>
        <div>{plainField(record, "userName")}</div>
        <div className="whitespace-nowrap text-[10px] text-slate-500">{plainField(record, "mobile")}</div>
      </td>
      <td className={bodyCell}>{plainField(record, "rating")}</td>
      <td className={bodyCell}>{plainField(record, "paidAmount")}</td>
      <td className={bodyCell}>
        <div>{linkTime?.date ?? "-"}</div>
        {linkTime && <div className="text-[10px] text-slate-500">{linkTime.time}</div>}
      </td>
      <td className={bodyCell}>
        <div>{statusTime?.date ?? "-"}</div>
        {statusTime && <div className="text-[10px] text-slate-500">{statusTime.time}</div>}
      </td>
      <td className={bodyCell} onClick={(event) => event.stopPropagation()}>
        <Button
          type="link"
          size="small"
          style={{ fontSize: 10, padding: 0, height: "auto", color: "#1677ff" }}
          loading={resolving}
          onClick={onInsertRemark}
        >
          Insert Remark
        </Button>
      </td>
      <td className={bodyCell}>{plainField(record, "npsWhatsappSent")}</td>
      <td className={bodyCell}>
        {(() => {
          const sentTime = tableDateLines(whatsappSentTimeOf(record));
          if (!sentTime) return whatsappSentTimeOf(record) || "-";
          return (
            <>
              <div>{sentTime.date}</div>
              <div className="text-[10px] text-slate-500">{sentTime.time}</div>
            </>
          );
        })()}
      </td>
      <td className={bodyCell} onClick={(event) => event.stopPropagation()}>
        <Button
          type="primary"
          size="small"
          loading={sending}
          disabled={!bookingIdOf(record) || Number(record.npsWhatsappSent) === 1}
          onClick={onSendWhatsapp}
        >
          {Number(record.npsWhatsappSent) === 1 ? "Sent" : "Send"}
        </Button>
      </td>
      <td className={bodyCell} onClick={(event) => event.stopPropagation()}>
        <Button
          type="link"
          size="small"
          style={{ fontSize: 10, padding: 0, height: "auto", color: "#1677ff" }}
          disabled={!bookingIdOf(record)}
          onClick={onViewBooking}
        >
          {bookingOpen ? "Hide" : "View"}
        </Button>
      </td>
    </tr>
  );
}

function NpsCompactRecordTable({
  records,
  selectedKey,
  onSelect,
  sendingWhatsappKey,
  resolvingRemarkKey,
  onInsertRemark,
  onSendWhatsapp,
  onViewBooking,
  bookingOpenKey,
}: {
  records: NpsDayRecord[];
  selectedKey: string | null;
  onSelect: (record: NpsDayRecord) => void;
  sendingWhatsappKey: string | null;
  resolvingRemarkKey: string | null;
  onInsertRemark: (record: NpsDayRecord) => void;
  onSendWhatsapp: (record: NpsDayRecord) => void;
  onViewBooking: (record: NpsDayRecord) => void;
  bookingOpenKey: string | null;
}) {
  const headerCell = "border-b border-r border-[#f0f0f0] bg-[#fafafa] px-2 py-1.5 text-left align-bottom last:border-r-0";
  const bodyCell = "border-r border-[#f0f0f0] px-2 py-1.5 align-top text-[11px] leading-tight text-slate-800 last:border-r-0";

  return (
    <div className="overflow-x-auto rounded-md border border-[#f0f0f0]">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("NPS CLICK TIME")} /></th>
            <th className={headerCell}>
              <StackedHeader lines={["CAB PARTNER", "CITY CODE", "TRAVEL TYPE"]} />
            </th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("BUTTON PAYLOAD")} /></th>
            <th className={headerCell}><StackedHeader lines={["TAGS"]} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("TELL US MORE")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("DISPUTE AMT")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("CASHGRAM STATUS")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("TOTAL FARE")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("OPS REMARK")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("OPS REMARK TIME")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("JOURNEY TYPE")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("REVIEW SUBMITTED TIME")} /></th>
            <th className={headerCell}>
              <StackedHeader lines={["CUSTOMER NAME", "PHONE NO."]} />
            </th>
            <th className={headerCell}><StackedHeader lines={["RATING"]} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("PAID AMOUNT")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("LINK GENERATED AT")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("STATUS UPDATED AT")} /></th>
            <th className={headerCell}><StackedHeader lines={["REMARKS"]} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("NPS WHATSAPP SENT")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("NPS WHATSAPP SENT TIME")} /></th>
            <th className={headerCell}><StackedHeader lines={splitColumnTitleLines("NPS WHATSAPP")} /></th>
            <th className={headerCell}><StackedHeader lines={["BOOKING", "DETAILS"]} /></th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const rowKey = getMergedNpsRowKey(record);
            return (
              <RecordTableRow
                key={rowKey}
                record={record}
                selected={rowKey === selectedKey}
                onSelect={onSelect}
                bodyCell={bodyCell}
                sending={sendingWhatsappKey === rowKey}
                resolving={resolvingRemarkKey === rowKey}
                onInsertRemark={() => onInsertRemark(record)}
                onSendWhatsapp={() => onSendWhatsapp(record)}
                onViewBooking={() => onViewBooking(record)}
                bookingOpen={bookingOpenKey === rowKey}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function firstPresent(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && textOf(value) !== "") return value;
  }
  return undefined;
}

function extractBooking(response: unknown): Record<string, unknown> | null {
  if (!response) return null;
  if (Array.isArray(response)) {
    const first = response[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (typeof response !== "object") return null;
  const data = response as Record<string, unknown>;
  if (Array.isArray(data.bookings) && data.bookings[0] && typeof data.bookings[0] === "object") {
    return data.bookings[0] as Record<string, unknown>;
  }
  if (data.booking && typeof data.booking === "object") {
    return data.booking as Record<string, unknown>;
  }
  if (data.bookingId) return data;
  if (data.data) return extractBooking(data.data);
  return null;
}

function formatDriver(booking: Record<string, unknown>): string {
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
  if (Array.isArray(booking.driverDetails)) {
    booking.driverDetails.forEach((driver) => {
      if (!driver || typeof driver !== "object") return;
      const detail = driver as Record<string, unknown>;
      const segment = [
        detail.driverName || detail.name ? `Name: ${detail.driverName ?? detail.name}` : "",
        detail.driverMobile || detail.mobile
          ? `Mobile: ${detail.driverMobile ?? detail.mobile}`
          : "",
        detail.vehicleNumber || detail.registration_number
          ? `Vehicle: ${detail.vehicleNumber ?? detail.registration_number}`
          : "",
      ]
        .filter(Boolean)
        .join(", ");
      if (segment) parts.push(segment);
    });
  }
  return parts.join(" | ");
}

async function fetchMergedDay(
  partner: string,
  startDate: string,
  endDate: string,
): Promise<NpsDayRecord[]> {
  const records: NpsDayRecord[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (page <= DAY_MAX_PAGES && records.length < total) {
    const res = await GET_MERGED_NPS_RECORDS(
      partner,
      buildMergedNpsPayload({
        startDate,
        endDate,
        page,
        limit: DAY_PAGE_LIMIT,
        rating: "ALL",
      }),
    );
    if (res?.code !== 200 || !res?.data) {
      if (page === 1) throw new Error("Merged NPS day request failed");
      break;
    }
    const logs = Array.isArray(res.data.logs) ? (res.data.logs as NpsDayRecord[]) : [];
    records.push(...logs);
    total = Number(res.data.pagination?.totalRecords ?? records.length);
    if (logs.length < DAY_PAGE_LIMIT || records.length >= total) break;
    page += 1;
  }

  return records;
}

async function fetchLegacyTableDay(
  partner: string,
  startDate: string,
  endDate: string,
  table: "nps_chat_logs" | "customer_review",
): Promise<NpsDayRecord[]> {
  const dateField = table === "nps_chat_logs" ? "sync_datetime" : "createdAt";
  const records: NpsDayRecord[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (page <= DAY_MAX_PAGES && records.length < total) {
    const res = await CUSTOM_GENERIC_TABLE(partner, {
      table,
      page,
      limit: DAY_PAGE_LIMIT,
      filters: {
        [dateField]: {
          gte: `${startDate} 00:00:00`,
          lte: `${endDate} 23:59:59`,
        },
      },
    });
    if (res?.code !== 200 || !Array.isArray(res.data)) {
      if (page === 1) throw new Error("Legacy NPS day request failed");
      break;
    }
    const batch = res.data as NpsDayRecord[];
    records.push(...batch);
    const pagination = res?.pagination || res?.data?.pagination;
    total = Number(
      pagination?.totalCount ||
        pagination?.totalRecords ||
        res?.totalCount ||
        res?.totalRecords ||
        records.length,
    );
    if (batch.length < DAY_PAGE_LIMIT || records.length >= total) break;
    page += 1;
  }

  return records;
}

async function fetchDayRecords(
  partner: string,
  startDate: string,
  endDate: string,
): Promise<NpsDayRecord[]> {
  if (USE_MERGED_NPS_API) return fetchMergedDay(partner, startDate, endDate);
  const [chatLogs, reviews] = await Promise.all([
    fetchLegacyTableDay(partner, startDate, endDate, "nps_chat_logs"),
    fetchLegacyTableDay(partner, startDate, endDate, "customer_review"),
  ]);
  return [...chatLogs, ...reviews];
}

const NpsPartnerDayBoard = () => {
  const selectedPartner =
    useSelector((state: { operationStore?: { ReportSelectedPartner?: string } }) =>
      state?.operationStore?.ReportSelectedPartner,
    ) || "indigo";
  const loginUsername = useSelector(
    (state: { authStore?: { login_username?: string } }) =>
      state.authStore?.login_username,
  );
  const loginPartners = useSelector(
    (state: { authStore?: { login_partners?: string[] } }) =>
      state.authStore?.login_partners,
  );
  const hideNpsPartnerDay = shouldHideNpsPartnerDay(loginUsername, loginPartners);

  const [dateRange, setDateRange] = useState<[string, string]>([
    moment().format("YYYY-MM-DD"),
    moment().format("YYYY-MM-DD"),
  ]);
  const [records, setRecords] = useState<NpsDayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("ALL");
  const [bookingQuery, setBookingQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [remarkRecord, setRemarkRecord] = useState<NpsDayRecord | null>(null);
  const [remarkInput, setRemarkInput] = useState("");
  const [opsRemarkAtInput, setOpsRemarkAtInput] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);
  const [resolvingRemarkKey, setResolvingRemarkKey] = useState<string | null>(null);
  const [sendingWhatsappKey, setSendingWhatsappKey] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<BookingState>({ status: "idle" });
  const [bookingPanelOpen, setBookingPanelOpen] = useState(false);
  const [cityFocus, setCityFocus] = useState<{ partner: string; city: string } | null>(null);
  const [linkFocus, setLinkFocus] = useState<{
    partner: string;
    kind: PartnerLinkKind;
  } | null>(null);
  const requestGen = useRef(0);
  const detailKeyRef = useRef<string | null>(null);
  const bookingRequestRef = useRef(0);
  const bookingCacheRef = useRef<Record<string, BookingState>>({});

  const loadDay = useCallback(async () => {
    const generation = ++requestGen.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await fetchDayRecords(selectedPartner, dateRange[0], dateRange[1]);
      if (requestGen.current !== generation) return;
      setRecords(next);
    } catch (error) {
      console.error("Failed to load NPS partner day:", error);
      if (requestGen.current !== generation) return;
      setRecords([]);
      setLoadError("Could not load NPS records for this range.");
      message.error("Failed to load NPS records for this range.");
    } finally {
      if (requestGen.current === generation) setLoading(false);
    }
  }, [dateRange, selectedPartner]);

  useEffect(() => {
    if (hideNpsPartnerDay) return;
    setSelectedKey(null);
    setCityFocus(null);
    loadDay();
  }, [loadDay, hideNpsPartnerDay]);

  const searchedRecords = useMemo(
    () => records.filter((record) => matchesBookingSearch(record, bookingQuery)),
    [bookingQuery, records],
  );

  const ratingCounts = useMemo(() => {
    const counts: Record<RatingFilter, number> = {
      ALL: searchedRecords.length,
      "0-6": 0,
      "7-8": 0,
      "9-10": 0,
    };
    searchedRecords.forEach((record) => {
      const band = getScoreBand(record);
      if (band === "issue") counts["0-6"] += 1;
      else if (band === "mixed") counts["7-8"] += 1;
      else if (band === "excellent") counts["9-10"] += 1;
    });
    return counts;
  }, [searchedRecords]);

  const visibleRecords = useMemo(
    () =>
      searchedRecords.filter((record) =>
        bandMatchesFilter(getScoreBand(record), ratingFilter),
      ),
    [ratingFilter, searchedRecords],
  );

  const partnerRows = useMemo(() => {
    const dayGroups = new Map<string, NpsDayRecord[]>();
    searchedRecords.forEach((record) => {
      const key = partnerKey(record, selectedPartner);
      const current = dayGroups.get(key);
      if (current) current.push(record);
      else dayGroups.set(key, [record]);
    });

    const visibleGroups = new Map<string, NpsDayRecord[]>();
    visibleRecords.forEach((record) => {
      const key = partnerKey(record, selectedPartner);
      const current = visibleGroups.get(key);
      if (current) current.push(record);
      else visibleGroups.set(key, [record]);
    });

    return [...visibleGroups.entries()]
      .map(([name, rides]) => {
        const sorted = [...rides].sort((left, right) => {
          const cityCompare = cityOf(left).localeCompare(cityOf(right));
          if (cityCompare !== 0) return cityCompare;
          const bandCompare = BAND_RANK[getScoreBand(left)] - BAND_RANK[getScoreBand(right)];
          if (bandCompare !== 0) return bandCompare;
          return clockOf(left).localeCompare(clockOf(right));
        });
        const dayRides = dayGroups.get(name) ?? sorted;
        return {
          name,
          rides: sorted,
          cities: buildCityCards(sorted),
          total: dayRides.length,
          totalFare: cityMoney(dayRides).totalFare,
          stats: partnerStats(dayRides),
        };
      })
      .sort(
        (left, right) =>
          right.total - left.total || left.name.localeCompare(right.name),
      );
  }, [searchedRecords, selectedPartner, visibleRecords]);

  const openPartnerLink = (
    row: { name: string; rides: NpsDayRecord[]; stats: { top: TagCount | null } },
    kind: PartnerLinkKind,
  ) => {
    const rides = ridesForPartnerLink(row.rides, kind, row.stats.top?.label ?? null);
    if (rides.length === 0) return;
    setCityFocus(null);
    setLinkFocus({ partner: row.name, kind });
    openRecord(rides[0]);
  };

  const focusedCity = useMemo(() => {
    if (!cityFocus) return null;
    const row = partnerRows.find((item) => item.name === cityFocus.partner);
    return row?.cities.find((item) => item.city === cityFocus.city) ?? null;
  }, [cityFocus, partnerRows]);

  const linkModal = useMemo(() => {
    if (!linkFocus) return null;
    const row = partnerRows.find((item) => item.name === linkFocus.partner);
    if (!row) return null;
    const rides = ridesForPartnerLink(row.rides, linkFocus.kind, row.stats.top?.label ?? null);
    if (rides.length === 0) return null;
    let arrival = 0;
    let departure = 0;
    rides.forEach((record) => {
      const kind = travelKind(record);
      if (kind === "arrival") arrival += 1;
      else if (kind === "departure") departure += 1;
    });
    const label =
      linkFocus.kind === "top"
        ? `Top: ${row.stats.top?.label ?? ""}`
        : linkFocus.kind === "comment"
          ? "Tell us more"
          : "Ops remarks";
    return { partner: row.name, label, rides, arrival, departure };
  }, [linkFocus, partnerRows]);

  const selectedRecord = useMemo(
    () => records.find((record) => getMergedNpsRowKey(record) === selectedKey) ?? null,
    [records, selectedKey],
  );

  const openRecord = (record: NpsDayRecord, options?: { loadBooking?: boolean }) => {
    const key = getMergedNpsRowKey(record);
    const sameRecord = detailKeyRef.current === key;
    detailKeyRef.current = key;
    setSelectedKey(key);
    if (!sameRecord) {
      setBookingState({ status: "idle" });
      setBookingPanelOpen(false);
    }
    if (options?.loadBooking) {
      setBookingPanelOpen(true);
      void loadBookingDetails(record);
    }
  };

  const toggleBookingDetails = (record: NpsDayRecord) => {
    const key = getMergedNpsRowKey(record);
    if (detailKeyRef.current === key && bookingPanelOpen) {
      setBookingPanelOpen(false);
      return;
    }
    detailKeyRef.current = key;
    setSelectedKey(key);
    const cached = bookingCacheRef.current[key];
    if (cached && (cached.status === "loaded" || cached.status === "missing")) {
      setBookingState(cached);
      setBookingPanelOpen(true);
      return;
    }
    void loadBookingDetails(record);
  };

  const loadBookingDetails = async (record: NpsDayRecord) => {
    const key = getMergedNpsRowKey(record);
    const requestId = ++bookingRequestRef.current;
    detailKeyRef.current = key;
    const bookingId = bookingIdOf(record);
    if (!bookingId) {
      const missing: BookingState = { status: "missing" };
      bookingCacheRef.current[key] = missing;
      setBookingState(missing);
      setBookingPanelOpen(true);
      return;
    }

    setBookingState({ status: "loading" });
    setBookingPanelOpen(true);
    try {
      const partner = textOf(record.partnerName).toLowerCase() || selectedPartner;
      const response = await GETBOOKING_LOGS(partner, {
        bookingId,
        pageName: "detail",
        partnerResponse: true,
      });
      if (bookingRequestRef.current !== requestId) return;
      const booking = extractBooking(response);
      const next: BookingState = booking
        ? { status: "loaded", data: booking }
        : { status: "missing" };
      bookingCacheRef.current[key] = next;
      setBookingState(next);
    } catch (error) {
      console.error("Failed to load booking details:", error);
      if (bookingRequestRef.current !== requestId) return;
      setBookingState({ status: "error" });
    }
  };

  const closeRecord = () => {
    bookingRequestRef.current += 1;
    bookingCacheRef.current = {};
    detailKeyRef.current = null;
    setSelectedKey(null);
    setRemarkRecord(null);
    setRemarkInput("");
    setOpsRemarkAtInput("");
    setSavingRemark(false);
    setResolvingRemarkKey(null);
    setSendingWhatsappKey(null);
    setBookingState({ status: "idle" });
    setBookingPanelOpen(false);
    setCityFocus(null);
    setLinkFocus(null);
  };

  const openRemarkModal = (record: NpsDayRecord) => {
    setRemarkRecord({ ...record, id: reviewIdOf(record) });
    setRemarkInput("");
    setOpsRemarkAtInput(moment().format("YYYY-MM-DD HH:mm:ss"));
    if (reviewIdOf(record) !== undefined || !bookingIdOf(record)) return;
    void attachReviewId(record);
  };

  const attachReviewId = async (record: NpsDayRecord) => {
    const rowKey = getMergedNpsRowKey(record);
    setResolvingRemarkKey(rowKey);
    try {
      const response = await CUSTOM_GENERIC_TABLE(selectedPartner, {
        table: REVIEW_TABLE,
        page: 1,
        limit: 5,
        filters: { bookingId: bookingIdOf(record) },
      });
      const rows = Array.isArray(response?.data) ? (response.data as NpsDayRecord[]) : [];
      const match =
        rows.find((row) => bookingIdOf(row) === bookingIdOf(record)) ?? rows[0];
      const reviewId = match ? reviewIdOf(match) : undefined;
      if (reviewId === undefined) return;
      setRecords((current) =>
        current.map((item) =>
          getMergedNpsRowKey(item) === rowKey ? { ...item, id: reviewId } : item,
        ),
      );
      setRemarkRecord((current) =>
        current && bookingIdOf(current) === bookingIdOf(record)
          ? { ...current, id: reviewId }
          : current,
      );
    } catch (error) {
      console.error("Failed to resolve review id:", error);
    } finally {
      setResolvingRemarkKey(null);
    }
  };

  const closeRemarkModal = () => {
    setRemarkRecord(null);
    setRemarkInput("");
    setOpsRemarkAtInput("");
  };

  const saveRemark = async () => {
    if (!remarkRecord) return;
    const draft = remarkInput.trim();
    if (!remarkRecord.id) {
      message.warning("Remarks can only be added when a customer review exists.");
      return;
    }
    if (!draft) {
      message.warning("Please enter a remark before updating.");
      return;
    }

    const opsRemarkAt = moment().format("YYYY-MM-DD HH:mm:ss");
    setOpsRemarkAtInput(opsRemarkAt);
    setSavingRemark(true);
    try {
      await CUSTOM_GENERIC_UPDATE(selectedPartner, {
        table: REVIEW_TABLE,
        id: remarkRecord.id,
        data: {
          bookingId: remarkRecord.bookingId,
          review: remarkRecord.review ?? remarkRecord.tellusMore,
          rating: remarkRecord.rating,
          partnerName: remarkRecord.partnerName,
          pre_def_review: remarkRecord.pre_def_review ?? remarkRecord.tags,
          ops_remark: draft,
          opsRemarkAt,
        },
      });
      setRecords((current) =>
        current.map((item) =>
          item.id === remarkRecord.id
            ? { ...item, ops_remark: draft, opsRemarkAt, opsRemarkTime: opsRemarkAt }
            : item,
        ),
      );
      message.success("Remark updated successfully!");
      closeRemarkModal();
    } catch (error) {
      console.error("Remark update failed:", error);
      message.error("Failed to update remark. Please try again.");
    } finally {
      setSavingRemark(false);
    }
  };

  const sendWhatsapp = async (record: NpsDayRecord) => {
    const rowKey = getMergedNpsRowKey(record);
    if (!bookingIdOf(record)) {
      message.warning("Booking ID not available.");
      return;
    }
    setSendingWhatsappKey(rowKey);
    try {
      await SEND_NPS_WHATSAPP_API(selectedPartner, {
        bookingId: bookingIdOf(record),
      });
      const sentAt = moment().format("YYYY-MM-DD HH:mm:ss");
      setRecords((current) =>
        current.map((item) =>
          getMergedNpsRowKey(item) === rowKey
            ? { ...item, npsWhatsappSent: 1, NpswhatsappsentTime: sentAt }
            : item,
        ),
      );
      message.success("WhatsApp sent successfully");
    } catch (error) {
      console.error(error);
      message.error("Failed to send WhatsApp");
    } finally {
      setSendingWhatsappKey(null);
    }
  };

  const rangeStart = moment(dateRange[0], "YYYY-MM-DD");
  const rangeEnd = moment(dateRange[1], "YYYY-MM-DD");
  const dayLabel = rangeStart.isSame(rangeEnd, "day")
    ? rangeStart.format("ddd D MMM")
    : `${rangeStart.format("D MMM")} – ${rangeEnd.format("D MMM")}`;

  if (hideNpsPartnerDay) {
    return <Navigate to={NPS_RECORDS_PATH} replace />;
  }

  return (
    <div className="w-full min-w-0">
      <PageMeta title="NPS Partner Day" description="One-day cab partner NPS board" />
      <PartnerTab propsData={{ isall: false }} rightSlot={<NpsViewSwitch />} />

      <div className="rounded-xl bg-white px-3 py-4 shadow-sm sm:px-4">
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
          <h1 className="shrink-0 text-xl font-semibold text-[#0f2c5b]">Cab Partner Day View</h1>
          <RangerPicker
            compact
            updateDate={[
              moment().format("YYYY-MM-DD"),
              moment().format("YYYY-MM-DD"),
            ]}
            selectedRange={(range) => setDateRange(range)}
          />

          <div className="flex flex-wrap items-center gap-2">
            {RATING_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                type={ratingFilter === filter.value ? "primary" : "default"}
                size="small"
                onClick={() => setRatingFilter(filter.value)}
                style={{ borderRadius: 20, fontSize: 12 }}
              >
                {filter.label} ({ratingCounts[filter.value]})
              </Button>
            ))}
          </div>

          <Input.Search
            allowClear
            placeholder="Search by Booking ID"
            style={{ width: 220, marginLeft: "auto" }}
            onSearch={(value) => setBookingQuery(value.trim())}
            onChange={(event) => {
              if (!event.target.value.trim()) setBookingQuery("");
            }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : loadError ? (
          <div className="py-12 text-center">
            <p className="mb-3 text-sm text-red-600">{loadError}</p>
            <Button onClick={loadDay}>Retry</Button>
          </div>
        ) : partnerRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No NPS records for {dayLabel}.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 bg-[#0f2c5b] text-white lg:grid-cols-[200px_minmax(0,1fr)]">
              <div className="px-4 py-3 text-xs font-semibold tracking-wide">PARTNER</div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs font-semibold tracking-wide">
                <div>
                  {dayLabel.toUpperCase()}
                  <span className="ml-2 font-normal text-white/80">
                    {visibleRecords.length} rides
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-3 font-normal normal-case tracking-normal text-white/90">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#15803d]" /> City NPS +
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#d97706]" /> City NPS 0
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <i className="inline-block h-2.5 w-2.5 rounded-sm bg-[#e11d48]" /> City NPS −
                  </span>
                </div>
              </div>
            </div>

            {partnerRows.map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-1 border-t border-gray-200 lg:grid-cols-[200px_minmax(0,1fr)]"
              >
                <div className="border-gray-200 bg-white px-4 py-3 lg:border-r">
                  <div className="text-sm font-bold tracking-wide text-[#0f2c5b]">{row.name}</div>
                  <div
                    className="mt-1 text-sm font-semibold"
                    style={{ color: npsColor(row.stats.nps) }}
                  >
                    NPS {row.stats.nps === null ? "—" : formatSigned(row.stats.nps)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Happiness {row.stats.happiness === null ? "—" : `${row.stats.happiness}%`}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {row.rides.length === row.total
                      ? `${row.total} ${row.total === 1 ? "ride" : "rides"} · ${formatCardRupee(row.totalFare)}`
                      : `${row.rides.length} shown · ${row.total} in range · ${formatCardRupee(row.totalFare)}`}
                  </div>
                  {row.stats.top && (
                    <div className="mt-1 text-xs text-gray-700">
                      Top:{" "}
                      <button
                        type="button"
                        className="inline break-all text-left text-[#1677ff] hover:underline"
                        onClick={() => openPartnerLink(row, "top")}
                      >
                        {row.stats.top.label}
                      </button>{" "}
                      ({row.stats.top.count})
                    </div>
                  )}
                  <button
                    type="button"
                    className="mt-1 block text-left text-xs text-[#1677ff] hover:underline"
                    onClick={() => openPartnerLink(row, "comment")}
                  >
                    Tell us more ({row.rides.filter(hasTellUsMore).length})
                  </button>
                  <button
                    type="button"
                    className="mt-1 block text-left text-xs text-[#1677ff] hover:underline"
                    onClick={() => openPartnerLink(row, "remark")}
                  >
                    Ops remarks ({row.rides.filter(hasOpsRemark).length})
                  </button>
                </div>

                <div className="flex max-h-[520px] flex-wrap content-start gap-2 overflow-y-auto bg-[#f7f8fb] p-3">
                  {row.cities.map((city) => {
                    const style = npsCardStyle(city.stats.nps);
                    const npsLabel =
                      city.stats.nps === null ? "NPS —" : `NPS ${formatSigned(city.stats.nps)}`;
                    const bandLine = `9-10 (${city.stats.excellent}), 7-8 (${city.stats.mixed}), 0-6 (${city.stats.issue}) ${formatCardRupee(city.issueDispute)}`;
                    const tagLine = city.tags
                      .map((tag) => `${tag.label} (${tag.count})`)
                      .join(", ");
                    const commentCount = city.comments.reduce(
                      (total, comment) => total + comment.count,
                      0,
                    );
                    const travelLine = [
                      `arrival (${city.arrival})`,
                      `departure (${city.departure})`,
                      ...city.otherTravel.map((item) => `${item.label} (${item.count})`),
                    ].join(", ");
                    const rideLabel = `${city.rides.length} ${city.rides.length === 1 ? "ride" : "rides"} · ${formatCardRupee(city.totalFare)}`;
                    return (
                      <Tooltip
                        key={`${row.name}-${city.city}`}
                        title={[npsLabel, rideLabel, bandLine, tagLine || "No tags"].join(" · ")}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setLinkFocus(null);
                            setCityFocus({ partner: row.name, city: city.city });
                            if (city.rides[0]) openRecord(city.rides[0]);
                          }}
                          className="w-[calc(25%-6px)] min-w-0 shrink-0 rounded-md border px-2 py-2 text-left shadow-sm transition hover:shadow-md max-lg:w-[calc(50%-4px)]"
                          style={{
                            background: style.background,
                            borderColor: style.border,
                            borderLeftWidth: 4,
                            borderLeftColor: style.accent,
                          }}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1.5">
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold leading-tight text-slate-900">
                                {city.city}
                              </div>
                              <div className="mt-1 truncate text-[11px] leading-snug text-slate-700">
                                {travelLine}
                              </div>
                              <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-800">
                                {tagLine || "No tags"}
                              </div>
                              {commentCount > 0 ? (
                                <div className="mt-1 text-[11px] leading-snug text-slate-600">
                                  Tell us more ({commentCount})
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <div
                                className="text-[13px] font-semibold leading-tight"
                                style={{ color: npsColor(city.stats.nps) }}
                              >
                                {npsLabel}
                              </div>
                              <div className="mt-1 whitespace-nowrap text-[11px] leading-snug text-slate-600">
                                {rideLabel}
                              </div>
                              <div className="mt-1 text-[11px] leading-tight text-slate-800">
                                <div>9-10 ({city.stats.excellent})</div>
                                <div>7-8 ({city.stats.mixed})</div>
                                <div className="whitespace-nowrap">
                                  0-6 ({city.stats.issue}) · {formatCardRupee(city.issueDispute)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(linkModal || (focusedCity && cityFocus))}
        onCancel={closeRecord}
        footer={null}
        width="100vw"
        style={{ top: 0, maxWidth: "100vw", margin: 0, paddingBottom: 0 }}
        styles={{
          wrapper: { padding: 0 },
          content: {
            height: "100vh",
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
          },
          body: { flex: 1, minHeight: 0, overflow: "auto" },
        }}
        destroyOnClose
        title={
          linkModal
            ? `${linkModal.partner} · ${linkModal.label} · ${linkModal.rides.length} ${
                linkModal.rides.length === 1 ? "ride" : "rides"
              }`
            : focusedCity && cityFocus
              ? `${cityFocus.partner} · ${focusedCity.city} · ${focusedCity.rides.length} ${
                  focusedCity.rides.length === 1 ? "ride" : "rides"
                }`
              : "City rides"
        }
      >
        {(linkModal || focusedCity) && selectedRecord && (
          <div className="space-y-3 pr-1">
            {(() => {
              const modalRides = linkModal?.rides ?? focusedCity?.rides ?? [];
              const placeLabel = linkModal?.label ?? focusedCity?.city ?? "";
              const travelLine = linkModal
                ? `arrival (${linkModal.arrival}), departure (${linkModal.departure})`
                : [
                    `arrival (${focusedCity?.arrival ?? 0})`,
                    `departure (${focusedCity?.departure ?? 0})`,
                    ...(focusedCity?.otherTravel.map((item) => `${item.label} (${item.count})`) ??
                      []),
                  ].join(", ");
              return (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <EnvironmentOutlined />
                      {placeLabel}
                    </span>
                    <span>{travelLine}</span>
                  </div>

                  <NpsCompactRecordTable
                    records={modalRides}
                    selectedKey={getMergedNpsRowKey(selectedRecord)}
                    onSelect={openRecord}
                    sendingWhatsappKey={sendingWhatsappKey}
                    resolvingRemarkKey={resolvingRemarkKey}
                    onInsertRemark={openRemarkModal}
                    onSendWhatsapp={sendWhatsapp}
                    onViewBooking={toggleBookingDetails}
                    bookingOpenKey={bookingPanelOpen ? selectedKey : null}
                  />

                  {bookingPanelOpen && (
                  <section className="rounded-lg border border-slate-200">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                      onClick={() => {
                        if (bookingState.status === "loading") return;
                        setBookingPanelOpen(false);
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FileTextOutlined className="text-[#1d4ed8]" />
                        <span className="text-sm font-semibold text-[#1d4ed8]">
                          Booking details
                        </span>
                        <span className="text-sm font-normal text-slate-500">
                          {bookingIdOf(selectedRecord)
                            ? `· ${bookingIdOf(selectedRecord)} `
                            : ""}
                          (click to hide)
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2 text-slate-400">
                        {bookingState.status === "loading" && <Spin size="small" />}
                        <CaretUpOutlined />
                      </span>
                    </button>
                    {bookingState.status === "missing" && (
                      <p className="px-3 pb-3 text-sm text-slate-500">
                        No booking details found for this ID.
                      </p>
                    )}
                    {bookingState.status === "error" && (
                      <p className="px-3 pb-3 text-sm text-red-500">
                        Failed to load booking details.
                      </p>
                    )}
                    {bookingState.status === "loaded" && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                        <BookingDetailsView booking={bookingState.data} />
                      </div>
                    )}
                  </section>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(remarkRecord)}
        onCancel={closeRemarkModal}
        onOk={saveRemark}
        confirmLoading={savingRemark}
        okText="Update"
        zIndex={2000}
        destroyOnClose
      >
        <div className="mb-2 mt-4 space-y-4">
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              Remark Date &amp; Time:
            </label>
            <Input value={opsRemarkAtInput} readOnly />
          </div>
          <div>
            <label className="mb-2 block font-semibold text-gray-700">Ops Remark:</label>
            <Input.TextArea
              rows={4}
              placeholder="Type your remark here…"
              value={remarkInput}
              onChange={(event) => setRemarkInput(event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NpsPartnerDayBoard;
