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

const INDIGO_API = "https://ing-api-prod.bookairportcab.com";
const LIST = "/api/v1/operations/emailComplaints";
const RELATED = "/api/v1/operations/emailComplaint/related";
const TRAIL = "/api/v1/operations/emailComplaint/trail";
const DRAFT = "/api/v1/operations/emailComplaint/draft";
const SEND = "/api/v1/operations/emailComplaint/send";
const ESCALATE = "/api/v1/operations/emailComplaint/escalate";
const CASE = "/api/v1/operations/emailComplaint/case";

function analyticsSession() {
  const read = store.getState().authStore.partner_wise_data?.[0]?.read;
  const host =
    typeof read?.host === "string" && read.host.startsWith("http")
      ? read.host.replace(/\/$/, "")
      : INDIGO_API;
  const token =
    typeof read?.auth === "string" && read.auth.split(".").length === 3 ? read.auth : "";
  return { host, token };
}

function client(timeout: number) {
  const { host, token } = analyticsSession();
  if (!token) {
    throw new Error("Analytics session is missing. Sign in again, then open Email Complaint.");
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
