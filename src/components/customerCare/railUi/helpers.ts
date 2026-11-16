export function defaultStartDatetimeLocal() {
  const when = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

/** Default RailYatri-style search body — pick places via Google to fill lat/lng. */
export function defaultRailPayload() {
  return {
    sourceName: "",
    sourceAddress: "",
    sourceLatitude: null,
    sourceLongitude: null,
    sourceCity: "",
    sourceState: "",
    destinationName: "",
    destinationAddress: "",
    destinationLatitude: null,
    destinationLongitude: null,
    destinationCity: "",
    destinationState: "",
    startDatetime: defaultStartDatetimeLocal(),
    cityCode: "DEL",
    travelType: "departure",
    journeyType: "RENTAL",
    kilometer: 0,
    duration: 0,
  };
}

export function formatInr(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const hasFraction = Math.abs(amount % 1) > 0.001;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

export function fareAmount(fare: any) {
  return Number(fare?.fare != null ? fare.fare : fare?.amount) || 0;
}

/** Stage and RailYatri confirm full and partial pay with the quoted amount. */
export function partnerConfirmsQuotedAmount(partner: string) {
  const key = (partner.startsWith("bac_") ? "bac" : partner).trim().toLowerCase();
  return key === "stage" || key === "railyatri";
}

/**
 * paymentConfirmation amount. Full uses fare-search `fare`; partial uses `partial`.
 * Returned as a string, e.g. "641.15" or "199".
 */
export function quotedPaymentAmount(fare: any, mode: "full" | "partial") {
  const raw = mode === "partial" ? fare?.partial : fare?.fare;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return String(amount);
}

export type JourneyType = "AIRPORT" | "OUTSTATION" | "RENTAL" | "LOCAL";
export const JOURNEY_TYPES: JourneyType[] = [
  "AIRPORT",
  "OUTSTATION",
  "RENTAL",
  "LOCAL",
];

export const PAYMENT_MODES = [
  { value: "full", label: "Full" },
  { value: "partial", label: "Partial" },
  { value: "cash", label: "Cash" },
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number]["value"];
export type RailPaymentMode = PaymentMode;

function positiveAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** Advance collected now. Absent when the quote does not offer partial pay. */
export function partialAmount(fare: any) {
  return positiveAmount(fare?.partial);
}

/** Balance payable to the driver. Falls back to fare − partial. */
export function remainingAmount(fare: any) {
  const explicit = Number(fare?.remainingAmount);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const advance = partialAmount(fare);
  if (advance == null) return null;
  return Math.max(fareAmount(fare) - advance, 0);
}

/** Partial is a real choice only when the advance is less than the full fare. */
export function offersPartialPayment(fare: any) {
  const advance = partialAmount(fare);
  if (advance == null) return false;
  return advance < fareAmount(fare);
}

/** Cash is offered when fare-search marks the quote as cash-eligible. */
export function offersCashPayment(fare: any) {
  const cash = fare?.cash;
  return cash === true || cash === 1 || cash === "1" || String(cash).toLowerCase() === "true";
}

/** Full is always available; partial and cash only when the quote includes them. */
export function availablePaymentModes(fare: any) {
  return PAYMENT_MODES.filter((mode) => {
    if (mode.value === "full") return true;
    if (mode.value === "partial") return offersPartialPayment(fare);
    return offersCashPayment(fare);
  });
}

export function partialPercentLabel(fare: any) {
  const pct = Number(fare?.partialPercentage);
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return "";
  const rounded = Math.abs(pct % 1) < 0.05 ? Math.round(pct) : Math.round(pct * 10) / 10;
  return `${rounded}% now`;
}

export function fuelOf(fare: any) {
  return (
    fare?.fuelType ||
    fare?.extraDetails?.fuelType ||
    fare?.features?.fuelType ||
    fare?.partnerResponse?.combustion_type ||
    null
  );
}

/** Mirrors IndigoCab enums SEAT_CAPACITY_MAP / LUGGAGE_CAPACITY_MAP defaults. */
function vehicleCapacityDefaults(vehicleType: unknown, fuelType: unknown) {
  const vehicle = String(vehicleType || "").trim().toUpperCase();
  const fuel = String(fuelType || "PETROL").trim().toUpperCase();
  const isCng = fuel.includes("CNG");
  if (vehicle === "SUV") return { seats: "5", bags: "3" };
  if (vehicle === "SEDAN") return { seats: "4", bags: "2" };
  if (vehicle === "HATCHBACK" || vehicle === "HATCH BACK") {
    return { seats: "3", bags: isCng ? "1" : "2" };
  }
  return { seats: "4", bags: "2" };
}

export function seatsOf(fare: any) {
  const fromApi =
    fare?.seats ??
    fare?.seatingCapacity ??
    fare?.extraDetails?.seatCapacity ??
    fare?.partnerResponse?.pax_capacity ??
    null;
  if (fromApi != null && fromApi !== "") return String(fromApi);
  return vehicleCapacityDefaults(fare?.vehicleType, fuelOf(fare)).seats;
}

export function luggageOf(fare: any) {
  const fromApi =
    fare?.luggageCapacity ??
    fare?.extraDetails?.luggageCapacity ??
    fare?.partnerResponse?.luggage_capacity ??
    null;
  if (fromApi != null && fromApi !== "") return String(fromApi);
  return vehicleCapacityDefaults(fare?.vehicleType, fuelOf(fare)).bags;
}

export function normalizeVehicleType(vehicleType: unknown): "Hatchback" | "Sedan" | "SUV" | "Other" {
  const normalized = String(vehicleType ?? "").trim().toLowerCase();
  if (normalized === "suv") return "SUV";
  if (normalized === "sedan") return "Sedan";
  if (normalized === "hatchback" || normalized === "hatch back") return "Hatchback";
  return "Other";
}

export function cabHeading(fare: any) {
  const vehicle = normalizeVehicleType(fare?.vehicleType);
  if (vehicle !== "Other") return vehicle;
  return String(fare?.title || fare?.cabPartner || "Cab");
}

export function formatTripDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTripTime(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTripDateTime(value: unknown) {
  const date = formatTripDate(value);
  const time = formatTripTime(value);
  if (!date && !time) return "";
  if (!date) return time;
  if (!time) return date;
  return `${date}, ${time}`;
}

export function formatDuration(minutes: unknown) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h <= 0) return `~${m}m`;
  if (m <= 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}

export function shortPlace(name: unknown) {
  const text = String(name || "").trim();
  if (!text) return "—";
  return text.split(",")[0]?.trim() || text;
}

export function serializedRows(value: unknown): { label: string; value: string; key?: string }[] {
  if (Array.isArray(value)) {
    return value
      .filter((row) => row && (row.label != null || row.value != null))
      .map((row) => ({
        label: String(row.label ?? ""),
        value: String(row.value ?? ""),
        key: row.key != null ? String(row.key) : undefined,
      }));
  }
  if (typeof value === "string") {
    try {
      return serializedRows(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export function featureLines(fare: any): string[] {
  const map = fare?.featuresDisplayMap;
  if (map && typeof map === "object" && !Array.isArray(map)) {
    return Object.entries(map)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`);
  }
  const features = fare?.features;
  if (features && typeof features === "object" && !Array.isArray(features)) {
    return Object.entries(features)
      .filter(([, v]) => v != null && v !== "" && v !== false)
      .map(([k, v]) => (v === true ? k : `${k}: ${v}`));
  }
  const lines: string[] = [];
  if (fare?.fuelType) lines.push(`Fuel: ${fare.fuelType}`);
  if (fare?.subcategory) lines.push(`Category: ${fare.subcategory}`);
  if (fare?.cabUSP?.text) lines.push(String(fare.cabUSP.text));
  return lines;
}

export function apiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function isApiFailure(response: any) {
  const status = String(response?.status || "").toLowerCase();
  return status === "failure" || status === "error";
}

export function orderIdOf(response: any) {
  const data = response?.data;
  return String(data?.order_id || data?.bookingId || "").trim();
}

export function paymentLinkOf(response: any) {
  const data = response?.data;
  return String(data?.payment_links?.web || data?.short_url || "").trim();
}

export function bookingPageUrl(partner: string, orderId: string) {
  const prefix = partner.startsWith("bac_") ? "bac" : partner.toLowerCase();
  return `/dashboard/customerCare/HandleBooking?bookingId=${prefix}-${orderId}`;
}

export const NAME_PATTERN = /^[A-Za-z ]+$/;
export const MOBILE_PATTERN = /^\+?[1-9]\d{7,14}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RAIL_PRIMARY = "#00529B";
export const RAIL_PRIMARY_DARK = "#004085";
