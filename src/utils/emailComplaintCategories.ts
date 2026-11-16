export type EmailClassKind = "query" | "complaint";

export type EmailClassOption = {
  category: string;
  type: string;
  typical: string;
};

const QUERY_OPTIONS: EmailClassOption[] = [
  { category: "Booking", type: "Booking confirmation not received", typical: "Customer requests confirmation/screenshot." },
  { category: "Booking", type: "Booking ID or status inquiry", typical: "Asks if booking is confirmed/active." },
  { category: "Booking", type: "Driver details inquiry", typical: "Asks when driver details will be shared." },
  { category: "Address", type: "Pickup/drop address or pincode correction", typical: "Requests address update or verification." },
  { category: "Vehicle", type: "Vehicle category/model confirmation", typical: "Asks which vehicle is booked/assigned." },
  { category: "Schedule", type: "Pickup date/time confirmation", typical: "Confirms scheduled pickup details." },
  { category: "Airport", type: "Terminal/pickup point inquiry", typical: "Asks about airport terminal or meeting point." },
  { category: "Changes", type: "Reschedule booking", typical: "Requests change in pickup date/time." },
  { category: "Changes", type: "Change pickup/drop location", typical: "Requests address or route change." },
  { category: "Changes", type: "Add stop / route modification", typical: "Requests extra stop or itinerary change." },
  { category: "Changes", type: "Vehicle category change", typical: "Requests sedan/SUV/EV etc." },
  { category: "Cancellation", type: "Cancellation request", typical: "Asks to cancel booking." },
  { category: "Cancellation", type: "Cancellation status inquiry", typical: "Checks whether cancellation is complete." },
  { category: "Fare", type: "Fare breakdown inquiry", typical: "Asks about fare components/inclusions." },
  { category: "Fare", type: "Toll/parking/tax clarification", typical: "Asks if extra charges are included." },
  { category: "Payment", type: "Payment mode inquiry", typical: "Asks about UPI/PhonePe/card/cash." },
  { category: "Payment", type: "Advance/prepaid payment confirmation", typical: "Checks whether advance was received." },
  { category: "Invoice", type: "Invoice/receipt request", typical: "Requests tax invoice or payment receipt." },
  { category: "Refund", type: "Refund status inquiry", typical: "Asks when refund will be credited." },
  { category: "Offers", type: "Cashback/coupon/promo inquiry", typical: "Asks about eligibility or redemption." },
  { category: "Ride", type: "Driver contact/arrival status", typical: "Asks to contact driver or check arrival." },
  { category: "Ride", type: "Pickup instructions/meeting point", typical: "Asks where to meet the driver." },
  { category: "Ride", type: "Waiting time/flight delay policy", typical: "Asks about waiting or flight delay." },
  { category: "Ride", type: "Luggage capacity/vehicle suitability", typical: "Checks whether luggage will fit." },
  { category: "Post-trip", type: "Trip completion confirmation", typical: "Checks trip completion status." },
  { category: "Post-trip", type: "Travel history/trip details request", typical: "Requests ride details/history." },
  { category: "Post-trip", type: "Feedback/rating query", typical: "Asks how to submit feedback." },
  { category: "Lost & Found", type: "Lost item inquiry", typical: "Reports an item left in cab." },
  { category: "Service", type: "Service availability in city/area", typical: "Checks whether service is available." },
  { category: "App Support", type: "Booking process/app assistance", typical: "Requests help using the app." },
];

const COMPLAINT_OPTIONS: EmailClassOption[] = [
  { category: "Driver/Pickup", type: "Driver no-show", typical: "Driver did not arrive." },
  { category: "Driver/Pickup", type: "Driver delayed / late arrival", typical: "Driver arrived after scheduled time." },
  { category: "Driver/Pickup", type: "Driver unreachable / phone switched off", typical: "Customer could not contact driver." },
  { category: "Driver/Pickup", type: "Driver refused trip / cancelled", typical: "Driver refused or cancelled ride." },
  { category: "Driver/Pickup", type: "Rude / unprofessional driver behaviour", typical: "Customer reports misconduct." },
  { category: "Driver/Pickup", type: "Driver asked customer to cancel", typical: "Driver requested customer cancellation." },
  { category: "Driver/Pickup", type: "Wrong pickup location", typical: "Driver reached incorrect location." },
  { category: "Driver/Pickup", type: "Pickup not completed", typical: "Pickup failed despite driver arrival/coordination." },
  { category: "Vehicle", type: "Dirty/dusty/unclean vehicle", typical: "Vehicle cleanliness below expectations." },
  { category: "Vehicle", type: "Bad smell inside cab", typical: "Customer reports unpleasant smell." },
  { category: "Vehicle", type: "Wrong vehicle provided", typical: "Vehicle differs from booked category/model." },
  { category: "Vehicle", type: "Poor vehicle condition", typical: "Maintenance/condition issue reported." },
  { category: "Vehicle", type: "AC not working / non-AC cab provided", typical: "AC issue or vehicle mismatch." },
  { category: "Vehicle", type: "insufficient luggage space", typical: "Luggage did not fit." },
  { category: "Fare/Payment", type: "Extra amount collected by driver", typical: "Driver charged more than confirmed fare." },
  { category: "Fare/Payment", type: "Duplicate payment / prepaid amount collected again", typical: "Customer was charged twice." },
  { category: "Fare/Payment", type: "Fare mismatch / dynamic fare dispute", typical: "Customer disputes fare." },
  { category: "Fare/Payment", type: "Unauthorized toll/parking/waiting charge", typical: "Customer disputes extra charge." },
  { category: "Fare/Payment", type: "Refund delayed / not received", typical: "Expected refund has not arrived." },
  { category: "Fare/Payment", type: "Cashback/coupon not credited", typical: "Promised offer was not received." },
  { category: "Booking/Service", type: "Booking cancelled without consent", typical: "Booking cancelled without customer request." },
  { category: "Booking/Service", type: "Cab unavailable after confirmation", typical: "Partner could not provide confirmed cab." },
  { category: "Booking/Service", type: "Incorrect booking details/address", typical: "Booking details are inaccurate." },
  { category: "Booking/Service", type: "Trip marked completed but ride not done", typical: "System status differs from actual trip." },
  { category: "Booking/Service", type: "Wrong terminal/drop location", typical: "Customer directed/dropped at wrong location." },
  { category: "Booking/Service", type: "Flight missed due to cab issue", typical: "Customer alleges cab failure caused missed flight." },
  { category: "Booking/Service", type: "Alternate cab arranged at extra cost", typical: "Customer incurred cost for another cab." },
  { category: "Support", type: "Poor customer support / agent did not assist", typical: "Customer unhappy with support handling." },
  { category: "Support", type: "No response / complaint unresolved", typical: "Customer reports lack of timely response." },
  { category: "Invoice", type: "Invoice missing / incorrect", typical: "Invoice not received or has wrong details." },
  { category: "Safety/Conduct", type: "Unsafe/rash driving", typical: "Customer reports unsafe driving." },
  { category: "Safety/Conduct", type: "Inappropriate driver conduct", typical: "Customer reports concerning interaction." },
  { category: "Lost & Found", type: "Lost item not returned", typical: "Lost property recovery issue." },
  { category: "Safety/Conduct", type: "Harassment/discrimination allegation", typical: "Customer reports harassment/discrimination." },
];

export const EMAIL_CLASS_OPTIONS: Record<EmailClassKind, EmailClassOption[]> = {
  query: QUERY_OPTIONS,
  complaint: COMPLAINT_OPTIONS,
};

const SEPARATOR = " | ";

export type ParsedEmailClassification = {
  kind: EmailClassKind;
  kindLabel: "Query" | "Complaint";
  category: string;
  type: string;
  typical: string;
  tag: string;
};

export function encodeEmailClassification(kind: EmailClassKind, category: string, type: string) {
  const kindLabel = kind === "query" ? "Query" : "Complaint";
  return `${kindLabel}${SEPARATOR}${category}${SEPARATOR}${type}`;
}

export function parseEmailClassification(tag?: string | null): ParsedEmailClassification | null {
  const raw = String(tag || "").trim();
  const parts = raw.split(SEPARATOR);
  if (parts.length !== 3) return null;
  const [kindLabel, category, type] = parts;
  const kind = kindLabel === "Query" ? "query" : kindLabel === "Complaint" ? "complaint" : null;
  if (!kind || !category || !type) return null;
  const match = EMAIL_CLASS_OPTIONS[kind].find(
    (option) => option.category === category && option.type === type,
  );
  if (!match) return null;
  return {
    kind,
    kindLabel: kind === "query" ? "Query" : "Complaint",
    category,
    type,
    typical: match.typical,
    tag: encodeEmailClassification(kind, category, type),
  };
}

export function categoriesFor(kind: EmailClassKind) {
  const categories: string[] = [];
  for (const option of EMAIL_CLASS_OPTIONS[kind]) {
    if (!categories.includes(option.category)) categories.push(option.category);
  }
  return categories;
}

export function typesFor(kind: EmailClassKind, category: string) {
  return EMAIL_CLASS_OPTIONS[kind].filter((option) => option.category === category);
}

export type EmailClassGroup = {
  kind: EmailClassKind;
  category: string;
  label: string;
  options: Array<EmailClassOption & { value: string }>;
};

export function emailClassGroups(): EmailClassGroup[] {
  const groups: EmailClassGroup[] = [];
  (["query", "complaint"] as const).forEach((kind) => {
    const kindLabel = kind === "query" ? "Query" : "Complaint";
    categoriesFor(kind).forEach((category) => {
      groups.push({
        kind,
        category,
        label: `${kindLabel} · ${category}`,
        options: typesFor(kind, category).map((option) => ({
          ...option,
          value: encodeEmailClassification(kind, category, option.type),
        })),
      });
    });
  });
  return groups;
}

export type EmailClassFilter = {
  kind: "all" | "unclassified" | EmailClassKind;
  category: string;
};

export function emailClassFilterKey(filter: EmailClassFilter) {
  if (filter.kind === "all" || filter.kind === "unclassified") return filter.kind;
  return filter.category ? `${filter.kind}:${filter.category}` : filter.kind;
}

export function parseEmailClassFilter(key: string): EmailClassFilter {
  if (key === "unclassified" || key === "query" || key === "complaint") {
    return { kind: key, category: "" };
  }
  const splitAt = key.indexOf(":");
  if (splitAt > 0) {
    const kind = key.slice(0, splitAt);
    const category = key.slice(splitAt + 1);
    if ((kind === "query" || kind === "complaint") && category) return { kind, category };
  }
  return { kind: "all", category: "" };
}

export function emailClassFilterLabel(filter: EmailClassFilter) {
  if (filter.kind === "all") return "All classifications";
  if (filter.kind === "unclassified") return "Not classified";
  const kindLabel = filter.kind === "query" ? "Query" : "Complaint";
  return filter.category ? `${kindLabel} · ${filter.category}` : `All ${filter.kind === "query" ? "queries" : "complaints"}`;
}

export function matchesEmailClassification(tag: string | undefined, filter: EmailClassFilter) {
  if (filter.kind === "all" && !filter.category) return true;
  const parsed = parseEmailClassification(tag);
  if (filter.kind === "unclassified") return !parsed;
  if (!parsed) return false;
  if (filter.kind !== "all" && parsed.kind !== filter.kind) return false;
  if (filter.category && parsed.category !== filter.category) return false;
  return true;
}
