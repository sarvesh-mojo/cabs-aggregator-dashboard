import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSelector } from "react-redux";
import { FaStar } from "react-icons/fa";
import { FiClock, FiEdit2, FiInfo } from "react-icons/fi";
import { HiCheckCircle } from "react-icons/hi";
import { MdAirlineSeatReclineNormal, MdDirectionsCar, MdLuggage } from "react-icons/md";
import { PiLeafFill } from "react-icons/pi";
import PageMeta from "../../../components/common/PageMeta";
import { PartnerTab } from "../../../components/common/PartnerTab";
import RailUiFareSearch from "../../../components/customerCare/railUi/RailUiFareSearch";
import {
  availablePaymentModes,
  JOURNEY_TYPES,
  PAYMENT_MODES,
  partnerConfirmsQuotedAmount,
  quotedPaymentAmount,
  type JourneyType,
  type PaymentMode,
} from "../../../components/customerCare/railUi/helpers";
import {
  OPS_FARE_SEARCH,
  OPS_PAYMENT_CONFIRMATION,
  OPS_PREBOOK,
} from "../../../config/customerCare/operationsApicall";
import {
  addOnTotal,
  availableAddOnServices,
} from "../../../utils/addOnServices";

type FareUiTheme = "MOJOUI" | "RAILUI";

function defaultStartDatetime() {
  const when = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

type AirportBody = {
  sourceName: string;
  sourceAddress: string;
  sourceLatitude: number;
  sourceLongitude: number;
  sourceCity: string;
  sourceState: string;
  destinationName: string;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationCity: string;
  destinationState: string;
  cityCode: string;
  travelType: "departure";
  journeyType: JourneyType;
  kilometer: number;
  duration: number;
};

const DELHI_AIRPORT: AirportBody = {
  sourceName:
    "Indira Gandhi International Airport - Terminal 3, New Delhi, Delhi, India",
  sourceAddress:
    "Indira Gandhi International Airport - Terminal 3, New Delhi, Delhi, India",
  sourceLatitude: 28.5562,
  sourceLongitude: 77.1,
  sourceCity: "Delhi",
  sourceState: "Delhi",
  destinationName: "Saket, New Delhi, Delhi, India",
  destinationAddress: "Saket, New Delhi, Delhi, India",
  destinationLatitude: 28.5245,
  destinationLongitude: 77.2066,
  destinationCity: "Delhi",
  destinationState: "Delhi",
  cityCode: "DEL",
  travelType: "departure",
  journeyType: "AIRPORT",
  kilometer: 14,
  duration: 35,
};

const AIRPORT_BODIES: Record<string, AirportBody> = {
  DEL: DELHI_AIRPORT,
  BLR: {
    sourceName:
      "Kempegowda International Airport, Devanahalli, Bengaluru, Karnataka, India",
    sourceAddress:
      "Kempegowda International Airport, Devanahalli, Bengaluru, Karnataka, India",
    sourceLatitude: 13.1986,
    sourceLongitude: 77.7066,
    sourceCity: "Bengaluru",
    sourceState: "Karnataka",
    destinationName: "MG Road, Bengaluru, Karnataka, India",
    destinationAddress: "MG Road, Bengaluru, Karnataka, India",
    destinationLatitude: 12.9756,
    destinationLongitude: 77.605,
    destinationCity: "Bengaluru",
    destinationState: "Karnataka",
    cityCode: "BLR",
    travelType: "departure",
    journeyType: "AIRPORT",
    kilometer: 35,
    duration: 55,
  },
  GOI: {
    sourceName: "Goa International Airport, Dabolim, Goa, India",
    sourceAddress: "Goa International Airport, Dabolim, Goa, India",
    sourceLatitude: 15.3808,
    sourceLongitude: 73.8314,
    sourceCity: "Goa",
    sourceState: "Goa",
    destinationName: "Panaji, Goa, India",
    destinationAddress: "Panaji, Goa, India",
    destinationLatitude: 15.4909,
    destinationLongitude: 73.8278,
    destinationCity: "Goa",
    destinationState: "Goa",
    cityCode: "GOI",
    travelType: "departure",
    journeyType: "AIRPORT",
    kilometer: 25,
    duration: 40,
  },
  CCU: {
    sourceName:
      "Netaji Subhas Chandra Bose International Airport, Kolkata, West Bengal, India",
    sourceAddress:
      "Netaji Subhas Chandra Bose International Airport, Kolkata, West Bengal, India",
    sourceLatitude: 22.6547,
    sourceLongitude: 88.4467,
    sourceCity: "Kolkata",
    sourceState: "West Bengal",
    destinationName: "Park Street, Kolkata, West Bengal, India",
    destinationAddress: "Park Street, Kolkata, West Bengal, India",
    destinationLatitude: 22.5535,
    destinationLongitude: 88.351,
    destinationCity: "Kolkata",
    destinationState: "West Bengal",
    cityCode: "CCU",
    travelType: "departure",
    journeyType: "AIRPORT",
    kilometer: 18,
    duration: 40,
  },
  MAA: {
    sourceName: "Chennai International Airport, Chennai, Tamil Nadu, India",
    sourceAddress: "Chennai International Airport, Chennai, Tamil Nadu, India",
    sourceLatitude: 12.9941,
    sourceLongitude: 80.1709,
    sourceCity: "Chennai",
    sourceState: "Tamil Nadu",
    destinationName: "T. Nagar, Chennai, Tamil Nadu, India",
    destinationAddress: "T. Nagar, Chennai, Tamil Nadu, India",
    destinationLatitude: 13.0418,
    destinationLongitude: 80.2341,
    destinationCity: "Chennai",
    destinationState: "Tamil Nadu",
    cityCode: "MAA",
    travelType: "departure",
    journeyType: "AIRPORT",
    kilometer: 14,
    duration: 35,
  },
  BOM: {
    sourceName:
      "Chhatrapati Shivaji Maharaj International Airport, Mumbai, Maharashtra, India",
    sourceAddress:
      "Chhatrapati Shivaji Maharaj International Airport, Mumbai, Maharashtra, India",
    sourceLatitude: 19.0896,
    sourceLongitude: 72.8656,
    sourceCity: "Mumbai",
    sourceState: "Maharashtra",
    destinationName: "Bandra West, Mumbai, Maharashtra, India",
    destinationAddress: "Bandra West, Mumbai, Maharashtra, India",
    destinationLatitude: 19.0596,
    destinationLongitude: 72.8295,
    destinationCity: "Mumbai",
    destinationState: "Maharashtra",
    cityCode: "BOM",
    travelType: "departure",
    journeyType: "AIRPORT",
    kilometer: 12,
    duration: 30,
  },
  PNQ: {
    sourceName: "Pune Airport, Pune, Maharashtra, India",
    sourceAddress: "Pune Airport, Pune, Maharashtra, India",
    sourceLatitude: 18.5822,
    sourceLongitude: 73.9197,
    sourceCity: "Pune",
    sourceState: "Maharashtra",
    destinationName: "Shivajinagar, Pune, Maharashtra, India",
    destinationAddress: "Shivajinagar, Pune, Maharashtra, India",
    destinationLatitude: 18.5308,
    destinationLongitude: 73.8475,
    destinationCity: "Pune",
    destinationState: "Maharashtra",
    cityCode: "PNQ",
    travelType: "departure",
    journeyType: "AIRPORT",
    kilometer: 14,
    duration: 35,
  },
};

type CabTestPartner = {
  name: string;
  airports: string[];
  anyCity?: boolean;
};

const CAB_TEST_PARTNERS: CabTestPartner[] = [
  { name: "GOZOCABS", airports: ["DEL"] },
  { name: "QUICKRIDE", airports: ["DEL"] },
  { name: "SIGNATURE", airports: ["DEL"], anyCity: true },
  { name: "GOAMILES", airports: ["GOI"] },
  { name: "WAVECABS", airports: ["BLR"] },
  { name: "TAXIBAZAAR", airports: ["DEL"] },
  { name: "WTICABS", airports: ["DEL"] },
  { name: "RIDEALLY", airports: ["BLR"] },
  { name: "MERU", airports: ["DEL"] },
  { name: "KANGAROOCARS", airports: ["DEL"] },
  { name: "CARZONRENT", airports: ["CCU"] },
  { name: "REFEX", airports: ["BLR"] },
  { name: "TAXIDA", airports: ["MAA"] },
  { name: "BETMOBILITY", airports: ["BLR"] },
  { name: "COMMUTEC", airports: ["BOM"] },
  { name: "MILODRIVE", airports: ["DEL", "BLR"] },
  { name: "HYBRIDFM", airports: ["DEL"] },
  { name: "GRELCABS", airports: ["PNQ"] },
  { name: "VIAVIP", airports: ["DEL"], anyCity: true },
];

function defaultPayload() {
  return JSON.stringify(
    {
      ...DELHI_AIRPORT,
      startDatetime: defaultStartDatetime(),
    },
    null,
    2
  );
}

function readStartDatetime(text: string) {
  try {
    const parsed = JSON.parse(text) as { startDatetime?: unknown };
    if (typeof parsed.startDatetime === "string" && parsed.startDatetime.trim()) {
      return parsed.startDatetime;
    }
  } catch {
    // Keep a fresh pickup time when the editor JSON is invalid.
  }
  return defaultStartDatetime();
}

function withJourneyType(
  body: Record<string, unknown>,
  journeyType: JourneyType
) {
  const next: Record<string, unknown> = { ...body, journeyType };
  const km = Number(next.kilometer);
  if (journeyType === "OUTSTATION") {
    next.journeyMode = "ONEWAY";
    if (!Number.isFinite(km) || km <= 70) {
      next.kilometer = 85;
      const duration = Number(next.duration);
      if (!Number.isFinite(duration) || duration < 120) next.duration = 120;
    }
  } else {
    delete next.journeyMode;
  }
  if (
    (journeyType === "LOCAL" || journeyType === "RENTAL") &&
    (!Number.isFinite(km) || km <= 0)
  ) {
    next.kilometer = 18;
    if (!Number(next.duration)) next.duration = 45;
  }
  return next;
}

function payloadForCabPartner(
  partnerName: string,
  airportCode: string | null,
  currentText: string,
  journeyType: JourneyType
) {
  const startDatetime = readStartDatetime(currentText);
  const airport =
    partnerName === "all" || !airportCode
      ? DELHI_AIRPORT
      : AIRPORT_BODIES[airportCode] || DELHI_AIRPORT;
  const body: Record<string, unknown> = {
    ...airport,
    startDatetime,
  };
  if (partnerName !== "all" && airportCode) {
    body.cabPartnerList = [partnerName];
  }
  return JSON.stringify(withJourneyType(body, journeyType), null, 2);
}

// Same codes as IndigoCab dto/mcpPartnerCodes.json. GOZO and GOZOCABS share code 1.
const MCP_PARTNER_CODES: Record<string, number> = {
  GOZO: 1,
  GOZOCABS: 1,
  QUICKRIDE: 2,
  SIGNATURE: 3,
  GOAMILES: 4,
  WAVECABS: 5,
  TAXIBAZAAR: 6,
  WTICABS: 7,
  RIDEALLY: 8,
  MERU: 9,
  MEGA: 10,
  EVERA: 11,
  KANGAROOCARS: 12,
  CARZONRENT: 13,
  REFEX: 14,
  VOZI: 15,
  ONDC: 16,
  TAXIDA: 17,
  SHOFFR: 18,
  BETMOBILITY: 19,
  BLUECAB: 20,
  COMMUTEC: 21,
  TRANSFERZ: 22,
  MOZIO: 23,
  TRAVELVIP: 24,
  MILODRIVE: 25,
  HYBRIDFM: 26,
  GRELCABS: 27,
};

const MCP_CODE_TO_PARTNERS: Record<number, string[]> = {};
for (const [name, code] of Object.entries(MCP_PARTNER_CODES)) {
  (MCP_CODE_TO_PARTNERS[code] ??= []).push(name);
}

function partnerKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function originalPartnerName(fare: any) {
  return String(fare?.originalPartner || fare?.extraDetails?.originalPartner || "").trim();
}

function mcpPartnerLabel(mcp: unknown) {
  const code = Number(mcp);
  const names = MCP_CODE_TO_PARTNERS[code];
  if (!names?.length) return "";
  return names.join(" / ");
}

function supplyPartnerLabel(fare: any) {
  return originalPartnerName(fare) || mcpPartnerLabel(fare?.extraDetails?.mcp ?? fare?.mcp);
}

function isSamePartner(label: string, cabPartner: unknown) {
  const cab = partnerKey(cabPartner);
  if (!cab || !label) return false;
  return label.split(" / ").some((name) => partnerKey(name) === cab);
}

function normalizeVehicleType(vehicleType: unknown) {
  const normalized = String(vehicleType ?? "").trim().toLowerCase();
  if (normalized === "suv") return "SUV";
  if (normalized === "sedan") return "Sedan";
  if (normalized === "hatchback" || normalized === "hatch back") return "Hatchback";
  return vehicleType ? "Other" : "Other";
}

function normalizeSubcategory(subcategory: unknown) {
  const normalized = String(subcategory ?? "").trim().toLowerCase();
  if (normalized === "premium") return "Premium";
  if (normalized === "economy") return "Economy";
  return "Other";
}

function fareAmount(fare: any) {
  return Number(fare?.amount != null ? fare.amount : fare?.fare) || 0;
}

function seatsOf(fare: any) {
  return (
    fare?.seats ||
    fare?.seatingCapacity ||
    fare?.extraDetails?.seatCapacity ||
    fare?.partnerResponse?.pax_capacity ||
    null
  );
}

function luggageOf(fare: any) {
  return (
    fare?.luggageCapacity ||
    fare?.extraDetails?.luggageCapacity ||
    fare?.partnerResponse?.luggage_capacity ||
    null
  );
}

function fuelOf(fare: any) {
  return (
    fare?.fuelType ||
    fare?.extraDetails?.fuelType ||
    fare?.features?.fuelType ||
    fare?.partnerResponse?.combustion_type ||
    null
  );
}

function formatInr(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const hasFraction = Math.abs(amount % 1) > 0.001;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

function countLabel(value: unknown, unit: string) {
  if (value == null || value === "") return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/[a-z]/i.test(text)) return text;
  return `${text} ${unit}`;
}

function isElectricFuel(fuel: unknown) {
  const text = String(fuel || "").toLowerCase();
  return text === "ev" || text.includes("electric");
}

function fuelBadge(fare: any) {
  const fuel = String(fuelOf(fare) || "").trim();
  const lower = fuel.toLowerCase();
  if (!fuel) return null;
  if (isElectricFuel(fuel)) return { label: "EV", className: "bg-emerald-600" };
  if (lower.includes("cng")) return { label: "CNG", className: "bg-teal-700" };
  if (lower.includes("petrol")) return { label: "Petrol", className: "bg-slate-700" };
  if (lower.includes("diesel")) return { label: "Diesel", className: "bg-slate-800" };
  return { label: fuel, className: "bg-slate-700" };
}

function cabHeading(fare: any) {
  const vehicle = normalizeVehicleType(fare.vehicleType);
  const premium = normalizeSubcategory(fare.subcategory) === "Premium";
  const electric = isElectricFuel(fuelOf(fare));
  if (vehicle !== "Other") {
    return `${premium ? "Premium " : ""}${vehicle}${electric ? " EV" : ""}`.trim();
  }
  return fare.title || fare.cabPartner || "Cab";
}

function promoTag(fare: any) {
  const tag = String(fare?.tag || "").trim();
  if (!tag || /no recommendation/i.test(tag)) return "";
  return tag;
}

function flatFiftyDiscount(fare: any) {
  const applied =
    fare?.flatFiftyOffApplied === true ||
    fare?.extraDetails?.flatFiftyOffApplied === true;
  if (!applied) return null;

  const rawAmount = Number(fare?.discountApplied ?? fare?.flatFiftyOffDiscount);
  const pct = Number(fare?.extraDetails?.discountPCT);
  const upto = Number(fare?.extraDetails?.discountUpto);
  const finalFare = Number(fare?.finalFare);

  return {
    amount: Number.isFinite(rawAmount) ? rawAmount : null,
    pct: Number.isFinite(pct) ? pct : null,
    upto: Number.isFinite(upto) ? upto : null,
    finalFare: Number.isFinite(finalFare) ? finalFare : null,
  };
}

function discountSummary(discount: NonNullable<ReturnType<typeof flatFiftyDiscount>>) {
  const parts: string[] = [];
  if (discount.amount != null && discount.amount !== 0) {
    parts.push(
      discount.amount > 0
        ? `−₹${formatInr(discount.amount)}`
        : `₹${formatInr(discount.amount)}`
    );
  }
  if (discount.pct != null) parts.push(`${discount.pct}% off`);
  if (discount.upto != null && discount.upto > 0) {
    parts.push(`up to ₹${formatInr(discount.upto)}`);
  }
  return parts.join(" · ");
}

function taxAndFee(fare: any) {
  const tax = Number(fare?.tax);
  const service = Number(fare?.serviceCharge ?? fare?.extraDetails?.serviceFees);
  const gst =
    Number(fare?.extraDetails?.gstOnRideFare || 0) +
    Number(fare?.extraDetails?.gstOnServiceFees || 0);
  const fee = Number.isFinite(service) && service > 0 ? service : 0;
  if (Number.isFinite(tax) && tax > 0) return tax + fee;
  if (gst > 0) return gst + fee;
  return null;
}

function payableFare(fare: any) {
  const discount = flatFiftyDiscount(fare);
  if (discount?.finalFare != null) return discount.finalFare;
  return fareAmount(fare);
}

function cardPrice(fare: any) {
  const listed = fareAmount(fare);
  const discount = flatFiftyDiscount(fare);
  const fee = taxAndFee(fare);
  const base = Number(fare?.baseFare);
  const discounted =
    discount?.finalFare != null && Math.abs(discount.finalFare - listed) > 0.5;
  const canSplitTax =
    !discounted &&
    fee != null &&
    fee > 0 &&
    Number.isFinite(base) &&
    base > 0 &&
    Math.abs(listed - (base + fee)) < 1;

  if (discounted) {
    return { headline: discount.finalFare as number, strike: listed, fee: null };
  }
  if (canSplitTax) {
    return { headline: base, strike: null, fee };
  }
  return { headline: listed, strike: null, fee: null };
}

function reviewSnippet(review: any) {
  return String(review?.preDefReview || review?.review || "").trim();
}

function reviewDotClass(rating: unknown) {
  const text = String(rating ?? "").trim();
  if (/^9-10|^9\b|^10\b/i.test(text)) return "bg-emerald-500";
  if (/^7-8|^7\b|^8\b/i.test(text)) return "bg-lime-400";
  if (/^0-6|^[0-6]\b/i.test(text)) return "bg-rose-400";
  const score = Number(text);
  if (score >= 9) return "bg-emerald-500";
  if (score >= 7) return "bg-lime-400";
  if (score >= 5) return "bg-amber-400";
  if (score > 0) return "bg-rose-400";
  return "bg-slate-300";
}

function formatClock(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} · ${time}`;
}

function dropClock(start: unknown, durationMin: unknown) {
  const date = new Date(String(start || ""));
  const minutes = Number(durationMin);
  if (Number.isNaN(date.getTime()) || !Number.isFinite(minutes)) return "";
  date.setMinutes(date.getMinutes() + minutes);
  return formatClock(date);
}

function journeyLabel(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "RIDE";
  if (/airport/i.test(text)) return "AIRPORT RIDE";
  return `${text.replace(/_/g, " ")} RIDE`.toUpperCase();
}

function displayEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).filter(
    ([, entry]) => entry != null && entry !== ""
  );
}

function CabOptionCard({
  fare,
  lowest,
  onBook,
}: {
  fare: any;
  lowest: boolean;
  onBook: (fare: any) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const price = cardPrice(fare);
  const partialRows = displayEntries(fare.fareDisplayPartial);
  const fullRows = displayEntries(fare.fareDisplayStr);
  const displayRows = displayEntries(fare.fareDisplay);
  const inclusions = Array.isArray(fare.inclusion) ? fare.inclusion : [];
  const exclusions = Array.isArray(fare.exclusion) ? fare.exclusion : [];
  const badge = fuelBadge(fare);
  const fuel = fuelOf(fare);
  const electric = isElectricFuel(fuel);
  const tag = promoTag(fare);
  const discount = flatFiftyDiscount(fare);
  const discountText = discount ? discountSummary(discount) : "";
  const supplyPartner = supplyPartnerLabel(fare);
  const reviews = Array.isArray(fare.recentReviews) ? fare.recentReviews : [];
  const reviewDots = reviews.slice(0, 5);
  const reviewLines = reviews
    .map((review: any) => reviewSnippet(review))
    .filter(Boolean)
    .slice(0, 3);
  const seats = countLabel(seatsOf(fare), "Seats");
  const bags = countLabel(luggageOf(fare), "Bags");
  const model = fare.model && fare.model !== "Unknown" ? fare.model : "";
  const rating = fare.rating != null && fare.rating !== "" ? Number(fare.rating) : null;

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex h-[88px] w-[132px] shrink-0 items-center justify-center">
          {fare.image ? (
            <img src={fare.image} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
              No image
            </div>
          )}
          {badge && (
            <span
              className={`absolute bottom-0 left-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        <div className="min-w-0 lg:w-[220px] lg:shrink-0">
          {tag && (
            <span className="mb-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              {tag}
            </span>
          )}
          <h3 className="text-[17px] font-semibold leading-tight text-slate-900">
            {cabHeading(fare)}
          </h3>
          {model && <p className="mt-0.5 text-sm text-slate-500">{model}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {seats && (
              <span className="inline-flex items-center gap-1">
                <MdAirlineSeatReclineNormal className="text-slate-400" />
                {seats}
              </span>
            )}
            {bags && (
              <span className="inline-flex items-center gap-1">
                <MdLuggage className="text-slate-400" />
                {bags}
              </span>
            )}
          </div>
          {fuel && (
            <p
              className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                electric ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              {electric && <PiLeafFill className="text-emerald-500" />}
              {fuel}
            </p>
          )}
          {fare.cabPartner && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {fare.cabPartner}
            </p>
          )}
          {supplyPartner && !isSamePartner(supplyPartner, fare.cabPartner) && (
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Original: {supplyPartner}
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
            Our Service Guarantees
            <FiInfo className="text-slate-400" title="Placeholder until guarantees come from fare search" />
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">
              <HiCheckCircle className="shrink-0 text-sm text-sky-600" />
              <span className="leading-tight">
                <span className="block text-[11px] font-semibold">Fare Lock</span>
                <span className="block text-[10px] font-normal text-sky-700">No extra charges</span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
              <MdDirectionsCar className="shrink-0 text-sm text-emerald-600" />
              <span className="leading-tight">
                <span className="block text-[11px] font-semibold">3X Pickup</span>
                <span className="block text-[10px] font-normal text-emerald-700">If we don't arrive</span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              <FaStar className="shrink-0 text-[11px] text-rose-500" />
              <span className="text-[11px] font-semibold leading-tight">
                100% Service
                <br />
                Assurance
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {rating != null && Number.isFinite(rating) && (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-amber-500">★</span>{" "}
                <span className="font-semibold text-slate-800">{rating.toFixed(1)}</span>
                {fare.ratingCount ? (
                  <span className="text-slate-400">
                    {" "}
                    ({new Intl.NumberFormat("en-IN").format(Number(fare.ratingCount) || 0)})
                  </span>
                ) : null}
              </p>
            )}
            {reviewDots.length > 0 && (
              <p className="inline-flex items-center gap-2 text-xs text-slate-400">
                Last 5 Rides
                <span className="inline-flex gap-1">
                  {reviewDots.map((review: any, index: number) => (
                    <span
                      key={`${review.bookingId || index}`}
                      className={`h-2.5 w-2.5 rounded-full ${reviewDotClass(review.rating)}`}
                    />
                  ))}
                </span>
              </p>
            )}
          </div>
          {(rating != null || reviewLines.length > 0) && (
            <p className="mt-0.5 text-[11px] text-slate-400">Recent reviews</p>
          )}
          {reviewLines.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {reviewLines.map((line: string) => (
                <p key={line} className="max-w-[220px] truncate text-xs text-slate-500">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:w-[148px] lg:shrink-0 lg:flex-col lg:items-end">
          <div className="text-right">
            <div className="text-[26px] font-semibold leading-none tracking-tight text-slate-900">
              ₹{formatInr(price.headline)}
            </div>
            {price.strike != null && (
              <p className="mt-1 text-xs text-slate-400 line-through">₹{formatInr(price.strike)}</p>
            )}
            {price.fee != null && (
              <p className="mt-1 text-[11px] text-slate-400">+ Tax & Fee ₹{formatInr(price.fee)}</p>
            )}
            {discountText && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-600">{discountText}</p>
            )}
            {lowest && (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Lowest
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap justify-end gap-1">
              {availablePaymentModes(fare).map((mode) => (
                <span
                  key={mode.value}
                  className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                >
                  {mode.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={() => onBook(fare)}
            >
              Select
            </button>
            <div className="flex gap-2 text-[11px] font-medium text-slate-500">
              <button
                type="button"
                className="hover:text-slate-800"
                onClick={() => setShowDetails((open) => !open)}
              >
                {showDetails ? "Hide details" : "Details"}
              </button>
              <button
                type="button"
                className="hover:text-slate-800"
                onClick={() => setShowJson((open) => !open)}
              >
                {showJson ? "Hide JSON" : "JSON"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showJson && (
        <pre
          className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-800 p-3 text-[11px] text-slate-100"
          onClick={(event) => event.stopPropagation()}
        >
          {JSON.stringify(fare, null, 2)}
        </pre>
      )}

      {showDetails && (
        <div
          className="mt-3 border-t border-dashed border-slate-200 pt-3 text-sm text-slate-600"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {fare.model && <p>Model: {fare.model}</p>}
            {fare.vehicleType && <p>Vehicle: {fare.vehicleType}</p>}
            {fare.subcategory && <p>Category: {fare.subcategory}</p>}
            {seatsOf(fare) && <p>Seats: {seatsOf(fare)}</p>}
            {luggageOf(fare) && <p>Luggage: {luggageOf(fare)}</p>}
            {fuelOf(fare) && <p>Fuel: {fuelOf(fare)}</p>}
            {fare.estimatedTime && <p>ETA: {fare.estimatedTime} mins</p>}
            <p>Provider: {fare.provider || fare.title || "—"}</p>
            {fare.poweredBy && <p>Powered By: {fare.poweredBy}</p>}
            {discount?.amount != null && <p>Discount: ₹{formatInr(discount.amount)}</p>}
            {discount?.pct != null && <p>Discount %: {discount.pct}</p>}
            {discount?.upto != null && <p>Discount up to: ₹{formatInr(discount.upto)}</p>}
            {discount?.finalFare != null && <p>Final fare: ₹{formatInr(discount.finalFare)}</p>}
            {supplyPartner && <p>Original partner: {supplyPartner}</p>}
          </div>

          {availableAddOnServices(fare).length > 0 && (
            <div className="mt-3">
              <p className="font-semibold text-slate-800">Add-on services</p>
              <ul className="ml-4 list-disc">
                {availableAddOnServices(fare).map((item) => (
                  <li key={item.name}>
                    {item.name}: ₹{formatInr(item.amount)}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">
                Selected add-ons are added to the fare at booking.
              </p>
            </div>
          )}

          {(inclusions.length > 0 || exclusions.length > 0) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {inclusions.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700">Inclusions</p>
                  <ul className="ml-4 list-disc">
                    {inclusions.map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {exclusions.length > 0 && (
                <div>
                  <p className="font-semibold text-red-600">Exclusions</p>
                  <ul className="ml-4 list-disc">
                    {exclusions.map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {partialRows.length > 0 && (
            <Breakdown title="Partial Pay Breakdown" rows={partialRows} tone="partial" />
          )}
          {fullRows.length > 0 && (
            <Breakdown title="Full Payment Breakdown" rows={fullRows} tone="full" />
          )}
          {displayRows.length > 0 && partialRows.length === 0 && fullRows.length === 0 && (
            <Breakdown title="Fare Breakdown" rows={displayRows} />
          )}

          {fare.isTravelVip && fare.extraDetails && (
            <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
              <p className="mb-2 font-semibold text-slate-800">Travel VIP Details</p>
              <p className="flex justify-between">
                <span>Original Fare</span>
                <strong className="text-red-600">₹{fare.extraDetails.originalFare}</strong>
              </p>
              <p className="flex justify-between">
                <span>Margin Earned</span>
                <strong className="text-green-700">₹{fare.extraDetails.marginEarned}</strong>
              </p>
              <p className="flex justify-between">
                <span>Capping Mode</span>
                <strong>{fare.extraDetails.cappingMode}</strong>
              </p>
              <p className="flex justify-between">
                <span>Difference Gap</span>
                <strong>{fare.extraDetails.gap}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Breakdown({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: [string, unknown][];
  tone?: "partial" | "full";
}) {
  const toneClass =
    tone === "partial"
      ? "border border-sky-200 bg-sky-50"
      : tone === "full"
        ? "border border-green-200 bg-green-50"
        : "bg-slate-50";
  return (
    <div className={`mt-3 rounded-lg p-3 ${toneClass}`}>
      <p className="mb-2 font-semibold text-slate-800">{title}</p>
      {rows.map(([key, value]) => (
        <p key={key} className="flex justify-between border-b border-dashed border-slate-200 py-1 text-sm last:border-0">
          <span>{key}</span>
          <strong>{String(value)}</strong>
        </p>
      ))}
    </div>
  );
}

function apiPartnerKey(partner: string) {
  return partner.startsWith("bac_") ? "bac" : partner;
}

const NAME_PATTERN = /^[A-Za-z ]+$/;
const MOBILE_PATTERN = /^\+?[1-9]\d{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apiErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.message || fallback;
}

function isApiFailure(response: any) {
  const status = String(response?.status || "").toLowerCase();
  return status === "failure" || status === "error";
}

function orderIdOf(response: any) {
  const data = response?.data;
  return String(data?.order_id || data?.bookingId || "").trim();
}

function paymentLinkOf(response: any) {
  const data = response?.data;
  return String(data?.payment_links?.web || data?.short_url || "").trim();
}

function bookingPageUrl(partner: string, orderId: string) {
  const prefix = apiPartnerKey(partner).toLowerCase();
  return `/dashboard/customerCare/HandleBooking?bookingId=${prefix}-${orderId}`;
}

/** Used when an ixigo quote has no partial amount below the full fare. */
const IXIGO_PARTIAL_FALLBACK = 50;

/**
 * Ixigo paymentConfirmation amount decides the payment type:
 * full fare → full, less than the full fare → partial, 0 → cash.
 * Partial with no quote uses ₹50. Returns "" when full has no usable quote,
 * or when ₹50 is not below the full fare.
 */
function ixigoConfirmationAmount(
  fare: any,
  mode: PaymentMode,
  addOnCharge: number
) {
  if (mode === "cash") return "0";
  const fullQuoted = quotedPaymentAmount(fare, "full");
  const fullPayable = Number(fullQuoted || 0) + addOnCharge;
  if (mode === "partial") {
    const quoted = quotedPaymentAmount(fare, "partial");
    const fromQuote = quoted ? Number(quoted) + addOnCharge : NaN;
    const payable =
      Number.isFinite(fromQuote) &&
      fromQuote > 0 &&
      fullQuoted &&
      fromQuote < fullPayable
        ? fromQuote
        : IXIGO_PARTIAL_FALLBACK;
    if (!fullQuoted || payable >= fullPayable) return "";
    return String(payable);
  }
  if (!fullQuoted || !Number.isFinite(fullPayable) || fullPayable <= 0) return "";
  return String(fullPayable);
}

function PrebookModal({
  fare,
  partner,
  onClose,
}: {
  fare: any;
  partner: string;
  onClose: () => void;
}) {
  const [userName, setUserName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otherDetails, setOtherDetails] = useState("Please be on time");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [consentMojoboxxTnC, setConsentMojoboxxTnC] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [pendingPaymentLink, setPendingPaymentLink] = useState("");
  const [selectedAddOnNames, setSelectedAddOnNames] = useState<string[]>([]);

  const addOnCatalog = availableAddOnServices(fare);
  const selectedAddOns = addOnCatalog.filter((item) =>
    selectedAddOnNames.includes(item.name)
  );
  const addOnCharge = addOnTotal(selectedAddOns);
  const amount = payableFare(fare);
  const amountWithAddOns =
    amount == null ? null : Number(amount) + addOnCharge;
  const searchId = String(fare?.searchId || "").trim();
  const isIxigo = apiPartnerKey(partner).trim().toLowerCase() === "ixigo";
  const paymentModes = isIxigo ? PAYMENT_MODES : availablePaymentModes(fare);
  const sendsPaymentMode = !isIxigo;
  const ixigoAmount = isIxigo
    ? ixigoConfirmationAmount(fare, paymentMode, addOnCharge)
    : "";

  useEffect(() => {
    setPaymentMode("full");
    setCreatedOrderId("");
    setPendingPaymentLink("");
    setSelectedAddOnNames([]);
    setError("");
  }, [fare]);

  const toggleAddOn = (name: string) => {
    setSelectedAddOnNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const openBooking = (orderId: string) => {
    window.location.assign(bookingPageUrl(partner, orderId));
  };

  const confirmsQuotedAmount =
    (paymentMode === "full" || paymentMode === "partial") &&
    partnerConfirmsQuotedAmount(partner);

  const confirmPayment = async (orderId: string) => {
    const payload: { bookingId: string; amount?: string } = { bookingId: orderId };
    if (
      confirmsQuotedAmount &&
      (paymentMode === "full" || paymentMode === "partial")
    ) {
      const quotedAmount = quotedPaymentAmount(fare, paymentMode);
      if (!quotedAmount) {
        throw new Error(
          paymentMode === "partial"
            ? "This fare has no partial amount."
            : "This fare has no fare amount."
        );
      }
      payload.amount = String(Number(quotedAmount) + addOnCharge);
    }
    const confirmation = await OPS_PAYMENT_CONFIRMATION(partner, payload);
    if (isApiFailure(confirmation)) {
      throw new Error(confirmation?.message || "Payment confirmation failed.");
    }
  };

  const confirmIxigoPayment = async (orderId: string) => {
    const amount = ixigoConfirmationAmount(fare, paymentMode, addOnCharge);
    if (!amount) {
      throw new Error(
        paymentMode === "partial"
          ? "Partial needs an amount greater than 0 and less than the full fare."
          : "This fare has no fare amount."
      );
    }
    const confirmation = await OPS_PAYMENT_CONFIRMATION(partner, {
      bookingId: orderId,
      amount,
    });
    if (isApiFailure(confirmation)) {
      throw new Error(confirmation?.message || "Payment confirmation failed.");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const name = userName.trim();
    const phone = mobile.trim();
    const mail = email.trim();
    if (!searchId) {
      setError("This fare has no search id, so it cannot be booked.");
      return;
    }
    if (!NAME_PATTERN.test(name)) {
      setError("Name must contain only letters and spaces.");
      return;
    }
    if (!MOBILE_PATTERN.test(phone)) {
      setError("Enter a valid mobile number.");
      return;
    }
    if (!EMAIL_PATTERN.test(mail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!consentMojoboxxTnC) {
      setError("Mojoboxx terms must be accepted.");
      return;
    }

    const paymentTab =
      isIxigo || paymentMode === "cash" || confirmsQuotedAmount
        ? null
        : window.open("about:blank", "_blank");

    setSubmitting(true);
    try {
      let orderId = createdOrderId;
      let paymentLink = pendingPaymentLink;

      if (!orderId) {
        const prebook = await OPS_PREBOOK(partner, {
          userName: name,
          mobile: phone,
          email: mail,
          searchId,
          otherDetails: otherDetails.trim() || "Please be on time",
          returnUrl: "https://shope.me",
          merchantUrl: "https://shope.me",
          whatsappConsent,
          deviceType: "WE",
          consentMojoboxxTnC: true,
          ...(sendsPaymentMode ? { paymentMode } : {}),
          ...(selectedAddOns.length ? { addOnServices: selectedAddOns } : {}),
        });
        if (isApiFailure(prebook)) {
          throw new Error(prebook?.message || "Prebook failed.");
        }
        orderId = orderIdOf(prebook);
        paymentLink = paymentLinkOf(prebook);
        if (!orderId) {
          throw new Error(prebook?.message || "Prebook did not return a booking id.");
        }
        setCreatedOrderId(orderId);
        if (!isIxigo) setPendingPaymentLink(paymentLink);
      }

      if (isIxigo) {
        await confirmIxigoPayment(orderId);
        openBooking(orderId);
        return;
      }

      if (paymentMode === "cash" || confirmsQuotedAmount) {
        await confirmPayment(orderId);
      }

      if (confirmsQuotedAmount) {
        openBooking(orderId);
        return;
      }

      if (paymentLink) {
        if (paymentTab) {
          paymentTab.opener = null;
          paymentTab.location.href = paymentLink;
        } else {
          const opened = window.open(paymentLink, "_blank", "noopener,noreferrer");
          if (!opened) {
            setPendingPaymentLink(paymentLink);
            setError("Booking created. Allow pop-ups to open the payment page, or use the link below.");
            return;
          }
        }
      } else if (paymentTab) {
        paymentTab.close();
      }

      openBooking(orderId);
    } catch (err: any) {
      if (paymentTab && !paymentTab.closed) paymentTab.close();
      setError(apiErrorMessage(err, "Booking failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Book this fare</h3>
            <p className="mt-1 text-sm text-slate-500">
              {fare?.title || fare?.cabPartner || "Fare"}
              {fare?.model ? ` · ${fare.model}` : ""}
              {amountWithAddOns != null ? ` · ₹${amountWithAddOns}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            disabled={submitting}
          >
            Close
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Mobile
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Other details
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={otherDetails}
            onChange={(event) => setOtherDetails(event.target.value)}
          />
        </label>
        {addOnCatalog.length > 0 && (
          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-slate-700">
              Add-on services
            </legend>
            <div className="mt-1 space-y-1">
              {addOnCatalog.map((item) => (
                <label
                  key={item.name}
                  className="flex items-center justify-between gap-3 text-sm text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAddOnNames.includes(item.name)}
                      onChange={() => toggleAddOn(item.name)}
                      disabled={Boolean(createdOrderId) || submitting}
                    />
                    {item.name}
                  </span>
                  <span>₹{formatInr(item.amount)}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Fare ₹{formatInr(amount)}
              {addOnCharge > 0 ? ` + add-ons ₹${formatInr(addOnCharge)}` : ""}
              {amountWithAddOns != null
                ? ` = ₹${formatInr(amountWithAddOns)}`
                : ""}
            </p>
          </fieldset>
        )}
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Payment mode
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={paymentMode}
            onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
            disabled={Boolean(createdOrderId)}
          >
            {paymentModes.map((mode) => {
              const modeAmount = isIxigo
                ? ixigoConfirmationAmount(fare, mode.value, addOnCharge)
                : "";
              return (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                  {isIxigo
                    ? modeAmount
                      ? ` · ₹${formatInr(modeAmount)}`
                      : " · unavailable"
                    : ""}
                </option>
              );
            })}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-500">
          {isIxigo
            ? ixigoAmount
              ? `Payment confirmation sends ₹${formatInr(ixigoAmount)}. The full fare is full payment, less than the full fare is partial, and 0 is cash.`
              : "This fare has no amount for the selected payment type."
            : paymentMode === "cash"
              ? "Cash is confirmed with the payment confirmation API, then this tab opens the booking."
              : confirmsQuotedAmount
                ? "Payment confirmation is sent with the quoted amount, then this tab opens the booking."
                : "The payment page opens in a new tab. This tab opens the booking so you can refresh it after payment."}
          {!isIxigo && paymentModes.length < 3
            ? " Partial and cash only appear when this fare includes them."
            : ""}
        </p>

        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={whatsappConsent}
            onChange={(event) => setWhatsappConsent(event.target.checked)}
          />
          WhatsApp consent
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consentMojoboxxTnC}
            onChange={(event) => setConsentMojoboxxTnC(event.target.checked)}
            required
          />
          Accept Mojoboxx terms
        </label>

        {error && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {pendingPaymentLink && (
          <a
            className="mt-3 block text-sm font-medium text-blue-700 underline"
            href={pendingPaymentLink}
            target="_blank"
            rel="noreferrer"
          >
            Open payment page
          </a>
        )}
        {createdOrderId && (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-blue-700 underline"
            onClick={() => openBooking(createdOrderId)}
          >
            Open booking {createdOrderId}
          </button>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={submitting || !searchId}
        >
          {submitting
            ? "Booking…"
            : createdOrderId &&
                (isIxigo || paymentMode === "cash" || confirmsQuotedAmount)
              ? "Retry payment confirmation"
              : "Create booking"}
        </button>
      </form>
    </div>
  );
}

const OpsFareSearch = () => {
  const selectedPartner = useSelector(
    (state: any) => state?.operationStore?.ReportSelectedPartner || ""
  );
  const partnerWiseData = useSelector(
    (state: any) => state?.authStore?.partner_wise_data?.[0] || {}
  );

  const [payloadText, setPayloadText] = useState(defaultPayload);
  const [cabPartnerFilter, setCabPartnerFilter] = useState("all");
  const [airportCode, setAirportCode] = useState("DEL");
  const [journeyType, setJourneyType] = useState<JourneyType>("AIRPORT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fares, setFares] = useState<any[]>([]);
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [editorOpen, setEditorOpen] = useState(true);
  const [selectedFare, setSelectedFare] = useState<any | null>(null);
  const [uiTheme, setUiTheme] = useState<FareUiTheme>("MOJOUI");
  const [showDiscount, setShowDiscount] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const partnerKey = apiPartnerKey(String(selectedPartner || ""));
  const host = partnerWiseData?.[partnerKey]?.host || "";
  const needsSinglePartner = !selectedPartner || selectedPartner === "all";
  const hasRailUiTheme = ["railyatri", "stage"].includes(
    partnerKey.toLowerCase(),
  );
  const useRailUi = hasRailUiTheme && uiTheme === "RAILUI";

  useEffect(() => {
    if (!hasRailUiTheme && uiTheme !== "MOJOUI") {
      setUiTheme("MOJOUI");
    }
  }, [hasRailUiTheme, uiTheme]);
  const lowestFare = fares.reduce((lowest, fare) => {
    const amount = payableFare(fare);
    if (!lowest || amount < lowest) return amount;
    return lowest;
  }, 0);

  const selectedCabPartner = CAB_TEST_PARTNERS.find(
    (partner) => partner.name === cabPartnerFilter
  );

  const applyCabPartner = (
    partnerName: string,
    nextAirport: string | null,
    nextJourneyType = journeyType
  ) => {
    setCabPartnerFilter(partnerName);
    setAirportCode(nextAirport || "DEL");
    setJourneyType(nextJourneyType);
    setPayloadText(
      payloadForCabPartner(partnerName, nextAirport, payloadText, nextJourneyType)
    );
    setFares([]);
    setTrip(null);
    setError("");
    setMessage("");
  };

  const openEditor = () => {
    setEditorOpen(true);
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const search = async () => {
    setError("");
    setMessage("");

    if (needsSinglePartner) {
      setError("Select one partner tab. Fare search uses that partner's host and token.");
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(payloadText);
    } catch {
      setError("Request JSON is invalid.");
      return;
    }

    setLoading(true);
    try {
      const res = await OPS_FARE_SEARCH(selectedPartner, body, { showDiscount });
      if (res?.status === "success" && Array.isArray(res.data)) {
        setFares(res.data);
        setTrip(body);
        setEditorOpen(false);
        setMessage(res.message || `${res.data.length} fares`);
      } else {
        setError(res?.message || "Fare search failed.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Fare search failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const pickupWhen = formatClock(trip?.startDatetime);
  const dropWhen = dropClock(trip?.startDatetime, trip?.duration);
  const pickup =
    String(trip?.sourceName || trip?.sourceAddress || "").trim();
  const drop =
    String(trip?.destinationName || trip?.destinationAddress || "").trim();
  const kilometers = trip?.kilometer;
  const minutes = trip?.duration;

  return (
    <div className="bg-[#f5f7fb] p-4">
      <PageMeta title="Fare Search" description="Search partner fares" />
      <PartnerTab propsData={{ isall: false }} />

      <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-end gap-3">
        <label
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
          htmlFor="fare-show-discount-top"
        >
          <input
            id="fare-show-discount-top"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={showDiscount}
            onChange={(event) => setShowDiscount(event.target.checked)}
          />
          Show discount
        </label>
        {hasRailUiTheme && (
          <>
            <label
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="fare-ui-theme"
            >
              UI theme
            </label>
            <select
              id="fare-ui-theme"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
              value={uiTheme}
              onChange={(event) => setUiTheme(event.target.value as FareUiTheme)}
            >
              <option value="MOJOUI">MOJOUI</option>
              <option value="RAILUI">RAILUI</option>
            </select>
          </>
        )}
      </div>

      {useRailUi ? (
        <RailUiFareSearch
          partner={selectedPartner}
          host={host}
          showDiscount={showDiscount}
        />
      ) : (
      <div className="mx-auto mt-4 max-w-5xl">
        {fares.length > 0 && (
          <div className="mb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Select Your Cab
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose the best ride for your journey
            </p>
          </div>
        )}

        {trip && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-600">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <MdLuggage />
                </span>
                {journeyLabel(trip.journeyType)}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
                onClick={openEditor}
              >
                <FiEdit2 className="text-sm" />
                Edit
              </button>
            </div>

            <div className="relative mt-4 space-y-4 pl-5">
              <span className="absolute bottom-3 left-[4px] top-2 border-l border-dashed border-slate-200" />
              <div className="relative">
                <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                  Pickup
                </p>
                <p className="text-sm font-medium text-slate-800">{pickup || "—"}</p>
                {pickupWhen && (
                  <p className="text-xs font-medium text-rose-400">{pickupWhen}</p>
                )}
              </div>
              <div className="relative">
                <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  Drop
                </p>
                <p className="text-sm font-medium text-slate-800">{drop || "—"}</p>
                {dropWhen && (
                  <p className="text-xs font-medium text-emerald-500">{dropWhen}</p>
                )}
              </div>
            </div>

            {(kilometers != null || minutes != null) && (
              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-sm text-emerald-600">
                {kilometers != null && kilometers !== "" && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-200 text-[10px]">
                      ✓
                    </span>
                    Estimated
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold">
                      {String(kilometers)} km
                    </span>
                  </span>
                )}
                {minutes != null && minutes !== "" && (
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock className="text-emerald-500" />
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold">
                      {String(minutes)} min
                    </span>
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {(editorOpen || fares.length === 0) && (
        <div ref={editorRef} className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">Fare Search</h2>
          <p className="mt-1 text-sm text-gray-600">
            {needsSinglePartner
              ? "Select Indigo, BAC, or another partner. The search uses that login host and token."
              : `Searching ${partnerKey.toUpperCase()} at ${host || "the partner host from login"}.`}
          </p>

          {editorOpen && (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="block text-sm font-medium text-gray-700" htmlFor="cab-partner-filter">
                  Cab partner
                  <select
                    id="cab-partner-filter"
                    className="mt-1 block min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                    value={cabPartnerFilter}
                    onChange={(event) => {
                      const partnerName = event.target.value;
                      const partner = CAB_TEST_PARTNERS.find((item) => item.name === partnerName);
                      const nextAirport = partner?.airports[0] || null;
                      applyCabPartner(partnerName, partnerName === "all" ? null : nextAirport);
                    }}
                  >
                    <option value="all">All</option>
                    {CAB_TEST_PARTNERS.map((partner) => (
                      <option key={partner.name} value={partner.name}>
                        {partner.name}
                        {partner.anyCity
                          ? " (any city)"
                          : ` (${partner.airports.join(", ")})`}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedCabPartner && selectedCabPartner.airports.length > 1 && (
                  <label className="block text-sm font-medium text-gray-700" htmlFor="cab-partner-airport">
                    Airport
                    <select
                      id="cab-partner-airport"
                      className="mt-1 block min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                      value={airportCode}
                      onChange={(event) =>
                        applyCabPartner(cabPartnerFilter, event.target.value)
                      }
                    >
                      {selectedCabPartner.airports.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block text-sm font-medium text-gray-700" htmlFor="fare-journey-type">
                  Journey type
                  <select
                    id="fare-journey-type"
                    className="mt-1 block min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                    value={journeyType}
                    onChange={(event) =>
                      applyCabPartner(
                        cabPartnerFilter,
                        cabPartnerFilter === "all" ? null : airportCode,
                        event.target.value as JourneyType
                      )
                    }
                  >
                    {JOURNEY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {cabPartnerFilter === "all"
                  ? "All keeps the current Delhi airport search and calls every live cab partner."
                  : selectedCabPartner?.anyCity
                    ? `${cabPartnerFilter} works in any city. This search uses Delhi and cabPartnerList so only that partner is called.`
                    : `${cabPartnerFilter} uses ${airportCode}. The request sets that airport and cabPartnerList so only that partner is called.`}{" "}
                {journeyType === "LOCAL"
                  ? "LOCAL quotes the covering city package and keeps a real A→B destination."
                  : journeyType === "RENTAL"
                    ? "RENTAL uses hourly packages for the same pickup and drop."
                    : journeyType === "OUTSTATION"
                      ? "OUTSTATION sets ONEWAY and 85 km when the current trip is under 70 km."
                      : "AIRPORT is the default airport transfer."}
              </p>
              <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="fare-search-json">
                Request JSON
              </label>
              <textarea
                id="fare-search-json"
                className="mt-1 h-72 w-full rounded-lg border border-gray-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                spellCheck={false}
              />
              <label
                className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                htmlFor="fare-show-discount"
              >
                <input
                  id="fare-show-discount"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={showDiscount}
                  onChange={(event) => setShowDiscount(event.target.checked)}
                />
                Show discount breakdown
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Off by default — fares show payable only. Turn on to see strike-through and % off from hourly discount config.
              </p>
            </>
          )}

          <button
            type="button"
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={search}
            disabled={loading || needsSinglePartner}
          >
            {loading ? "Searching…" : "Search fares"}
          </button>

          {error && (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
        )}

        {fares.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Available Cabs</h3>
              <p className="text-sm text-sky-600">
                {fares.length} option{fares.length === 1 ? "" : "s"}
                {message ? ` · ${message}` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {fares.map((fare, index) => (
                <CabOptionCard
                  key={fare.searchId || `fare-${index}`}
                  fare={fare}
                  lowest={fareAmount(fare) === lowestFare && lowestFare > 0}
                  onBook={setSelectedFare}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      )}
      {!useRailUi && selectedFare && (
        <PrebookModal
          fare={selectedFare}
          partner={selectedPartner}
          onClose={() => setSelectedFare(null)}
        />
      )}
    </div>
  );
};

export default OpsFareSearch;

