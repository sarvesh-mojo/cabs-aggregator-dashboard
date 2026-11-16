const BOOKING_ID_PREFIXES = ["JCRWE", "JCRAN", "TVIP", "YTRAN"];
const MIN_BOOKING_ID_LEN = 15;
const MAX_BOOKING_ID_LEN = 28;
const PLAUSIBLE_BOOKING_ID_REGEX = /\b(?:JCRWE|JCRAN|TVIP|YTRAN)[A-Z0-9]{10,23}\b/gi;
const MOBILE_REGEX = /(?:\+91[\s-]?)?([6-9]\d{9})\b/g;

export type ComplaintLookup = {
  bookingId: string | null;
  mobile: string | null;
  lookupKey: string | null;
  lookupType: "bookingId" | "mobile" | null;
};

export function isPlausibleBookingId(id?: string | null) {
  if (!id) return false;
  const upper = String(id).trim().toUpperCase();
  if (upper.length < MIN_BOOKING_ID_LEN || upper.length > MAX_BOOKING_ID_LEN) {
    return false;
  }
  if (!/^[A-Z0-9]+$/.test(upper) || !/\d/.test(upper)) return false;
  return BOOKING_ID_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

export function extractBookingId(message?: string | null) {
  const trimmed = String(message || "").trim();
  if (isPlausibleBookingId(trimmed)) return trimmed.toUpperCase();
  const matches = [...trimmed.matchAll(PLAUSIBLE_BOOKING_ID_REGEX)].map((match) =>
    match[0].toUpperCase(),
  );
  return matches.length ? matches[matches.length - 1] : null;
}

export function normalizeMobile(value?: string | null) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) {
    const last = digits.slice(-10);
    return /^[6-9]/.test(last) ? last : null;
  }
  return null;
}

export function extractMobile(message?: string | null) {
  const matches = [...String(message || "").matchAll(MOBILE_REGEX)];
  if (!matches.length) return null;
  return matches[matches.length - 1][1];
}

/** Prefer a booking ID written in the email. Otherwise use the mobile number. */
export function resolveComplaintLookup(
  hint?: string | null,
  complaintText?: string | null,
  mobileHint?: string | null,
): ComplaintLookup {
  const trimmedHint = String(hint || "").trim();
  let bookingId: string | null = null;
  let mobile: string | null = null;

  if (trimmedHint) {
    if (isPlausibleBookingId(trimmedHint)) {
      bookingId = trimmedHint.toUpperCase();
    } else {
      const asMobile = normalizeMobile(trimmedHint);
      if (asMobile) mobile = asMobile;
      else {
        const fromHint = extractBookingId(trimmedHint);
        if (fromHint) bookingId = fromHint;
      }
    }
  }

  if (!bookingId) bookingId = extractBookingId(complaintText);
  if (!mobile) mobile = extractMobile(complaintText) || normalizeMobile(mobileHint);

  if (bookingId && mobile && bookingId.includes(mobile)) {
    const withoutId = String(complaintText || "").replace(new RegExp(bookingId, "ig"), "");
    mobile = extractMobile(withoutId) || normalizeMobile(mobileHint);
    if (mobile && bookingId.includes(mobile)) mobile = null;
  }

  const lookupKey = bookingId || mobile || null;
  const lookupType = bookingId ? "bookingId" : mobile ? "mobile" : null;
  return { bookingId, mobile, lookupKey, lookupType };
}

export function emailPreview(text?: string | null, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

function compactBase64(value: string) {
  return value.replace(/\s+/g, "");
}

function looksLikeBase64(value: string) {
  const compact = compactBase64(value);
  if (compact.length < 48 || compact.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

function decodeBase64Text(value: string) {
  try {
    const binary = atob(compactBase64(value));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0)),
    );
    if (!decoded || decoded.includes("\u0000")) return "";
    return decoded;
  } catch {
    return "";
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[\s\S]*$/gi, "\n")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table|hr)>/gi, "\n")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripQuotedThread(text: string) {
  let out = text.replace(/\[(?:image|cid|photo|logo)[^\]]*\]/gi, " ");
  const wrote = out.match(/\sOn\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+\w+\s+\d{1,2},?\s+\d{4}[\s\S]*?\bwrote:\s*/i);
  if (wrote && wrote.index != null && wrote.index > 12) {
    out = out.slice(0, wrote.index);
  }
  out = out
    .split(/\r?\n/)
    .filter((line) => !/^\s*>/.test(line))
    .join("\n")
    .replace(/(?:^|\s)>(?:\s|$)/g, " ");
  return out;
}

function restoreBreaks(text: string) {
  if (text.includes("\n")) return text;
  return text
    .replace(/\s+(Regards|Thanks|Thank you|Best regards)\b/gi, "\n\n$1")
    .replace(/\s+(Hello|Hi|Dear)\s+(CC Team|Team|[A-Z])/g, "\n\n$1 $2");
}

/** Decode MIME blobs and split quoted threads so agents can read the latest reply. */
export function formatComplaintEmailBody(raw?: string | null) {
  let text = String(raw || "");
  if (!text.trim()) return "";
  if (/<[a-z][\s\S]*?>/i.test(text)) text = htmlToText(text);
  else if (looksLikeBase64(text)) text = decodeBase64Text(text) || text;
  text = restoreBreaks(stripQuotedThread(text));
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isNpsNoReplyEmail(thread?: { customerEmail?: string | null; subject?: string | null } | null) {
  const sender = String(thread?.customerEmail || "").trim().toLowerCase();
  if (sender === "no-reply@bookairportcab.com" || sender === "noreply@bookairportcab.com") return true;
  return /customer feedback alert/i.test(String(thread?.subject || ""));
}

export function inboundEmailBody(thread?: { messages?: Array<{ direction?: string; bodyText?: string }> } | null) {
  const messages = thread?.messages || [];
  const inbound = messages.find((message) => message.direction === "inbound");
  return formatComplaintEmailBody(inbound?.bodyText || messages[0]?.bodyText || "");
}

export type PartnerContact = {
  key: string;
  name: string;
  email: string;
  cc: string[];
  phone: string;
  aliases: string[];
};

const UNKNOWN_PARTNER: PartnerContact = {
  key: "UNKNOWN",
  name: "Unknown partner",
  email: "",
  cc: [],
  phone: "",
  aliases: [],
};

/**
 * Cab-partner escalation directory.
 * An empty email means the executive types the To address.
 * CC stays empty until the executive adds one.
 */
const PARTNER_CONTACTS: PartnerContact[] = [
  { key: "GOZOCABS", name: "Gozo Cabs", email: "info@gozocabs.com", cc: [], phone: "70035 64749", aliases: ["GOZO", "GOZOCABS"] },
  { key: "EVERA", name: "Evera", email: "Airportbookings@eprakriti.com", cc: [], phone: "96504 00144", aliases: ["EVERA"] },
  { key: "WTICABS", name: "WTi Cabs", email: "support.booking@wti.co.in", cc: [], phone: "9266627721", aliases: ["WTI", "WTICABS"] },
  { key: "REFEX", name: "Refex", email: "customersupport@refex.co.in", cc: [], phone: "7305077276", aliases: ["REFEX"] },
  { key: "MERU", name: "Meru", email: "mobilityfeedback@mahindralogistics.com", cc: [], phone: "8970489704", aliases: ["MERU"] },
  { key: "TAXIBAZAAR", name: "TaxiBazaar", email: "escalations@taxibazaar.in", cc: [], phone: "7837232383", aliases: ["TAXIBAZAAR", "TAXIBAZAR"] },
  { key: "WAVECABS", name: "Waves", email: "wavescab@gmail.com", cc: [], phone: "7411441101", aliases: ["WAVE", "WAVES", "WAVECABS"] },
  { key: "RIDEALLY", name: "RideAlly", email: "admin@rideally.com", cc: [], phone: "9620887298", aliases: ["RIDEALLY"] },
  { key: "QUICKRIDE", name: "QuickRide", email: "Support@quickride.in", cc: [], phone: "080 4709 1628", aliases: ["QUICKRIDE"] },
  { key: "BLUSKY", name: "BluSky", email: "", cc: [], phone: "9903935508", aliases: ["BLUSKY"] },
  { key: "CARZONRENT", name: "Carzonrent", email: "reserve@carzonrent.com", cc: [], phone: "99713 99355", aliases: ["CARZONRENT"] },
  { key: "TAXIDA", name: "Taxida", email: "Bookings@taxida.in", cc: [], phone: "918939292000", aliases: ["TAXIDA"] },
  { key: "GOAMILES", name: "GoaMiles", email: "", cc: [], phone: "", aliases: ["GOAMILES"] },
  { key: "SHOFFR", name: "Shoffr", email: "delhi.helpdesk@shoffr.in", cc: [], phone: "7204342323", aliases: ["SHOFFR"] },
  { key: "COMMUTEC", name: "Commutec", email: "traveldesk@commutec.in", cc: [], phone: "9056058033", aliases: ["COMMUTEC"] },
  { key: "CHOIS", name: "Chois", email: "", cc: [], phone: "", aliases: ["CHOIS"] },
  { key: "TRAVELVIP", name: "Travel VIP", email: "admin@travelvip.ai", cc: [], phone: "9028899368", aliases: ["TRAVELVIP"] },
  { key: "BLUECAB", name: "BluCabs", email: "saurabh@bluecab.in", cc: [], phone: "", aliases: ["BLUECAB", "BLUCABS", "BLUCAB"] },
  { key: "BETMOBILITY", name: "Betmobility", email: "ops@betmobility.com", cc: [], phone: "", aliases: ["BETMOBILITY"] },
  { key: "PVRYDE", name: "Pvryde", email: "", cc: [], phone: "", aliases: ["PVRYDE", "PVRRYDE"] },
  { key: "HYBRIDFM", name: "HybridFM", email: "", cc: [], phone: "", aliases: ["HYBRIDFM"] },
  { key: "MILODRIVE", name: "Milodrive", email: "", cc: [], phone: "", aliases: ["MILODRIVE"] },
  { key: "PLUSMILES", name: "PlusMiles", email: "ridewithus@plushmiles.com", cc: [], phone: "", aliases: ["PLUSMILES", "PLUSHMILES"] },
  { key: "KANGAROOCABS", name: "Kangaroo Cabs", email: "", cc: [], phone: "", aliases: ["KANGAROOCABS", "KANGAROOCARS", "KANGAROO"] },
  { key: "GRELCABS", name: "Grel Cabs", email: "", cc: [], phone: "", aliases: ["GRELCABS", "GREL"] },
  { key: "NANDICABS", name: "Nandi Cabs", email: "", cc: [], phone: "", aliases: ["NANDICABS", "NANDI"] },
  { key: "GOCABS", name: "GoCabs", email: "", cc: [], phone: "", aliases: ["GOCABS"] },
  { key: "GOGREEN", name: "GoGreen", email: "", cc: [], phone: "", aliases: ["GOGREEN", "GOGREENCABS"] },
];

function partnerCode(value?: string | null) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function aliasRank(contact: PartnerContact) {
  return contact.aliases.reduce((longest, alias) => Math.max(longest, partnerCode(alias).length), 0);
}

function matchesCode(contact: PartnerContact, code: string) {
  return contact.aliases.some((alias) => {
    const token = partnerCode(alias);
    if (!token) return false;
    return code === token || code.startsWith(token) || (token.length >= 4 && code.includes(token));
  });
}

function unknownPartner(cabPartner?: string | null): PartnerContact {
  const code = partnerCode(cabPartner);
  if (!code) return UNKNOWN_PARTNER;
  return { ...UNKNOWN_PARTNER, key: code, name: String(cabPartner || "").trim() || code };
}

/** Match a booking cabPartner such as GOZOCABS or SIG-EVERA to the directory. */
export function resolvePartnerContact(cabPartner?: string | null): PartnerContact {
  const code = partnerCode(cabPartner);
  if (!code) return UNKNOWN_PARTNER;
  const matches = PARTNER_CONTACTS.filter((contact) => matchesCode(contact, code)).sort(
    (a, b) => aliasRank(b) - aliasRank(a),
  );
  return matches[0] || unknownPartner(cabPartner);
}

export function listPartnerContacts() {
  return [...PARTNER_CONTACTS].sort((a, b) => a.name.localeCompare(b.name));
}

export function partnerContactByKey(key?: string | null) {
  const code = partnerCode(key);
  return PARTNER_CONTACTS.find((contact) => contact.key === code) || null;
}

function mentionsToken(text: string, token: string) {
  const trimmed = token.trim();
  if (trimmed.length < 4) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, "i").test(text);
}

/** Find a directory partner named in the subject or body when the booking has no partner. */
export function matchPartnerInText(text?: string | null): PartnerContact | null {
  const source = String(text || "");
  if (!source.trim()) return null;
  const matches = PARTNER_CONTACTS.filter((contact) => {
    if (contact.email && source.toLowerCase().includes(contact.email.toLowerCase())) return true;
    if (mentionsToken(source, contact.name)) return true;
    return contact.aliases.some((alias) => mentionsToken(source, alias));
  }).sort((a, b) => aliasRank(b) - aliasRank(a));
  return matches[0] || null;
}

/** Booking partner wins. Otherwise use a partner name written in the email. */
export function resolvePartnerForComplaint(cabPartner?: string | null, text?: string | null) {
  const fromBooking = resolvePartnerContact(cabPartner);
  if (fromBooking.key !== "UNKNOWN" && PARTNER_CONTACTS.some((contact) => contact.key === fromBooking.key)) {
    return fromBooking;
  }
  return matchPartnerInText(text) || fromBooking;
}

export function parseEmailList(value?: string | null) {
  return String(value || "")
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

export function buildPartnerDraft({
  subject,
  bodyText,
  partnerName,
  bookingIds,
  customerName,
  customerMobile,
}: {
  subject?: string;
  bodyText?: string;
  partnerName?: string;
  bookingIds?: string[];
  customerName?: string;
  customerMobile?: string;
}) {
  const who = [customerName, customerMobile].filter(Boolean).join(" · ");
  const ids = (bookingIds || []).filter(Boolean);
  const bookingLine = ids.length
    ? `Booking${ids.length > 1 ? "s" : ""}: ${ids.join(", ")}`
    : "Booking: not found in booking logs";
  const excerpt = String(bodyText || "").trim().slice(0, 1200);

  return [
    `Hello${partnerName ? ` ${partnerName}` : ""},`,
    "",
    "A customer complaint needs your review.",
    bookingLine,
    who ? `Customer: ${who}` : "",
    subject ? `Subject: ${subject}` : "",
    "",
    "Complaint:",
    excerpt || "(no message body)",
    "",
    "Please investigate and share an update with us.",
    "",
    "Mojo Support Team",
    "Book Airport Cab",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
