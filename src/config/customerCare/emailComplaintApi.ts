import axios, { AxiosError } from "axios";
import { store } from "../../Redux/store";

export type EmailComplaintTrailMessage = {
  id?: number | string;
  direction?: "inbound" | "outbound_customer" | "outbound_partner" | string;
  fromEmail?: string | null;
  fromName?: string | null;
  toEmail?: string | null;
  subject?: string | null;
  bodyText?: string;
  at?: string | null;
};

export type EmailComplaintThread = {
  id: number;
  customerEmail?: string;
  customerName?: string | null;
  customerMobile?: string | null;
  subject?: string;
  bookingId?: string | null;
  brand?: string | null;
  cabPartner?: string | null;
  emailPreview?: string;
  receivedAt?: string | null;
  customerReplied?: boolean;
  partnerEscalated?: boolean;
  caseStatus?: "pending" | "working" | "resolved";
  complaintTag?: string;
  status?: string;
  draftReply?: string | null;
  sentAt?: string | null;
  relatedCount?: number;
  bookings?: Array<Record<string, unknown>>;
  messages?: EmailComplaintTrailMessage[];
};

type Envelope<T> = {
  status?: string;
  message?: string;
  data: T;
};

/** Matches the analytics mailbox sync interval. */
export const EMAIL_COMPLAINT_REFRESH_MS = 60_000;

const INDIGO_API =
  (typeof import.meta !== "undefined" &&
    String((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ANALYTICS_API || "").replace(
      /\/$/,
      "",
    )) ||
  "https://ing-api-prod.bookairportcab.com";
const LIST = "/api/v1/operations/emailComplaints";
const RELATED = "/api/v1/operations/emailComplaint/related";
const TRAIL = "/api/v1/operations/emailComplaint/trail";
const DRAFT = "/api/v1/operations/emailComplaint/draft";
const SEND = "/api/v1/operations/emailComplaint/send";
const ESCALATE = "/api/v1/operations/emailComplaint/escalate";
const CASE = "/api/v1/operations/emailComplaint/case";
const MATCH = "/api/v1/operations/emailComplaint/match";
const BOOKING_ESCALATE = "/api/v1/operations/emailComplaint/bookingEscalate";
const BOOKING_NOTIFY = "/api/v1/operations/emailComplaint/bookingNotify";

function isJwt(value: unknown): value is string {
  return typeof value === "string" && value.split(".").length === 3;
}

/** Email-complaint routes live on indigo-analytics (ing-api), not viaVIP booking API. */
function isAnalyticsApiHost(host: string) {
  const value = String(host || "").toLowerCase();
  return (
    value.includes("ing-api") ||
    value.includes("analytics") ||
    value.includes("indigo-analytics")
  );
}

function analyticsSession() {
  const pwd = store.getState().authStore.partner_wise_data?.[0] || {};
  const preferred = ["read", "indigo", "aggregator", "mojo", "bac", "yatra"];
  const keys = [...preferred, ...Object.keys(pwd).filter((key) => !preferred.includes(key))];

  let token = "";
  let host = INDIGO_API;

  for (const key of keys) {
    const entry = pwd[key];
    if (!entry || typeof entry !== "object") continue;
    const auth = (entry as { auth?: unknown }).auth;
    if (!isJwt(auth)) continue;
    token = auth;
    const entryHost = String((entry as { host?: unknown }).host || "").replace(/\/$/, "");
    // Prefer an explicit analytics/read host; never send email-complaint calls to viaVIP.
    if (key === "read" && entryHost.startsWith("http")) {
      host = entryHost;
    } else if (entryHost.startsWith("http") && isAnalyticsApiHost(entryHost)) {
      host = entryHost;
    }
    break;
  }

  return { host, token };
}

function client(timeout: number) {
  const { host, token } = analyticsSession();
  if (!token) {
    throw new Error(
      "Analytics session is missing. Sign in again (ADMIN/OPS with viaVIP token), then retry Escalate.",
    );
  }
  return axios.create({
    baseURL: host,
    timeout,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function unwrap<T>(response: { data: Envelope<T> }) {
  if (response.data?.status === "failure") {
    throw new Error(response.data.message || "Request failed");
  }
  return response.data.data;
}

export function emailComplaintError(error: unknown) {
  if (error instanceof Error && error.message && !("isAxiosError" in error)) {
    return error.message;
  }
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string | { message?: string };
  }>;
  if (axiosError.response?.status === 504) {
    return "The analytics API timed out while reading the mailbox. Refresh to try again.";
  }
  if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
    const msg =
      (typeof axiosError.response?.data?.error === "string"
        ? axiosError.response.data.error
        : axiosError.response?.data?.error?.message) ||
      axiosError.response?.data?.message ||
      "";
    if (/invalid token|access denied|not found|cannot post|forbidden/i.test(msg || "")) {
      return (
        msg ||
        "Escalate API rejected the request. Deploy indigo-analytics-bk-api (bookingEscalate) and confirm your login token is accepted by ing-api-prod."
      );
    }
  }
  const nested = axiosError.response?.data?.error;
  return (
    (typeof nested === "string" ? nested : nested?.message) ||
    axiosError.response?.data?.message ||
    (error instanceof Error ? error.message : "") ||
    "Request failed"
  );
}

export async function listEmailComplaints(params: {
  page?: number;
  limit?: number;
  search?: string;
  export?: boolean;
}) {
  const response = await client(180000).post<
    Envelope<{
      threads: EmailComplaintThread[];
      total: number;
      pendingTotal?: number;
      pendingLast7Days?: number;
      blacklisted?: EmailComplaintThread[];
      blacklistedTotal?: number;
      page: number;
      limit: number;
    }>
  >(LIST, params);
  return unwrap(response);
}

function relatedSearchTerms(params: {
  bookingId?: string | null;
  email?: string | null;
  mobile?: string | null;
}) {
  return [
    ...new Set(
      [params.bookingId, params.email, params.mobile]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ];
}

function threadMatchesRelated(
  thread: EmailComplaintThread,
  params: { bookingId?: string | null; email?: string | null; mobile?: string | null },
) {
  const bookingId = String(params.bookingId || "").trim().toUpperCase();
  const email = String(params.email || "").trim().toLowerCase();
  const mobileDigits = String(params.mobile || "").replace(/\D/g, "");
  const mobile =
    mobileDigits.length >= 10 ? mobileDigits.slice(-10) : mobileDigits;
  if (bookingId && String(thread.bookingId || "").toUpperCase() === bookingId) {
    return true;
  }
  if (email && String(thread.customerEmail || "").toLowerCase() === email) {
    return true;
  }
  if (mobile) {
    const threadMobile = String(thread.customerMobile || "").replace(/\D/g, "");
    if (threadMobile.endsWith(mobile) || mobile.endsWith(threadMobile.slice(-10))) {
      return true;
    }
    const haystack = `${thread.subject || ""} ${thread.emailPreview || ""}`.replace(/\D/g, "");
    if (haystack.includes(mobile)) return true;
  }
  return false;
}

/** Prefer the dedicated related API; fall back to inbox search if that route is not deployed yet. */
export async function listRelatedEmailComplaints(params: {
  bookingId?: string | null;
  email?: string | null;
  mobile?: string | null;
  limit?: number;
}) {
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
  try {
    const response = await client(60000).post<
      Envelope<{
        threads: EmailComplaintThread[];
        total: number;
        bookingId?: string | null;
        email?: string | null;
        mobile?: string | null;
      }>
    >(RELATED, { ...params, limit });
    return unwrap(response);
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    // Analytics catch-all returns 403 for unknown routes until related/trail are deployed.
    if (status !== 403 && status !== 404) throw error;
  }

  const terms = relatedSearchTerms(params);
  if (!terms.length) return { threads: [], total: 0 };

  const seen = new Set<number>();
  const threads: EmailComplaintThread[] = [];
  for (const term of terms) {
    const listed = await listEmailComplaints({ page: 1, limit, search: term });
    for (const thread of listed?.threads || []) {
      if (seen.has(thread.id) || !threadMatchesRelated(thread, params)) continue;
      seen.add(thread.id);
      threads.push(thread);
    }
  }
  threads.sort((a, b) => {
    const aTime = Date.parse(a.receivedAt || "") || 0;
    const bTime = Date.parse(b.receivedAt || "") || 0;
    return bTime - aTime;
  });
  return { threads, total: threads.length };
}

export async function getEmailComplaintTrail(threadId: number) {
  try {
    const response = await client(60000).post<
      Envelope<{
        thread: EmailComplaintThread;
        messages: EmailComplaintTrailMessage[];
        relatedThreads?: EmailComplaintThread[];
      }>
    >(TRAIL, { threadId });
    return unwrap(response);
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    if (status === 403 || status === 404) {
      return { thread: { id: threadId }, messages: [], relatedThreads: [] };
    }
    throw error;
  }
}

export async function draftCustomerReply(body: {
  subject?: string;
  bodyText?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerMobile?: string | null;
  bookingId?: string | null;
  booking?: Record<string, unknown> | null;
}) {
  const response = await client(45000).post<Envelope<{ draftReply: string }>>(DRAFT, body);
  return unwrap(response);
}

export async function sendCustomerResolution(
  threadId: number,
  body: { draftReply: string; to?: string; cc?: string[]; subject?: string },
) {
  const response = await client(60000).post<Envelope<{ sent: boolean }>>(SEND, {
    threadId,
    ...body,
  });
  return unwrap(response);
}

export async function updateEmailComplaintCase(
  threadId: number,
  body: { caseStatus?: "pending" | "working" | "resolved"; tag?: string },
) {
  const response = await client(20000).post<Envelope<{ threadId: number }>>(CASE, {
    threadId,
    ...body,
  });
  return unwrap(response);
}

export async function updateEmailComplaintMatch(
  threadId: number,
  body: { bookingId?: string; customerMobile?: string },
) {
  const response = await client(30000).post<Envelope<{ thread: EmailComplaintThread }>>(MATCH, {
    threadId,
    ...body,
  });
  return unwrap(response);
}

export async function sendPartnerEscalation(
  threadId: number,
  body: { draft: string; bookingId?: string; to?: string; cc?: string[]; partnerName?: string },
) {
  const response = await client(60000).post<Envelope<{ sent: boolean }>>(ESCALATE, {
    threadId,
    ...body,
  });
  return unwrap(response);
}

export async function escalateBookingIssue(body: {
  bookingId: string;
  note?: string;
  agent?: string;
  linkedEmails?: string[];
  booking?: Record<string, unknown> | null;
}) {
  const response = await client(60000).post<Envelope<{ sent: boolean; to?: string[] }>>(
    BOOKING_ESCALATE,
    body,
  );
  return unwrap(response);
}

export async function notifyBookingCustomers(body: {
  bookingId?: string;
  emails: string[];
  draftReply?: string;
  subject?: string;
  threadId?: number;
}) {
  const response = await client(60000).post<Envelope<{ sent: boolean; to?: string[] }>>(
    BOOKING_NOTIFY,
    body,
  );
  return unwrap(response);
}
