import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dropdown, Modal, Spin, message } from "antd";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiCornerUpLeft,
  FiDownload,
  FiEdit2,
  FiFilter,
  FiMail,
  FiMoreHorizontal,
  FiPaperclip,
  FiRefreshCw,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { HiOutlineSparkles } from "react-icons/hi2";
import { MdHourglassTop } from "react-icons/md";
import { Booking } from "../../../config/customerCare/interfaceTypes";
import {
  EMAIL_COMPLAINT_REFRESH_MS,
  draftCustomerReply,
  emailComplaintError,
  getEmailComplaintTrail,
  listEmailComplaints,
  sendCustomerResolution,
  sendPartnerEscalation,
  updateEmailComplaintCase,
  updateEmailComplaintMatch,
  type EmailComplaintThread,
  type EmailComplaintTrailMessage,
} from "../../../config/customerCare/emailComplaintApi";
import {
  emailClassFilterKey,
  emailClassFilterLabel,
  emailClassGroups,
  matchesEmailClassification,
  parseEmailClassFilter,
  parseEmailClassification,
  type EmailClassFilter,
} from "../../../utils/emailComplaintCategories";
import {
  buildPartnerDraft,
  emailPreview,
  extractBookingId,
  inboundEmailBody,
  isNpsNoReplyEmail,
  listPartnerContacts,
  parseEmailList,
  partnerContactByKey,
  resolvePartnerForComplaint,
  type PartnerContact,
} from "../../../utils/emailComplaintLookup";
import {
  EmailClassificationFields,
  EmailClassificationSelect,
} from "./EmailClassificationFields";

const PARTNER_SENT_KEY = "emailComplaintPartnerSent";
const CUSTOMER_SENT_KEY = "emailComplaintCustomerSent";
const STARS_KEY = "emailComplaintStars";
const NOTES_KEY = "emailComplaintNotes";
const INBOX_ADDRESS = "support@mojoboxx.com";
const BLACKLISTED_SENDERS = [
  "mailer-daemon@googlemail.com",
  "ridewithus@plushmiles.com",
  "no-reply@bookairportcab.com",
  "noreply@bookairportcab.com",
];
const AVATAR_COLORS = [
  { bg: "#dbeafe", color: "#2563eb" },
  { bg: "#dcfce7", color: "#16a34a" },
  { bg: "#ede9fe", color: "#7c3aed" },
  { bg: "#ffedd5", color: "#ea580c" },
  { bg: "#fce7f3", color: "#db2777" },
  { bg: "#ccfbf1", color: "#0f766e" },
];
const PAGE_SIZES = [10, 20, 50];
const CLASS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All classifications" },
  { key: "unclassified", label: "Not classified" },
  { key: "query", label: "All queries" },
  { key: "complaint", label: "All complaints" },
  ...emailClassGroups().map((group) => ({
    key: emailClassFilterKey({ kind: group.kind, category: group.category }),
    label: group.label,
  })),
];

type BookingFilter = "all" | "matched" | "unmatched" | "blacklisted";
type CaseStatus = "pending" | "working" | "resolved";
type StatusTab = "all" | "pending" | "working" | "resolved";
type ComposerTab = "reply" | "partner" | "note";

type ComplaintRow = Booking & {
  _rowKey: string;
  emailComplaint: EmailComplaintThread;
  emailBody: string;
  emailPreviewText: string;
};

type Props = {
  active: boolean;
  partner: string;
  fetchPartners: string[];
  onViewDetails: (record: Booking) => void;
  onShowJSON: (record: Booking) => void;
  onUpdate: (record: Booking) => void;
  onCreateLog?: (record: Booking) => void;
  onInboxCount?: (count: number) => void;
};

function isBlacklistedSender(email?: string | null) {
  return BLACKLISTED_SENDERS.includes(String(email || "").trim().toLowerCase());
}

function isHiddenThread(thread?: EmailComplaintThread | null) {
  return isBlacklistedSender(thread?.customerEmail) || isNpsNoReplyEmail(thread);
}

function readSent(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    return new Set<number>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<number>();
  }
}

function rememberSent(key: string, threadId: number) {
  const sent = readSent(key);
  sent.add(threadId);
  sessionStorage.setItem(key, JSON.stringify([...sent]));
}

function readStars() {
  try {
    const raw = localStorage.getItem(STARS_KEY);
    return new Set<number>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<number>();
  }
}

function readNotes(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function withLocalReplies(thread: EmailComplaintThread): EmailComplaintThread {
  return {
    ...thread,
    customerReplied: Boolean(thread.customerReplied) || readSent(CUSTOMER_SENT_KEY).has(thread.id),
    partnerEscalated: Boolean(thread.partnerEscalated) || readSent(PARTNER_SENT_KEY).has(thread.id),
  };
}

function caseStatusOf(thread?: EmailComplaintThread | null): CaseStatus {
  if (thread?.caseStatus === "working" || thread?.caseStatus === "resolved") return thread.caseStatus;
  return "pending";
}

function complaintStatus(thread?: EmailComplaintThread | null) {
  const status = caseStatusOf(thread);
  const label = status === "working" ? "Working" : status === "resolved" ? "Resolved" : "Pending";
  const parts = [label];
  if (thread?.partnerEscalated) parts.push("Partner escalated");
  return parts.join(" | ");
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function partnerLabel(contact: PartnerContact, fallback?: string | null) {
  if (contact.name && contact.name !== "Unknown partner") return contact.name;
  return String(fallback || "");
}

function directoryPartner(contact: PartnerContact) {
  return listPartnerContacts().some((item) => item.key === contact.key);
}

function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

function clockLabel(value?: string | null, withDate = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const formatted = (
    withDate
      ? date.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : date.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
  ).replace(/\b(am|pm)\b/gi, (part) => part.toUpperCase());
  return formatted;
}

function formatListTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  if (day === today) return clockLabel(value);
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
  });
}

function formatTravel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function bookingStatusLabel(status: unknown) {
  if (status == null || status === "") return "—";
  if (typeof status === "string" || typeof status === "number") {
    return String(status).replace(/_/g, " ");
  }
  return "—";
}

function statusTone(status: unknown) {
  const value = bookingStatusLabel(status).toUpperCase();
  if (value.includes("CANCEL") || value.includes("FAIL")) return "bg-rose-50 text-rose-600";
  if (value.includes("PEND")) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-600";
}

function avatarColor(seed?: string | null) {
  const text = seed || "?";
  const code = text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function istDayKey(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function lastIstDays(count: number) {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(istDayKey(new Date(Date.now() - offset * 86400000).toISOString()) || "");
  }
  return days;
}

function barsFor(list: ComplaintRow[], pendingOnly: boolean) {
  const days = lastIstDays(8);
  const counts = new Map(days.map((day) => [day, 0]));
  list.forEach((row) => {
    if (pendingOnly && caseStatusOf(row.emailComplaint) !== "pending") return;
    const key = istDayKey(row.emailComplaint?.receivedAt);
    if (key && counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return days.map((day) => counts.get(day) || 0);
}

function threadsToRows(threads: EmailComplaintThread[], rowPrefix = "email") {
  const nextRows: ComplaintRow[] = [];
  for (const listedThread of threads) {
    const thread = withLocalReplies(listedThread);
    const body = inboundEmailBody(thread);
    const bookings = Array.isArray(thread.bookings) ? thread.bookings : [];
    if (!bookings.length) {
      nextRows.push(blankRow(thread, body, rowPrefix));
      continue;
    }
    bookings.forEach((booking) => {
      const record = booking as Booking;
      nextRows.push({
        ...record,
        _rowKey: `${rowPrefix}-${thread.id}-${record.bookingId || "row"}`,
        emailComplaint: thread,
        emailBody: body,
        emailPreviewText: emailPreview(body) || thread.emailPreview || thread.subject || "",
      });
    });
  }
  return nextRows;
}

function blankRow(thread: EmailComplaintThread, body: string, rowPrefix = "email"): ComplaintRow {
  return {
    _rowKey: `${rowPrefix}-${thread.id}-none`,
    bookingId: String(thread.bookingId || ""),
    mobile: thread.customerMobile || "",
    emailComplaint: thread,
    emailBody: body,
    emailPreviewText: emailPreview(body) || thread.subject || "",
  } as ComplaintRow;
}

function uniqueThreads(list: ComplaintRow[]) {
  const map = new Map<number, ComplaintRow>();
  list.forEach((row) => {
    const id = row.emailComplaint?.id;
    if (id == null) return;
    const existing = map.get(id);
    if (!existing || (!existing.bookingId && row.bookingId)) map.set(id, row);
  });
  return [...map.values()];
}

function threadBookings(thread?: EmailComplaintThread | null) {
  return (Array.isArray(thread?.bookings) ? thread.bookings : []) as Booking[];
}

function withinRange(row: ComplaintRow, days: number) {
  if (!days) return true;
  const time = new Date(row.emailComplaint?.receivedAt || "").getTime();
  if (Number.isNaN(time)) return false;
  return time >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-12 items-end gap-[5px]" aria-hidden>
      {values.map((value, index) => (
        <span
          key={`${color}-${index}`}
          className="w-[7px] rounded-sm"
          style={{
            height: `${Math.max(16, Math.round((value / max) * 100))}%`,
            background: color,
            opacity: 0.35 + (index / Math.max(values.length - 1, 1)) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: CaseStatus }) {
  const tone =
    status === "resolved"
      ? "bg-emerald-50 text-emerald-600"
      : status === "working"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-500";
  const label = status === "resolved" ? "Resolved" : status === "working" ? "Working" : "Pending";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
  );
}

function Avatar({ email, size = 36 }: { email?: string | null; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: avatarColor(email).bg,
        color: avatarColor(email).color,
        fontSize: size > 32 ? 14 : 12,
      }}
    >
      {(email || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[7px] text-[13px]">
      <span className="text-gray-400">{label}</span>
      <span className="min-w-0 truncate text-right text-gray-800">{children}</span>
    </div>
  );
}

export default function EmailComplaintTab({
  active,
  onViewDetails,
  onShowJSON,
  onUpdate,
  onCreateLog,
  onInboxCount,
}: Props) {
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [blacklistedRows, setBlacklistedRows] = useState<ComplaintRow[]>([]);
  const [blacklistedTotal, setBlacklistedTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [serverPending, setServerPending] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [openThread, setOpenThread] = useState<EmailComplaintThread | null>(null);
  const [openBody, setOpenBody] = useState("");
  const [mailTrail, setMailTrail] = useState<EmailComplaintTrailMessage[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [partnerDraft, setPartnerDraft] = useState("");
  const [customerDraft, setCustomerDraft] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [replyCc, setReplyCc] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerKey, setPartnerKey] = useState("");
  const [partnerTo, setPartnerTo] = useState("");
  const [partnerCcText, setPartnerCcText] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [matchMobile, setMatchMobile] = useState("");
  const [matching, setMatching] = useState(false);
  const [sending, setSending] = useState<"partner" | "customer" | null>(null);
  const [pendingSend, setPendingSend] = useState<"partner" | "customer" | null>(null);
  const [sendError, setSendError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [partnerSent, setPartnerSent] = useState<Set<number>>(() => readSent(PARTNER_SENT_KEY));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [rangeDays, setRangeDays] = useState(7);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [classFilter, setClassFilter] = useState<EmailClassFilter>({ kind: "all", category: "" });
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [composerTab, setComposerTab] = useState<ComposerTab>("reply");
  const [noteDraft, setNoteDraft] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>(() => readNotes());
  const [starred, setStarred] = useState<Set<number>>(() => readStars());
  const [bookingIndex, setBookingIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [geminiDraft, setGeminiDraft] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const draftSeq = useRef(0);
  const loadSeq = useRef(0);
  const userLoadSeq = useRef(0);
  const userLoadInFlight = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (silent && userLoadInFlight.current) return;
    const seq = ++loadSeq.current;
    if (!silent) {
      userLoadSeq.current = seq;
      userLoadInFlight.current = true;
      setLoading(true);
      setLoadError("");
    }
    try {
      const listed = await listEmailComplaints({
        page,
        limit: pageSize,
        search: search || undefined,
      });
      if (loadSeq.current !== seq) return;
      const incoming = listed?.threads || [];
      const flagged = listed?.blacklisted || [];
      const hiddenIds = new Set(flagged.map((thread) => thread.id));
      const seen = new Set<number>();
      const visible: EmailComplaintThread[] = [];
      const hidden: EmailComplaintThread[] = [];
      for (const thread of [...flagged, ...incoming]) {
        if (seen.has(thread.id)) continue;
        seen.add(thread.id);
        if (hiddenIds.has(thread.id) || isHiddenThread(thread)) {
          hidden.push(thread);
        } else {
          visible.push(thread);
        }
      }
      const inboxTotal = listed?.total || 0;
      setTotal(inboxTotal);
      setServerPending(
        typeof listed?.pendingLast7Days === "number" ? listed.pendingLast7Days : null,
      );
      setBlacklistedTotal(listed?.blacklistedTotal ?? hidden.length);
      setRows(threadsToRows(visible));
      setBlacklistedRows(threadsToRows(hidden, "blacklisted"));
    } catch (error) {
      if (loadSeq.current !== seq || silent) return;
      const text = emailComplaintError(error);
      setLoadError(text);
      message.error(text);
      setRows([]);
      setBlacklistedRows([]);
      setBlacklistedTotal(0);
    } finally {
      if (!silent && userLoadSeq.current === seq) {
        userLoadInFlight.current = false;
        setLoading(false);
      }
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    if (!active) return;
    load();
  }, [active, load]);

  useEffect(() => {
    if (!active) return;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void load({ silent: true });
    };
    const timer = window.setInterval(refresh, EMAIL_COMPLAINT_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, load]);

  const loadSuggestion = useCallback(async (row: ComplaintRow) => {
    const requestId = draftSeq.current + 1;
    draftSeq.current = requestId;
    setSuggestionLoading(true);
    setSuggestionError("");
    setGeminiDraft("");
    const thread = row.emailComplaint;
    try {
      const result = await draftCustomerReply({
        subject: thread.subject,
        bodyText: row.emailBody,
        customerName: thread.customerName || row.userName || null,
        customerEmail: thread.customerEmail || row.email || null,
        customerMobile: thread.customerMobile || row.mobile || null,
        bookingId: row.bookingId || thread.bookingId || null,
        booking: row.bookingId
          ? {
              bookingId: row.bookingId,
              status: row.status,
              userName: row.userName,
              mobile: row.mobile,
              email: row.email,
              pickupTime: row.pickupTime,
              sourceName: row.sourceName,
              destinationName: row.destinationName,
              cabPartner: row.cabPartner,
              driverName: row.driverName,
              driverMobile: row.driverMobile,
              vehicleNumber: row.vehicleNumber,
              totalFare: row.totalFare,
              paid: row.paid,
              remaining: row.remaining,
              cancellationReason: row.cancellationReason,
            }
          : null,
      });
      if (draftSeq.current !== requestId) return;
      setGeminiDraft(result?.draftReply || "");
    } catch (error) {
      if (draftSeq.current !== requestId) return;
      setSuggestionError(emailComplaintError(error));
    } finally {
      if (draftSeq.current === requestId) setSuggestionLoading(false);
    }
  }, []);

  const applyPartner = useCallback(
    (
      contact: PartnerContact,
      thread: EmailComplaintThread,
      body: string,
      ids: string[],
      customerName?: string,
      customerMobile?: string,
    ) => {
      const named = contact.name && contact.name !== "Unknown partner";
      setPartnerKey(directoryPartner(contact) ? contact.key : "");
      setPartnerName(named ? contact.name : "");
      setPartnerTo(contact.email || "");
      setPartnerCcText((contact.cc || []).join(", "));
      setPartnerPhone(contact.phone || "");
      setPartnerDraft(
        buildPartnerDraft({
          subject: thread.subject,
          bodyText: body,
          partnerName: named ? contact.name : "",
          bookingIds: ids,
          customerName,
          customerMobile,
        }),
      );
    },
    [],
  );

  const openEmail = useCallback((row: ComplaintRow) => {
    const thread = row.emailComplaint;
    const ids = [...rows, ...blacklistedRows]
      .filter((item) => item.emailComplaint?.id === thread.id && item.bookingId)
      .map((item) => String(item.bookingId));
    const fromBody = extractBookingId(`${thread.subject || ""}\n${row.emailBody || ""}`);
    const resolvedBookingId = String(row.bookingId || thread.bookingId || fromBody || "");
    const bookingIds = ids.length ? ids : resolvedBookingId ? [resolvedBookingId] : [];
    const contact = resolvePartnerForComplaint(
      row.cabPartner || thread.cabPartner,
      `${thread.subject || ""}\n${row.emailBody || ""}`,
    );
    setSelectedKey(row._rowKey);
    setOpenThread(thread);
    setOpenBody(row.emailBody);
    setMailTrail(
      Array.isArray(thread.messages) && thread.messages.length
        ? thread.messages
        : [{ direction: "inbound", bodyText: row.emailBody, at: thread.receivedAt, fromEmail: thread.customerEmail }],
    );
    setTrailLoading(true);
    setReplyTo(thread.customerEmail || "");
    setReplyCc("");
    setBookingId(resolvedBookingId);
    setMatchMobile(String(thread.customerMobile || row.mobile || "").replace(/\D/g, "").slice(-10));
    setBookingIndex(0);
    setComposerTab("reply");
    setCustomerDraft(thread.draftReply || "");
    setGeminiDraft("");
    setSuggestionError("");
    setSuggestionLoading(false);
    draftSeq.current += 1;
    setNoteDraft(readNotes()[String(thread.id)] || "");
    applyPartner(
      contact,
      thread,
      row.emailBody,
      bookingIds,
      thread.customerName || row.userName,
      thread.customerMobile || row.mobile,
    );
    void getEmailComplaintTrail(thread.id)
      .then((trail) => {
        if (!trail?.messages?.length) return;
        setMailTrail(trail.messages);
        const latestInbound = [...trail.messages]
          .reverse()
          .find((item) => item.direction === "inbound");
        if (latestInbound?.bodyText) setOpenBody(latestInbound.bodyText);
        if (trail.thread) {
          setOpenThread((current) =>
            current && current.id === thread.id
              ? {
                  ...current,
                  ...trail.thread,
                  messages: trail.messages,
                  customerReplied: Boolean(trail.thread.customerReplied) || current.customerReplied,
                  partnerEscalated: Boolean(trail.thread.partnerEscalated) || current.partnerEscalated,
                }
              : current,
          );
        }
      })
      .catch(() => {
        /* keep the single-message fallback already set */
      })
      .finally(() => setTrailLoading(false));
  }, [applyPartner, blacklistedRows, rows]);

  const inboxThreads = useMemo(() => uniqueThreads(rows), [rows]);
  const hiddenThreads = useMemo(() => uniqueThreads(blacklistedRows), [blacklistedRows]);
  const sourceThreads = bookingFilter === "blacklisted" ? hiddenThreads : inboxThreads;
  const visibleRows = useMemo(() => {
    const ranged = sourceThreads.filter((row) => withinRange(row, rangeDays));
    const byStatus = ranged.filter((row) => {
      const status = caseStatusOf(row.emailComplaint);
      if (statusTab === "pending") return status === "pending";
      if (statusTab === "working") return status === "working";
      if (statusTab === "resolved") return status === "resolved";
      return true;
    });
    const byBooking = byStatus.filter((row) => {
      if (bookingFilter === "matched") return Boolean(row.bookingId);
      if (bookingFilter === "unmatched") return !row.bookingId;
      return true;
    });
    const byClass = byBooking.filter((row) =>
      matchesEmailClassification(row.emailComplaint?.complaintTag, classFilter),
    );
    return sortDir === "asc" ? [...byClass].reverse() : byClass;
  }, [bookingFilter, classFilter, rangeDays, sortDir, sourceThreads, statusTab]);

  useEffect(() => {
    if (!visibleRows.length) {
      if (selectedKey) {
        setSelectedKey(null);
        setOpenThread(null);
      }
      return;
    }
    if (!visibleRows.some((row) => row._rowKey === selectedKey)) {
      openEmail(visibleRows[0]);
    }
  }, [openEmail, selectedKey, visibleRows]);

  const selectedRow = visibleRows.find((row) => row._rowKey === selectedKey) || null;
  const bookings = threadBookings(openThread);
  const activeBooking =
    (bookings[bookingIndex] as Booking | undefined) ||
    (selectedRow?.bookingId ? selectedRow : null);
  const openCaseStatus = caseStatusOf(openThread);
  const customerAlreadySent = Boolean(
    openThread?.customerReplied || openThread?.status === "sent" || openThread?.sentAt,
  );
  const partnerAlreadySent = Boolean(
    openThread?.partnerEscalated || (openThread && partnerSent.has(openThread.id)),
  );
  const suggestion = geminiDraft;
  const pendingInView = inboxThreads.filter(
    (row) => withinRange(row, rangeDays) && caseStatusOf(row.emailComplaint) === "pending",
  ).length;
  const workingInView = inboxThreads.filter(
    (row) => withinRange(row, rangeDays) && caseStatusOf(row.emailComplaint) === "working",
  ).length;
  const pendingLast7 = inboxThreads.filter(
    (row) => withinRange(row, 7) && caseStatusOf(row.emailComplaint) === "pending",
  ).length;
  useEffect(() => {
    onInboxCount?.(serverPending ?? pendingLast7);
  }, [onInboxCount, pendingLast7, serverPending]);
  const resolvedInView = inboxThreads.filter(
    (row) => withinRange(row, rangeDays) && caseStatusOf(row.emailComplaint) === "resolved",
  ).length;
  const latestThread = inboxThreads.find((row) => withinRange(row, rangeDays)) || inboxThreads[0];
  const volumeBars = useMemo(() => barsFor(inboxThreads, false), [inboxThreads]);
  const pendingBars = useMemo(() => barsFor(inboxThreads, true), [inboxThreads]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageWindowStart = Math.max(1, Math.min(page - 1, Math.max(pageCount - 2, 1)));
  const pageNumbers = Array.from(
    { length: Math.min(3, pageCount) },
    (_, index) => pageWindowStart + index,
  ).filter((number) => number <= pageCount);

  const confirmSend = (kind: "partner" | "customer") => {
    if (!openThread) return;
    if (kind === "customer" && !replyTo.includes("@")) {
      message.error("Enter the customer email in To before sending.");
      return;
    }
    if (kind === "partner" && !partnerTo.includes("@")) {
      message.error("Enter the cab partner email in To before sending.");
      return;
    }
    setSendError("");
    setPendingSend(kind);
  };

  const approveSend = async () => {
    if (!openThread || !pendingSend) return;
    const kind = pendingSend;
    setSending(kind);
    setSendError("");
    try {
      if (kind === "customer") {
        await sendCustomerResolution(openThread.id, {
          draftReply: customerDraft.trim(),
          to: replyTo.trim(),
          cc: parseEmailList(replyCc),
          subject: openThread.subject || "",
        });
        rememberSent(CUSTOMER_SENT_KEY, openThread.id);
        message.success("Reply sent. Set the status to Resolved when the case is closed.");
        setOpenThread({
          ...openThread,
          customerReplied: true,
          draftReply: customerDraft,
          caseStatus: caseStatusOf(openThread),
        });
      } else {
        await sendPartnerEscalation(openThread.id, {
          draft: partnerDraft.trim(),
          bookingId: bookingId || undefined,
          to: partnerTo.trim(),
          cc: parseEmailList(partnerCcText),
          partnerName: partnerName || undefined,
        });
        rememberSent(PARTNER_SENT_KEY, openThread.id);
        setPartnerSent(readSent(PARTNER_SENT_KEY));
        setOpenThread({ ...openThread, partnerEscalated: true });
        message.success("Escalation email sent to the cab partner");
      }
      setPendingSend(null);
      try {
        const trail = await getEmailComplaintTrail(openThread.id);
        if (trail?.messages?.length) setMailTrail(trail.messages);
      } catch {
        /* trail refresh is best-effort after send */
      }
      await load();
    } catch (error) {
      const text = emailComplaintError(error);
      setSendError(text);
      message.error(text);
    } finally {
      setSending(null);
    }
  };

  const saveCase = async (
    threadId: number,
    patch: { caseStatus?: CaseStatus; complaintTag?: string },
  ) => {
    const merge = (thread: EmailComplaintThread): EmailComplaintThread =>
      thread.id === threadId ? { ...thread, ...patch } : thread;
    const inboxRow = rows.find((row) => row.emailComplaint?.id === threadId);
    if (inboxRow && patch.caseStatus && withinRange(inboxRow, 7)) {
      const wasPending = caseStatusOf(inboxRow.emailComplaint) === "pending";
      const nowPending = patch.caseStatus === "pending";
      if (wasPending !== nowPending) {
        setServerPending((count) =>
          count == null ? count : Math.max(0, count + (nowPending ? 1 : -1)),
        );
      }
    }
    setOpenThread((current) => (current && current.id === threadId ? { ...current, ...patch } : current));
    setRows((current) =>
      current.map((row) => ({ ...row, emailComplaint: merge(row.emailComplaint) })),
    );
    setBlacklistedRows((current) =>
      current.map((row) => ({ ...row, emailComplaint: merge(row.emailComplaint) })),
    );
    try {
      await updateEmailComplaintCase(threadId, {
        caseStatus: patch.caseStatus,
        tag: patch.complaintTag,
      });
    } catch (error) {
      message.error(emailComplaintError(error));
    }
  };

  const openEmailFromList = (row: ComplaintRow) => {
    openEmail(row);
    if (caseStatusOf(row.emailComplaint) === "pending" && row.emailComplaint?.id) {
      void saveCase(row.emailComplaint.id, { caseStatus: "working" });
    }
  };

  const focusReply = () => {
    if (!openThread) {
      message.info("Select an email to write a reply.");
      return;
    }
    setComposerTab("reply");
    requestAnimationFrame(() => replyRef.current?.focus());
  };

  const toggleStar = (threadId: number) => {
    setStarred((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      localStorage.setItem(STARS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const saveNote = () => {
    if (!openThread) return;
    const next = { ...notes, [String(openThread.id)]: noteDraft };
    setNotes(next);
    sessionStorage.setItem(NOTES_KEY, JSON.stringify(next));
    message.success("Internal note saved");
  };

  const chooseBooking = (index: number) => {
    const booking = bookings[index];
    setBookingIndex(index);
    if (!booking || !openThread) return;
    const id = String(booking.bookingId || "");
    const contact = resolvePartnerForComplaint(booking.cabPartner, `${openThread.subject || ""}\n${openBody}`);
    setBookingId(id);
    setMatchMobile(String(booking.mobile || openThread.customerMobile || "").replace(/\D/g, "").slice(-10));
    applyPartner(
      contact,
      openThread,
      openBody,
      id ? [id] : [],
      openThread.customerName || booking.userName,
      openThread.customerMobile || booking.mobile,
    );
  };

  const applyMatchedThread = (thread: EmailComplaintThread) => {
    const rebuilt = threadsToRows([withLocalReplies(thread)]);
    const first = rebuilt[0];
    setRows((current) => [
      ...rebuilt,
      ...current.filter((row) => row.emailComplaint?.id !== thread.id),
    ]);
    setBlacklistedRows((current) =>
      current.filter((row) => row.emailComplaint?.id !== thread.id),
    );
    setOpenThread(thread);
    setBookingId(String(thread.bookingId || ""));
    setMatchMobile(String(thread.customerMobile || "").replace(/\D/g, "").slice(-10));
    setBookingIndex(0);
    if (first) setSelectedKey(first._rowKey);
    const primary = (Array.isArray(thread.bookings) ? thread.bookings[0] : null) as Booking | null;
    const contact = resolvePartnerForComplaint(
      primary?.cabPartner || thread.cabPartner,
      `${thread.subject || ""}\n${openBody}`,
    );
    const ids = thread.bookingId ? [String(thread.bookingId)] : [];
    applyPartner(
      contact,
      thread,
      openBody,
      ids,
      thread.customerName || primary?.userName,
      thread.customerMobile || primary?.mobile,
    );
    if (first) void loadSuggestion(first);
  };

  const saveMatch = async () => {
    if (!openThread) return;
    const id = bookingId.trim().toUpperCase();
    const mobile = matchMobile.replace(/\D/g, "").slice(-10);
    if (!id && !mobile) {
      message.error("Enter a booking ID or mobile number from the customer message.");
      return;
    }
    setMatching(true);
    try {
      const result = await updateEmailComplaintMatch(openThread.id, {
        bookingId: id || undefined,
        customerMobile: mobile || undefined,
      });
      if (!result?.thread) {
        message.error("Match was saved but booking details did not return.");
        return;
      }
      applyMatchedThread({
        ...result.thread,
        messages: openThread.messages,
      });
      message.success("Booking linked. View Full Booking is now available.");
    } catch (error) {
      message.error(emailComplaintError(error));
    } finally {
      setMatching(false);
    }
  };

  const unlinkMatch = async () => {
    if (!openThread) return;
    setMatching(true);
    try {
      const result = await updateEmailComplaintMatch(openThread.id, { unlink: true });
      const cleared: EmailComplaintThread = {
        ...(result?.thread || openThread),
        bookingId: null,
        customerMobile: null,
        cabPartner: null,
        bookings: [],
        messages: openThread.messages,
      };
      applyMatchedThread(cleared);
      setBookingId("");
      setMatchMobile("");
      message.success("Booking unlinked from this email.");
    } catch (error) {
      message.error(emailComplaintError(error));
    } finally {
      setMatching(false);
    }
  };

  const selectPartner = (key: string) => {
    if (!openThread) return;
    const contact = partnerContactByKey(key);
    if (!contact) {
      setPartnerKey("");
      setPartnerName("");
      setPartnerTo("");
      setPartnerCcText("");
      setPartnerPhone("");
      return;
    }
    applyPartner(
      contact,
      openThread,
      openBody,
      bookingId ? [bookingId] : [],
      openThread.customerName || activeBooking?.userName,
      openThread.customerMobile || activeBooking?.mobile,
    );
  };

  const downloadReport = async () => {
    setExporting(true);
    try {
      const listed = await listEmailComplaints({
        page: 1,
        limit: 100,
        search: search || undefined,
        export: true,
      });
      const reportRows = threadsToRows(listed?.threads || []).filter((row) => {
        if (isHiddenThread(row.emailComplaint)) return false;
        if (!withinRange(row, rangeDays)) return false;
        const status = caseStatusOf(row.emailComplaint);
        if (statusTab === "pending" && status !== "pending") return false;
        if (statusTab === "working" && status !== "working") return false;
        if (statusTab === "resolved" && status !== "resolved") return false;
        if (bookingFilter === "matched" && !row.bookingId) return false;
        if (bookingFilter === "unmatched" && row.bookingId) return false;
        if (!matchesEmailClassification(row.emailComplaint?.complaintTag, classFilter)) return false;
        return true;
      });
      const header = [
        "Email Subject",
        "Booking ID",
        "Partner Name",
        "Sender Email",
        "Received At",
        "Complaint Details",
        "Status",
        "Kind",
        "Category",
        "Type",
        "Tag",
      ];
      const lines = reportRows.map((row) => {
        const thread = row.emailComplaint;
        const classification = parseEmailClassification(thread.complaintTag);
        const contact = resolvePartnerForComplaint(
          row.cabPartner || thread.cabPartner,
          `${thread.subject || ""}\n${row.emailBody || ""}`,
        );
        return [
          thread.subject || "",
          row.bookingId || thread.bookingId || "",
          partnerLabel(contact, row.cabPartner),
          thread.customerEmail || "",
          clockLabel(thread.receivedAt, true),
          row.emailBody || thread.emailPreview || "",
          complaintStatus(thread),
          classification?.kindLabel || "",
          classification?.category || "",
          classification?.type || "",
          thread.complaintTag || "",
        ].map(csvCell).join(",");
      });
      const csv = [header.map(csvCell).join(","), ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `email-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      const mailboxTotal = listed?.total || 0;
      const exportedThreads = listed?.threads?.length || 0;
      message.success(
        mailboxTotal > exportedThreads
          ? `Downloaded ${reportRows.length} rows. The mailbox has more email than this file includes.`
          : `Downloaded ${reportRows.length} complaint rows`,
      );
    } catch (error) {
      message.error(emailComplaintError(error));
    } finally {
      setExporting(false);
    }
  };

  const copySuggestion = async () => {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      message.error("Could not copy the suggestion");
    }
  };

  const applySearch = (value: string) => {
    setPage(1);
    setSearch(value.trim());
  };

  const rangeLabel = rangeDays === 30 ? "Last 30 Days" : rangeDays === 0 ? "Since 1 Oct 2026" : "Last 7 Days";
  const iconBtn = "grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700";

  return (
    <div className="rounded-2xl bg-[#f5f7fb] px-1 py-3 sm:px-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#e7ebf0] bg-white text-blue-600 shadow-sm">
            <FiMail size={20} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Email</h2>
            <p className="text-sm text-gray-500">Manage customer emails and respond faster</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            trigger={["click"]}
            menu={{
              selectedKeys: [String(rangeDays)],
              onClick: ({ key }) => setRangeDays(Number(key)),
              items: [
                { key: "7", label: "Last 7 Days" },
                { key: "30", label: "Last 30 Days" },
                { key: "0", label: "Since 1 Oct 2026" },
              ],
            }}
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {rangeLabel}
              <FiChevronDown />
            </button>
          </Dropdown>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void downloadReport()}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <FiDownload className={exporting ? "animate-bounce" : ""} />
            {exporting ? "Preparing…" : "Download CSV"}
          </button>
          <button
            type="button"
            onClick={focusReply}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2f6cf6] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#245fe0]"
          >
            <FiEdit2 />
            Compose
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-[#eef4ff] px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2f6cf6] text-white">
              <FiMail size={20} />
            </span>
            <div>
              <div className="text-[13px] text-gray-500">Total Emails (Received)</div>
              <div className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-slate-900">
                {formatCount(total)}
              </div>
              <div className="mt-2 text-xs text-gray-400">since 1 Oct 2026</div>
            </div>
          </div>
          <MiniBars values={volumeBars} color="#3b82f6" />
        </article>

        <article className="rounded-2xl border border-emerald-100 bg-[#eefbf4] px-5 py-4">
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <FiClock size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] text-gray-500">Last Email Received</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">
                {latestThread ? clockLabel(latestThread.emailComplaint?.receivedAt, true) : "—"}
              </div>
              <div className="mt-1 truncate text-xs text-gray-700">
                <span className="text-gray-400">From: </span>
                {latestThread?.emailComplaint?.customerEmail || "—"}
              </div>
              <div className="truncate text-xs text-gray-700">
                <span className="text-gray-400">Subject: </span>
                {latestThread?.emailComplaint?.subject || "—"}
              </div>
            </div>
          </div>
        </article>

        <article className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-[#fff1f2] px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500 text-white">
              <MdHourglassTop size={22} />
            </span>
            <div>
              <div className="text-[13px] text-gray-500">Pending Emails (Last 7 Days)</div>
              <div className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-slate-900">
                {formatCount(serverPending ?? pendingLast7)}
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {serverPending == null ? "on this page" : "across the inbox"}
              </div>
            </div>
          </div>
          <MiniBars values={pendingBars} color="#fb7185" />
        </article>
      </div>

      <div className="mb-4 rounded-2xl border border-[#c9d8ff] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FiSearch />
          Search emails
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[280px] flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              aria-label="Search emails by booking ID, partner, subject, or sender"
              onChange={(event) => {
                const value = event.target.value;
                setSearchInput(value);
                if (!value.trim() && search) applySearch("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch(searchInput);
              }}
              placeholder="Booking ID, partner name, email subject, sender, or mobile"
              className="w-full rounded-xl border border-gray-300 bg-[#f8fafc] py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => applySearch(searchInput)}
            className="rounded-xl bg-[#2f6cf6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#245fe0]"
          >
            Search
          </button>
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                applySearch("");
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["all", "All Emails", formatCount(total), "bg-blue-100 text-blue-700"],
              ["pending", "Pending", formatCount(pendingInView), "bg-rose-100 text-rose-600"],
              ["working", "Working", formatCount(workingInView), "bg-amber-100 text-amber-700"],
              ["resolved", "Resolved", formatCount(resolvedInView), "bg-gray-100 text-gray-600"],
            ] as const
          ).map(([key, label, count, badge]) => {
            const selected = statusTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusTab(key)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                  selected ? "bg-blue-50 font-medium text-blue-700" : "text-gray-600 hover:bg-white"
                }`}
              >
                {label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center justify-end gap-2">
          <Dropdown
            trigger={["click"]}
            menu={{
              selectedKeys: [emailClassFilterKey(classFilter)],
              onClick: ({ key }) => setClassFilter(parseEmailClassFilter(String(key))),
              items: CLASS_FILTERS.map((item) => ({ key: item.key, label: item.label })),
            }}
          >
            <button
              type="button"
              className={`inline-flex max-w-[240px] items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 ${
                classFilter.kind === "all" ? "border-gray-200 text-gray-700" : "border-blue-200 text-blue-700"
              }`}
            >
              <span className="truncate">{emailClassFilterLabel(classFilter)}</span>
              <FiChevronDown className="shrink-0" />
            </button>
          </Dropdown>
          <Dropdown
            trigger={["click"]}
            menu={{
              selectedKeys: [bookingFilter],
              onClick: ({ key }) => setBookingFilter(key as BookingFilter),
              items: [
                { key: "all", label: "All emails" },
                { key: "matched", label: "Matched booking" },
                { key: "unmatched", label: "No booking match" },
                { key: "blacklisted", label: `Blacklisted (${formatCount(blacklistedTotal)})` },
              ],
            }}
          >
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${
                bookingFilter === "all" ? "border-gray-200" : "border-blue-200 text-blue-700"
              }`}
            >
              <FiFilter />
              Filters
              <FiChevronDown />
            </button>
          </Dropdown>
        </div>
      </div>

      {loadError ? (
        <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</div>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-3 xl:h-[740px] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <section className="flex min-h-[480px] flex-col rounded-2xl border border-[#e7ebf0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:h-full xl:min-h-0">
          <header className="flex items-center justify-between px-4 pb-2 pt-4">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">Recent Emails</h3>
              {bookingFilter === "blacklisted" ? (
                <p className="mt-0.5 text-[11px] text-gray-400">{BLACKLISTED_SENDERS.join(", ")}</p>
              ) : null}
            </div>
            <button
              type="button"
              className={iconBtn}
              title={sortDir === "desc" ? "Newest first" : "Oldest first"}
              onClick={() => setSortDir((current) => (current === "desc" ? "asc" : "desc"))}
            >
              <FiChevronDown className={sortDir === "asc" ? "rotate-180" : ""} />
            </button>
          </header>
          <div className="min-h-0 max-h-[520px] flex-1 overflow-y-auto px-2 pb-2 xl:max-h-none">
            {loading && !visibleRows.length ? (
              <div className="grid h-40 place-items-center">
                <Spin />
              </div>
            ) : null}
            {!loading && !visibleRows.length ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">No emails in this view.</div>
            ) : null}
            {visibleRows.map((row) => {
              const thread = row.emailComplaint;
              const activeRow = row._rowKey === selectedKey;
              const starredRow = starred.has(thread.id);
              const rowPartner = resolvePartnerForComplaint(
                row.cabPartner || thread.cabPartner,
                `${thread.subject || ""}\n${row.emailBody || ""}`,
              );
              const rowMeta = [
                row.bookingId || thread.bookingId,
                partnerLabel(rowPartner),
              ]
                .filter(Boolean)
                .join(" · ");
              const classification = parseEmailClassification(thread.complaintTag);
              return (
                <div
                  key={row._rowKey}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (row._rowKey !== selectedKey) openEmailFromList(row);
                    else if (caseStatusOf(thread) === "pending") {
                      void saveCase(thread.id, { caseStatus: "working" });
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      if (row._rowKey !== selectedKey) openEmailFromList(row);
                      else if (caseStatusOf(thread) === "pending") {
                        void saveCase(thread.id, { caseStatus: "working" });
                      }
                    }
                  }}
                  className={`mb-1 flex w-full cursor-pointer gap-3 rounded-xl px-3 py-3 text-left ${
                    activeRow ? "bg-[#eaf2ff]" : "hover:bg-gray-50"
                  }`}
                >
                  <Avatar email={thread.customerEmail} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-slate-800">
                        {thread.customerEmail || "Unknown sender"}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {formatListTime(thread.receivedAt)}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-gray-400">
                      {rowMeta || "No booking match"}
                    </span>
                    <span className="mt-1 block truncate text-[12px] text-gray-500">
                      {thread.subject || row.emailPreviewText || "No subject"}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      {classification ? (
                        <span
                          title={`${classification.kindLabel} · ${classification.category} · ${classification.type}`}
                          className={`min-w-0 flex-1 truncate text-[11px] font-medium ${
                            classification.kind === "complaint" ? "text-rose-600" : "text-blue-700"
                          }`}
                        >
                          {classification.kindLabel} · {classification.type}
                        </span>
                      ) : (
                        <span className="min-w-0 flex-1" />
                      )}
                      <StatusPill status={caseStatusOf(thread)} />
                      <button
                        type="button"
                        aria-label={starredRow ? "Unstar email" : "Star email"}
                        className="shrink-0 text-gray-300"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStar(thread.id);
                        }}
                      >
                        {starredRow ? <FaStar className="text-amber-400" /> : <FiStar />}
                      </button>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <footer className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
            {bookingFilter === "blacklisted" ? (
              <span>
                Showing {visibleRows.length} of {formatCount(blacklistedTotal)}
              </span>
            ) : (
              <>
                <span>
                  {from}–{to} of {formatCount(total)}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft />
                  </button>
                  {pageNumbers.map((number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => setPage(number)}
                      className={`grid h-7 w-7 place-items-center rounded-full ${
                        number === page ? "bg-[#2f6cf6] text-white" : "hover:bg-gray-100"
                      }`}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={page * pageSize >= total || loading}
                    onClick={() => setPage((current) => current + 1)}
                    aria-label="Next page"
                  >
                    <FiChevronRight />
                  </button>
                  <select
                    aria-label="Emails per page"
                    value={pageSize}
                    disabled={loading}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="ml-1 rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </span>
              </>
            )}
          </footer>
        </section>

        <section className="flex min-h-[560px] flex-col rounded-2xl border border-[#e7ebf0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:h-full xl:min-h-0">
          {!openThread ? (
            <div className="grid flex-1 place-items-center text-sm text-gray-400">
              {loading ? <Spin /> : "Select an email to read and reply."}
            </div>
          ) : (
            <>
              <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {openThread.subject || "No subject"}
                  </h3>
                  <label className="shrink-0 text-[11px] text-gray-400">
                    Status
                    <select
                      aria-label="Complaint status"
                      value={openCaseStatus}
                      onChange={(event) =>
                        saveCase(openThread.id, { caseStatus: event.target.value as CaseStatus })
                      }
                      className={`ml-1 rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium ${
                        openCaseStatus === "resolved"
                          ? "bg-emerald-50 text-emerald-700"
                          : openCaseStatus === "working"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="working">Working</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>
                  <label className="shrink-0 text-[11px] text-gray-400">
                    Classify
                    <EmailClassificationSelect
                      tag={openThread.complaintTag || ""}
                      onChange={(complaintTag) => saveCase(openThread.id, { complaintTag })}
                    />
                  </label>
                  {partnerAlreadySent ? (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                      Partner
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={starred.has(openThread.id) ? "Unstar email" : "Star email"}
                    onClick={() => toggleStar(openThread.id)}
                  >
                    {starred.has(openThread.id) ? (
                      <FaStar className="text-amber-400" />
                    ) : (
                      <FiStar />
                    )}
                  </button>
                  <button type="button" className={iconBtn} aria-label="Reply" onClick={focusReply}>
                    <FiCornerUpLeft />
                  </button>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      onClick: ({ key }) => {
                        if (key === "booking" && activeBooking?.bookingId) onViewDetails(activeBooking);
                        if (key === "update" && activeBooking?.bookingId) onUpdate(activeBooking);
                        if (key === "json" && activeBooking?.bookingId) onShowJSON(activeBooking);
                        if (key === "log" && activeBooking?.bookingId) onCreateLog?.(activeBooking);
                        if (key === "partner") setComposerTab("partner");
                        if (key === "copy" && openThread.customerEmail) {
                          navigator.clipboard.writeText(openThread.customerEmail).then(
                            () => message.success("Sender copied"),
                            () => message.error("Could not copy the sender"),
                          );
                        }
                      },
                      items: [
                        { key: "booking", label: "View full booking", disabled: !activeBooking?.bookingId },
                        { key: "update", label: "Update booking", disabled: !activeBooking?.bookingId },
                        { key: "json", label: "Show booking JSON", disabled: !activeBooking?.bookingId },
                        {
                          key: "log",
                          label: "Create log",
                          disabled: !activeBooking?.bookingId || !onCreateLog,
                        },
                        {
                          key: "partner",
                          label: "Escalate to cab partner",
                        },
                        { key: "copy", label: "Copy sender email", disabled: !openThread.customerEmail },
                      ],
                    }}
                  >
                    <button type="button" className={iconBtn} aria-label="More actions">
                      <FiMoreHorizontal />
                    </button>
                  </Dropdown>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="mb-4">
                  <EmailClassificationFields
                    tag={openThread.complaintTag || ""}
                    onChange={(complaintTag) => saveCase(openThread.id, { complaintTag })}
                  />
                </div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mail trail
                    {mailTrail.length > 1 ? ` · ${mailTrail.length} messages` : ""}
                  </div>
                  {trailLoading ? <span className="text-xs text-gray-400">Loading trail…</span> : null}
                </div>
                <div className="space-y-3">
                  {(mailTrail.length
                    ? mailTrail
                    : [
                        {
                          direction: "inbound",
                          bodyText: openBody,
                          at: openThread.receivedAt,
                          fromEmail: openThread.customerEmail,
                          fromName: openThread.customerName,
                        } as EmailComplaintTrailMessage,
                      ]
                  ).map((item, index) => {
                    const inbound = item.direction === "inbound";
                    const partnerOut = item.direction === "outbound_partner";
                    const label = inbound
                      ? item.fromEmail || openThread.customerEmail || "Customer"
                      : partnerOut
                        ? `To partner · ${item.toEmail || "partner"}`
                        : `Support reply · ${item.toEmail || openThread.customerEmail || "customer"}`;
                    return (
                      <div
                        key={`${item.id || index}-${item.at || index}`}
                        className={`rounded-xl border px-4 py-3 ${
                          inbound
                            ? "border-slate-200 bg-white"
                            : partnerOut
                              ? "border-amber-100 bg-amber-50/60"
                              : "border-blue-100 bg-[#f3f7ff]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            <Avatar
                              email={inbound ? item.fromEmail || openThread.customerEmail : INBOX_ADDRESS}
                              size={30}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-800">{label}</div>
                              <div className="text-xs text-gray-400">
                                {inbound ? `To: ${INBOX_ADDRESS}` : item.subject || "Sent from support"}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-xs text-gray-400">
                            {clockLabel(item.at || openThread.receivedAt, true)}
                          </div>
                        </div>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700">
                          {item.bodyText || (inbound ? "This email has no message body." : "—")}
                        </pre>
                      </div>
                    );
                  })}
                </div>
                {activeBooking?.bookingId ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-[#f3fbf6] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm text-white">
                        ✓
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800">Match Found with Booking</div>
                        <div className="truncate text-xs text-gray-500">
                          Booking ID: {activeBooking.bookingId}
                          {partnerName ? ` · ${partnerName}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-sm font-medium text-[#2f6cf6]"
                      onClick={() => onViewDetails(activeBooking)}
                    >
                      View Booking
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    No booking matched this email.
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 px-5 pb-4">
                <div className="flex gap-6">
                  {(
                    [
                      ["reply", "Reply"],
                      ["partner", "Partner"],
                      ["note", "Internal Note"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setComposerTab(key)}
                      className={`border-b-2 py-3 text-sm ${
                        composerTab === key
                          ? "border-[#2f6cf6] font-medium text-[#2f6cf6]"
                          : "border-transparent text-gray-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-gray-200">
                  {composerTab === "reply" ? (
                    <div className="space-y-2 px-3 pt-3">
                      <label className="block text-xs text-gray-500">
                        To
                        <input
                          value={replyTo}
                          onChange={(event) => setReplyTo(event.target.value)}
                          placeholder="customer@email.com"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
                        />
                      </label>
                      <label className="block text-xs text-gray-500">
                        CC
                        <input
                          value={replyCc}
                          onChange={(event) => setReplyCc(event.target.value)}
                          placeholder="Optional, comma-separated"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
                        />
                      </label>
                      {customerAlreadySent ? (
                        <p className="text-xs text-gray-400">A reply was already sent. You can send another.</p>
                      ) : null}
                      <textarea
                        ref={replyRef}
                        rows={4}
                        value={customerDraft}
                        placeholder="Type your response..."
                        onChange={(event) => setCustomerDraft(event.target.value)}
                        className="w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  ) : null}
                  {composerTab === "partner" ? (
                    <div className="space-y-2 px-3 pt-3">
                      <label className="block text-xs text-gray-500">
                        Partner
                        <select
                          aria-label="Cab partner"
                          value={partnerKey}
                          onChange={(event) => selectPartner(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
                        >
                          <option value="">Select partner</option>
                          {listPartnerContacts().map((contact) => (
                            <option key={contact.key} value={contact.key}>
                              {contact.name}
                              {contact.email ? "" : " (type an email)"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs text-gray-500">
                        Booking ID
                        <input
                          value={bookingId}
                          onChange={(event) => setBookingId(event.target.value)}
                          placeholder="Matched booking ID"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
                        />
                      </label>
                      <label className="block text-xs text-gray-500">
                        To
                        <input
                          value={partnerTo}
                          onChange={(event) => setPartnerTo(event.target.value)}
                          placeholder="partner@email.com"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
                        />
                      </label>
                      <label className="block text-xs text-gray-500">
                        CC
                        <input
                          value={partnerCcText}
                          onChange={(event) => setPartnerCcText(event.target.value)}
                          placeholder="Optional, comma-separated"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
                        />
                      </label>
                      {partnerPhone ? (
                        <p className="text-xs text-gray-400">Partner phone: {partnerPhone}</p>
                      ) : null}
                      <textarea
                        rows={4}
                        value={partnerDraft}
                        placeholder="Write the escalation..."
                        onChange={(event) => setPartnerDraft(event.target.value)}
                        className="w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  ) : null}
                  {composerTab === "note" ? (
                    <textarea
                      rows={4}
                      value={noteDraft}
                      placeholder="Write an internal note for the team..."
                      onChange={(event) => setNoteDraft(event.target.value)}
                      className="w-full resize-none bg-transparent px-3 pt-3 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                    />
                  ) : null}
                <div className="flex items-center justify-between px-2 pb-2">
                  <button
                    type="button"
                    className={iconBtn}
                    title="Mention a file name in the reply"
                    onClick={() => {
                      setComposerTab("reply");
                      requestAnimationFrame(() => replyRef.current?.focus());
                    }}
                  >
                    <FiPaperclip />
                  </button>
                  {composerTab === "note" ? (
                    <button
                      type="button"
                      onClick={saveNote}
                      disabled={!noteDraft.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#2f6cf6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  ) : null}
                  {sendError ? (
                    <p className="px-2 pb-2 text-xs text-rose-600">{sendError}</p>
                  ) : null}
                  {composerTab === "reply" ? (
                    <button
                      type="button"
                      disabled={!customerDraft.trim() || !replyTo.includes("@") || sending !== null}
                      onClick={() => confirmSend("customer")}
                      className="rounded-lg bg-[#2f6cf6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {sending === "customer" ? "Sending…" : customerAlreadySent ? "Send again" : "Send reply"}
                    </button>
                  ) : null}
                  {composerTab === "partner" ? (
                    <button
                      type="button"
                      disabled={!partnerDraft.trim() || !partnerTo.includes("@") || sending !== null}
                      onClick={() => confirmSend("partner")}
                      className="rounded-lg bg-[#2f6cf6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {sending === "partner"
                        ? "Sending…"
                        : partnerAlreadySent
                          ? "Send again"
                          : "Send to partner"}
                    </button>
                  ) : null}
                </div>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex min-h-0 flex-col gap-3 xl:h-full xl:overflow-y-auto">
          <section className="rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-900">Matched Booking</h3>
              {activeBooking?.bookingId ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                  Matched
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  Unmatched
                </span>
              )}
            </div>
            {bookings.length > 1 ? (
              <select
                aria-label="Matched bookings"
                value={bookingIndex}
                onChange={(event) => chooseBooking(Number(event.target.value))}
                className="mb-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
              >
                {bookings.map((booking, index) => (
                  <option key={`${booking.bookingId || "booking"}-${index}`} value={index}>
                    {booking.bookingId || `Booking ${index + 1}`}
                  </option>
                ))}
              </select>
            ) : null}
            <label className="block py-[7px] text-[13px]">
              <span className="text-gray-400">Booking ID</span>
              <input
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value.toUpperCase())}
                placeholder="Paste from image / email"
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
              />
            </label>
            <MetaRow label="Partner">{partnerName || "—"}</MetaRow>
            <MetaRow label="Partner email">{partnerTo || "—"}</MetaRow>
            <MetaRow label="Customer">
              {activeBooking?.userName || openThread?.customerName || "—"}
            </MetaRow>
            <label className="block py-[7px] text-[13px]">
              <span className="text-gray-400">Mobile</span>
              <input
                value={matchMobile}
                onChange={(event) => setMatchMobile(event.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="10-digit mobile"
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300"
              />
            </label>
            <MetaRow label="Email">
              {activeBooking?.email || openThread?.customerEmail || "—"}
            </MetaRow>
            <MetaRow label="Travel Date">{formatTravel(activeBooking?.pickupTime)}</MetaRow>
            <MetaRow label="Status">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(activeBooking?.status)}`}>
                {bookingStatusLabel(activeBooking?.status)}
              </span>
            </MetaRow>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              If the booking ID was only in an image, type it here (or the mobile) and update the match.
            </p>
            <button
              type="button"
              disabled={matching || (!bookingId.trim() && !matchMobile.trim())}
              onClick={() => void saveMatch()}
              className="mt-3 w-full rounded-lg bg-[#2f6cf6] py-2 text-sm font-medium text-white hover:bg-[#2558d6] disabled:opacity-50"
            >
              {matching ? "Updating…" : activeBooking?.bookingId ? "Update match" : "Link booking"}
            </button>
            {activeBooking?.bookingId || openThread?.bookingId || bookingId.trim() ? (
              <button
                type="button"
                disabled={matching}
                onClick={() => void unlinkMatch()}
                className="mt-2 w-full rounded-lg border border-rose-200 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                {matching ? "Unlinking…" : "Unlink booking"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!activeBooking?.bookingId}
              onClick={() => activeBooking?.bookingId && onViewDetails(activeBooking)}
              className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              View Full Booking
            </button>
          </section>

          <section className="rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-slate-900">AI Suggestion</h3>
              <HiOutlineSparkles className="text-amber-400" />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Suggested response based on email content and booking details.
            </p>
            <div className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f3f7ff] p-3 text-[13px] leading-5 text-gray-700">
              {suggestionLoading
                ? "Writing a reply from this email and the matched booking…"
                : suggestion || "Generate a reply when you are ready."}
            </div>
            {suggestionError ? (
              <p className="mt-2 text-xs text-rose-600">{suggestionError}</p>
            ) : null}
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={!selectedRow || suggestionLoading}
                onClick={() => selectedRow && void loadSuggestion(selectedRow)}
                className="w-full rounded-lg bg-[#2f6cf6] py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {suggestionLoading ? "Generating…" : suggestion ? "Generate again" : "Generate reply"}
              </button>
              <div className="flex gap-2">
              <button
                type="button"
                disabled={!suggestion || suggestionLoading}
                onClick={() => {
                  setCustomerDraft(suggestion);
                  setComposerTab("reply");
                  requestAnimationFrame(() => replyRef.current?.focus());
                }}
                className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Use Suggestion
              </button>
              <button
                type="button"
                aria-label={copied ? "Copied" : "Copy suggestion"}
                disabled={!suggestion}
                onClick={copySuggestion}
                className="grid w-10 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <FiCopy />
              </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={pendingSend != null}
        title={pendingSend === "partner" ? "Send this escalation to the cab partner?" : "Send this reply to the customer?"}
        okText="Approve and send"
        cancelText="Cancel"
        confirmLoading={sending != null}
        onOk={() => void approveSend()}
        onCancel={() => {
          if (sending) return;
          setPendingSend(null);
        }}
      >
        <p>
          To: {pendingSend === "partner" ? partnerTo.trim() : replyTo.trim()}. Nothing is sent until you
          confirm.
        </p>
      </Modal>

    </div>
  );
}
