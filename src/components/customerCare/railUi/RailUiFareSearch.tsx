import { useMemo, useState, type FormEvent } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiMapPin,
} from "react-icons/fi";
import { FaStar, FaTrain, FaWhatsapp } from "react-icons/fa";
import { MdAirlineSeatReclineNormal, MdDirectionsCar, MdLuggage, MdSwapVert } from "react-icons/md";
import {
  OPS_FARE_SEARCH,
  OPS_PAYMENT_CONFIRMATION,
  OPS_PREBOOK,
} from "../../../config/customerCare/operationsApicall";
import {
  EMAIL_PATTERN,
  MOBILE_PATTERN,
  NAME_PATTERN,
  RAIL_PRIMARY,
  RAIL_PRIMARY_DARK,
  apiErrorMessage,
  bookingPageUrl,
  cabHeading,
  defaultRailPayload,
  fareAmount,
  featureLines,
  formatDuration,
  formatInr,
  formatTripDate,
  formatTripDateTime,
  formatTripTime,
  isApiFailure,
  JOURNEY_TYPES,
  luggageOf,
  normalizeVehicleType,
  offersCashPayment,
  offersPartialPayment,
  orderIdOf,
  partnerConfirmsQuotedAmount,
  partialAmount,
  partialPercentLabel,
  paymentLinkOf,
  quotedPaymentAmount,
  remainingAmount,
  seatsOf,
  serializedRows,
  shortPlace,
  type JourneyType,
  type RailPaymentMode,
} from "./helpers";
import {
  addOnTotal,
  availableAddOnServices,
} from "../../../utils/addOnServices";
import PlacesAutocomplete from "./PlacesAutocomplete";
import {
  filterRentalFares,
  prepareFareSearchBody,
  type ResolvedPlace,
} from "./prepareFareSearch";

function newPlacesSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `places-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type Step = "search" | "results" | "review";
type VehicleFilter = "All" | "Hatchback" | "Sedan" | "SUV";
type DetailTab = "Inclusions" | "Exclusions" | "Features";
type JourneyTypeChoice = "auto" | JourneyType;

type Props = {
  partner: string;
  host: string;
  /** When true, fare search returns discount meta (strike / % off). Default off. */
  showDiscount?: boolean;
};

const TRUST_PILLS = [
  "Assured Journey",
  "7 Crore+ travellers trust us",
  "Fare fixed before booking",
  "Driver details before pickup",
];

const TRIP_RULES = [
  { title: "Door-to-door", body: "No auto to the station. No auto after." },
  { title: "Your time", body: "You choose the time. Not the timetable." },
  { title: "Your own cab", body: "No sharing. Just you and your family." },
  { title: "One flat price", body: "Same price for 2 or 4 people." },
];

const ASSURED = [
  {
    title: "Confirmed in advance",
    body: "Your cab is locked in early. Not on the day of travel.",
  },
  {
    title: "On-time pickup",
    body: "You book for 10:30. We arrive at 10:30.",
  },
  {
    title: "100% backup cab",
    body: "If a driver drops, we send another. You don't make a single call.",
  },
  {
    title: "Automatic refunds",
    body: "No cab? Full refund. Automatic. No forms.",
  },
];

const STEPS = [
  { title: "Enter your route", body: "Where, when, what time." },
  { title: "Pick your cab", body: "Sedan or SUV." },
  {
    title: "We come to your door",
    body: "Driver details before pickup. Track on your phone.",
  },
];

const FAQS = [
  {
    q: "Is a cab cheaper than a train?",
    a: "For groups, a full-cab flat fare often beats buying several train tickets — especially door-to-door with no last-mile autos.",
  },
  {
    q: "What if my cab cancels?",
    a: "We arrange a backup cab. If we cannot fulfill, you get an automatic full refund — no forms.",
  },
  {
    q: "Will the cab come on time?",
    a: "You book a fixed pickup time. Drivers are assigned to arrive at that slot, with tracking before pickup.",
  },
  {
    q: "Who is the driver?",
    a: "Driver name, photo, vehicle number and OTP are shared before pickup so you know exactly who is coming.",
  },
  {
    q: "Is the fare final?",
    a: "Yes. The price you see is the price you pay for the full cab. Tolls and taxes are included — no meter, no surge.",
  },
  {
    q: "What car will I get?",
    a: "You pick a category (Hatchback, Sedan, SUV). The model shown is typical — you get that category or similar.",
  },
];

const POPULAR_ROUTES = [
  { from: "Pune", to: "Mumbai", km: 163, mins: 190, price: 2544 },
  { from: "Delhi", to: "Agra", km: 214, mins: 217, price: 2633 },
  { from: "Jaipur", to: "Delhi", km: 280, mins: 300, price: 3899 },
];

function toDatetimeLocalValue(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return defaultRailPayload().startDatetime;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseBody(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>;
}

function RailCabCard({
  fare,
  expanded,
  onToggleDetails,
  onBook,
}: {
  fare: any;
  expanded: boolean;
  onToggleDetails: () => void;
  onBook: () => void;
}) {
  const [detailTab, setDetailTab] = useState<DetailTab>("Inclusions");
  const inclusions = Array.isArray(fare.inclusion) ? fare.inclusion : [];
  const exclusions = Array.isArray(fare.exclusion) ? fare.exclusion : [];
  const features = featureLines(fare);
  const seats = seatsOf(fare);
  const bags = luggageOf(fare);
  const rating =
    fare.rating != null && fare.rating !== "" ? Number(fare.rating) : null;
  const model = fare.model && fare.model !== "Unknown" ? fare.model : "";
  const price = fareAmount(fare);

  const detailItems =
    detailTab === "Inclusions"
      ? inclusions
      : detailTab === "Exclusions"
        ? exclusions
        : features;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-sky-50">
          {fare.image || fare.imageMobile || fare.imageApp ? (
            <img
              src={fare.image || fare.imageMobile || fare.imageApp}
              alt=""
              className="max-h-14 max-w-[72px] object-contain"
            />
          ) : (
            <MdDirectionsCar className="text-3xl text-sky-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{cabHeading(fare)}</h3>
              {model && <p className="text-sm text-slate-500">{model}</p>}
            </div>
            {rating != null && Number.isFinite(rating) && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-300 px-1.5 py-0.5 text-xs font-bold text-slate-900">
                <FaStar className="text-[10px]" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1" title="Seats">
              <MdAirlineSeatReclineNormal />
              {seats}
            </span>
            <span className="inline-flex items-center gap-1" title="Luggage">
              <MdLuggage />
              {bags}
            </span>
            <button
              type="button"
              className="ml-auto font-medium text-sky-600 hover:underline"
              onClick={onToggleDetails}
            >
              {expanded ? "Hide details" : "See details"}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex gap-4 border-b border-slate-100 text-sm font-medium">
            {(["Inclusions", "Exclusions", "Features"] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`pb-2 ${
                  detailTab === tab
                    ? "border-b-2 border-[#00529B] text-[#00529B]"
                    : "text-slate-500"
                }`}
                onClick={() => setDetailTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {detailItems.length === 0 && (
              <li className="text-slate-400">Nothing listed for this tab.</li>
            )}
            {detailItems.map((item: string) => (
              <li key={item} className="flex items-start gap-2">
                {detailTab === "Exclusions" ? (
                  <span className="mt-0.5 text-rose-500">×</span>
                ) : (
                  <FiCheck className="mt-0.5 shrink-0 text-emerald-500" />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-bold leading-none text-slate-900">
            {formatInr(price)}
          </p>
          <p className="mt-1 text-xs text-slate-500">full fare for the whole cab</p>
        </div>
        <button
          type="button"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: RAIL_PRIMARY }}
          onClick={onBook}
        >
          Book Now
        </button>
      </div>
    </article>
  );
}

function PaymentChoice({
  selected,
  title,
  badge,
  badgeTone,
  description,
  amount,
  disabled,
  onSelect,
}: {
  selected: boolean;
  title: string;
  badge?: string;
  badgeTone: "green" | "sky" | "amber";
  description: string;
  amount: number;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full rounded-xl border-2 bg-white p-4 text-left shadow-sm disabled:opacity-60 ${
        selected ? "" : "border-slate-200"
      }`}
      style={selected ? { borderColor: RAIL_PRIMARY } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
            style={{ borderColor: selected ? RAIL_PRIMARY : "#cbd5e1" }}
          >
            {selected && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: RAIL_PRIMARY }}
              />
            )}
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              {title}
              {badge ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    badgeTone === "green"
                      ? "bg-emerald-100 text-emerald-700"
                      : badgeTone === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <p className="shrink-0 text-base font-bold text-slate-900">₹{formatInr(amount)}</p>
      </div>
    </button>
  );
}

export default function RailUiFareSearch({
  partner,
  host,
  showDiscount = false,
}: Props) {
  const [step, setStep] = useState<Step>("search");
  const [payloadText, setPayloadText] = useState(() =>
    JSON.stringify(defaultRailPayload(), null, 2)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeInfo, setRouteInfo] = useState("");
  const [placesSession, setPlacesSession] = useState(newPlacesSessionToken);
  const [sourcePlace, setSourcePlace] = useState<ResolvedPlace | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<ResolvedPlace | null>(null);
  const [fares, setFares] = useState<any[]>([]);
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>("All");
  const [expandedId, setExpandedId] = useState("");
  const [selectedFare, setSelectedFare] = useState<any | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [userName, setUserName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [consentTerms, setConsentTerms] = useState(true);
  const [paymentMode, setPaymentMode] = useState<RailPaymentMode>("full");
  const [journeyTypeChoice, setJourneyTypeChoice] =
    useState<JourneyTypeChoice>("auto");
  const [showBreakup, setShowBreakup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [pendingPaymentLink, setPendingPaymentLink] = useState("");
  const [selectedAddOnNames, setSelectedAddOnNames] = useState<string[]>([]);

  let body: Record<string, unknown> = defaultRailPayload();
  try {
    body = parseBody(payloadText);
  } catch {
    /* keep last good defaults for display */
  }

  const pickup = String(body.sourceName || body.sourceAddress || "");
  const drop = String(body.destinationName || body.destinationAddress || "");
  const startLocal = toDatetimeLocalValue(body.startDatetime);

  const syncField = (patch: Record<string, unknown>) => {
    try {
      const next = { ...parseBody(payloadText), ...patch };
      if (patch.sourceName != null) next.sourceAddress = patch.sourceName;
      if (patch.destinationName != null) next.destinationAddress = patch.destinationName;
      setPayloadText(JSON.stringify(next, null, 2));
    } catch {
      setError("Request JSON is invalid. Fix advanced JSON or reset defaults.");
    }
  };

  const applyResolvedPlace = (
    side: "source" | "destination",
    place: ResolvedPlace
  ) => {
    if (side === "source") {
      setSourcePlace(place);
      syncField({
        sourceName: place.address,
        sourceAddress: place.address,
        sourceLatitude: place.latitude,
        sourceLongitude: place.longitude,
        sourceCity: place.city,
        sourceState: place.state,
      });
    } else {
      setDestinationPlace(place);
      syncField({
        destinationName: place.address,
        destinationAddress: place.address,
        destinationLatitude: place.latitude,
        destinationLongitude: place.longitude,
        destinationCity: place.city,
        destinationState: place.state,
      });
    }
    setRouteInfo("");
  };

  const onPickupTyped = (value: string) => {
    setSourcePlace(null);
    setRouteInfo("");
    syncField({
      sourceName: value,
      sourceAddress: value,
      sourceLatitude: null,
      sourceLongitude: null,
    });
  };

  const onDropTyped = (value: string) => {
    setDestinationPlace(null);
    setRouteInfo("");
    syncField({
      destinationName: value,
      destinationAddress: value,
      destinationLatitude: null,
      destinationLongitude: null,
    });
  };

  const swapPlaces = () => {
    try {
      const current = parseBody(payloadText);
      const next = {
        ...current,
        sourceName: current.destinationName,
        sourceAddress: current.destinationAddress ?? current.destinationName,
        sourceLatitude: current.destinationLatitude,
        sourceLongitude: current.destinationLongitude,
        sourceCity: current.destinationCity,
        sourceState: current.destinationState,
        destinationName: current.sourceName,
        destinationAddress: current.sourceAddress ?? current.sourceName,
        destinationLatitude: current.sourceLatitude,
        destinationLongitude: current.sourceLongitude,
        destinationCity: current.sourceCity,
        destinationState: current.sourceState,
      };
      setPayloadText(JSON.stringify(next, null, 2));
      setSourcePlace(destinationPlace);
      setDestinationPlace(sourcePlace);
      setRouteInfo("");
    } catch {
      setError("Request JSON is invalid.");
    }
  };

  const filteredFares = useMemo(() => {
    if (vehicleFilter === "All") return fares;
    return fares.filter((fare) => normalizeVehicleType(fare.vehicleType) === vehicleFilter);
  }, [fares, vehicleFilter]);

  const search = async () => {
    setError("");
    setRouteInfo("");
    let parsed: Record<string, unknown>;
    try {
      parsed = parseBody(payloadText);
    } catch {
      setError("Request JSON is invalid.");
      return;
    }

    const pickupName = String(parsed.sourceName || parsed.sourceAddress || "").trim();
    const dropName = String(
      parsed.destinationName || parsed.destinationAddress || ""
    ).trim();
    if (!pickupName || !dropName) {
      setError("Select both pickup and drop from Google suggestions.");
      return;
    }

    setLoading(true);
    try {
      const prepared = await prepareFareSearchBody(partner, parsed, {
        sourcePlace,
        destinationPlace,
        sessiontoken: placesSession,
        onStatus: setRouteInfo,
        journeyType:
          journeyTypeChoice === "auto" ? undefined : journeyTypeChoice,
      });
      setPayloadText(JSON.stringify(prepared.body, null, 2));
      setSourcePlace(prepared.source);
      setDestinationPlace(prepared.destination);
      setPlacesSession(newPlacesSessionToken());

      const res = await OPS_FARE_SEARCH(partner, prepared.body, { showDiscount });
      if (res?.status === "success" && Array.isArray(res.data)) {
        const faresForTrip =
          prepared.body.journeyType === "RENTAL"
            ? filterRentalFares(
                res.data,
                Number(prepared.body.kilometer),
                Number(prepared.body.duration)
              )
            : res.data;
        setFares(faresForTrip);
        setTrip(prepared.body);
        setVehicleFilter("All");
        setExpandedId("");
        setStep("results");
      } else {
        setError(res?.message || "Fare search failed.");
      }
    } catch (err: any) {
      setError(apiErrorMessage(err, "Fare search failed."));
    } finally {
      setLoading(false);
    }
  };

  const openReview = (fare: any) => {
    setSelectedFare(fare);
    setBookError("");
    setCreatedOrderId("");
    setPendingPaymentLink("");
    setPaymentMode("full");
    setShowBreakup(false);
    setSelectedAddOnNames([]);
    setStep("review");
  };

  const toggleAddOn = (name: string) => {
    if (submitting || createdOrderId) return;
    setSelectedAddOnNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const choosePaymentMode = (mode: RailPaymentMode) => {
    if (submitting || mode === paymentMode) return;
    setPaymentMode(mode);
    setCreatedOrderId("");
    setPendingPaymentLink("");
    setBookError("");
  };

  const submitPrebook = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFare) return;
    setBookError("");

    const name = userName.trim();
    const phone = mobile.trim();
    const mail = email.trim();
    const searchId = String(selectedFare.searchId || "").trim();

    if (!searchId) {
      setBookError("This fare has no search id, so it cannot be booked.");
      return;
    }
    if (!NAME_PATTERN.test(name)) {
      setBookError("Name must contain only letters and spaces.");
      return;
    }
    if (!MOBILE_PATTERN.test(phone)) {
      setBookError("Enter a valid mobile number.");
      return;
    }
    if (!EMAIL_PATTERN.test(mail)) {
      setBookError("Enter a valid email address.");
      return;
    }
    if (!consentTerms) {
      setBookError("Please accept the terms to continue.");
      return;
    }

    const modeToCharge: RailPaymentMode =
      offersCashPayment(selectedFare) && paymentMode === "cash"
        ? "cash"
        : offersPartialPayment(selectedFare) && paymentMode === "partial"
          ? "partial"
          : "full";
    const selectedAddOns = availableAddOnServices(selectedFare).filter((item) =>
      selectedAddOnNames.includes(item.name)
    );
    const addOnCharge = addOnTotal(selectedAddOns);
    const confirmsQuotedAmount =
      (modeToCharge === "full" || modeToCharge === "partial") &&
      partnerConfirmsQuotedAmount(partner);
    const paymentTab =
      modeToCharge === "cash" || confirmsQuotedAmount
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
          otherDetails: "Please be on time",
          returnUrl: "https://shope.me",
          merchantUrl: "https://shope.me",
          whatsappConsent,
          deviceType: "WE",
          consentMojoboxxTnC: true,
          paymentMode: modeToCharge,
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
        setPendingPaymentLink(paymentLink);
      }

      if (modeToCharge === "cash" || confirmsQuotedAmount) {
        const payload: { bookingId: string; amount?: string } = {
          bookingId: orderId,
        };
        if (confirmsQuotedAmount) {
          const amount = quotedPaymentAmount(
            selectedFare,
            modeToCharge === "partial" ? "partial" : "full"
          );
          if (!amount) {
            throw new Error(
              modeToCharge === "partial"
                ? "This fare has no partial amount."
                : "This fare has no fare amount."
            );
          }
          payload.amount = String(Number(amount) + addOnCharge);
        }
        const confirmation = await OPS_PAYMENT_CONFIRMATION(partner, payload);
        if (isApiFailure(confirmation)) {
          throw new Error(confirmation?.message || "Payment confirmation failed.");
        }
        if (paymentTab && !paymentTab.closed) paymentTab.close();
        window.location.assign(bookingPageUrl(partner, orderId));
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
            setBookError(
              "Booking created. Allow pop-ups to open the payment page, or use the link below."
            );
            return;
          }
        }
      } else if (paymentTab) {
        paymentTab.close();
      }

      window.location.assign(bookingPageUrl(partner, orderId));
    } catch (err: any) {
      if (paymentTab && !paymentTab.closed) paymentTab.close();
      setBookError(apiErrorMessage(err, "Booking failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const reviewTrip = trip || body;
  const reviewFare = selectedFare;
  const addOnCatalog = availableAddOnServices(reviewFare);
  const selectedAddOns = addOnCatalog.filter((item) =>
    selectedAddOnNames.includes(item.name)
  );
  const addOnCharge = addOnTotal(selectedAddOns);
  const reviewPrice = (reviewFare ? fareAmount(reviewFare) : 0) + addOnCharge;
  const partialOffered = reviewFare ? offersPartialPayment(reviewFare) : false;
  const cashOffered = reviewFare ? offersCashPayment(reviewFare) : false;
  const activePaymentMode: RailPaymentMode =
    cashOffered && paymentMode === "cash"
      ? "cash"
      : partialOffered && paymentMode === "partial"
        ? "partial"
        : "full";
  const advanceAmount = partialOffered
    ? (partialAmount(reviewFare) ?? 0) + addOnCharge
    : 0;
  const balanceDue = partialOffered ? remainingAmount(reviewFare) ?? 0 : 0;
  const payNowAmount = activePaymentMode === "partial" ? advanceAmount : reviewPrice;
  const partialBadge = partialOffered ? partialPercentLabel(reviewFare) : "";
  const breakupRows = serializedRows(
    activePaymentMode === "partial"
      ? reviewFare?.serializedFareDisplayPartial || reviewFare?.serializedFareDisplay
      : reviewFare?.serializedFareDisplay || reviewFare?.fareDisplayStr
  );
  const km = reviewTrip?.kilometer;
  const mins = reviewTrip?.duration;
  const mobileValid = MOBILE_PATTERN.test(mobile.trim());

  if (step === "review" && reviewFare) {
    return (
      <div className="mx-auto mt-4 max-w-md pb-28">
        <header className="mb-3 flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm">
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            onClick={() => setStep("results")}
            aria-label="Back"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Review your cab</h2>
        </header>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="relative space-y-4 pl-5">
            <span className="absolute bottom-2 left-[7px] top-2 border-l border-dashed border-slate-200" />
            <div className="relative">
              <span className="absolute -left-5 top-1 flex h-3.5 w-3.5 items-center justify-center">
                <span className="h-0 w-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-rose-500" />
              </span>
              <p className="text-sm font-medium text-slate-800">
                {String(reviewTrip.sourceAddress || reviewTrip.sourceName || "—")}
              </p>
              <p className="text-xs text-slate-500">
                {formatTripDateTime(reviewTrip.startDatetime)}
              </p>
            </div>
            <div className="relative">
              <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-emerald-500 bg-white" />
              <p className="text-sm font-medium text-slate-800">
                {String(
                  reviewTrip.destinationAddress || reviewTrip.destinationName || "—"
                )}
              </p>
            </div>
          </div>

          {(km != null || mins != null) && (
            <p className="mt-3 text-sm text-slate-500">
              {km != null && km !== "" ? `≈${km} km` : ""}
              {km != null && mins != null ? " " : ""}
              {mins != null && mins !== "" ? `${formatDuration(mins)} (approx)` : ""}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-14 items-center justify-center rounded-lg bg-sky-50">
                {reviewFare.image ? (
                  <img
                    src={reviewFare.image}
                    alt=""
                    className="max-h-10 max-w-12 object-contain"
                  />
                ) : (
                  <MdDirectionsCar className="text-2xl text-sky-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {cabHeading(reviewFare)}
                  {seatsOf(reviewFare) != null ? ` - ${seatsOf(reviewFare)} seats` : ""}
                </p>
                {reviewFare.model && (
                  <p className="text-sm text-slate-500">{reviewFare.model}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">₹{formatInr(reviewPrice)}</p>
              <p className="text-xs text-slate-500">total for the cab</p>
            </div>
          </div>

          <button
            type="button"
            className="mt-2 text-sm font-medium text-sky-600 hover:underline"
            onClick={() => setShowBreakup((open) => !open)}
          >
            {showBreakup ? "Hide fare breakup" : "See fare breakup"}
          </button>
          {showBreakup && (
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
              {breakupRows.length === 0 ? (
                <p className="text-slate-500">No breakup rows on this card.</p>
              ) : (
                breakupRows.map((row) => (
                  <p
                    key={`${row.key || row.label}-${row.value}`}
                    className="flex justify-between border-b border-dashed border-slate-200 py-1.5 last:border-0"
                  >
                    <span className="text-slate-600">{row.label}</span>
                    <strong>{row.value}</strong>
                  </p>
                ))
              )}
            </div>
          )}

          {addOnCatalog.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Add-on services
              </p>
              <div className="mt-2 space-y-2">
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
              <p className="mt-2 text-xs text-slate-500">
                Cab fare ₹{formatInr(reviewFare ? fareAmount(reviewFare) : 0)}
                {addOnCharge > 0 ? ` + add-ons ₹${formatInr(addOnCharge)}` : ""} = ₹
                {formatInr(reviewPrice)}
              </p>
            </div>
          )}
        </section>

        <form onSubmit={submitPrebook}>
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Traveller details
          </p>
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Full name
              </span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#00529B]"
                placeholder="Enter your full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Mobile
                </span>
                <div className="relative mt-1">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-8 text-sm outline-none focus:border-[#00529B]"
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    inputMode="tel"
                    required
                  />
                  {mobileValid && (
                    <FiCheck className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#00529B]"
                  placeholder="you@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="flex items-start gap-2">
                <FaWhatsapp className="mt-0.5 text-lg text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Trip updates on WhatsApp
                  </p>
                  <p className="text-xs text-slate-500">
                    Driver details, OTP and tracking link
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={whatsappConsent}
                className={`relative h-7 w-12 rounded-full transition ${
                  whatsappConsent ? "bg-emerald-500" : "bg-slate-300"
                }`}
                onClick={() => setWhatsappConsent((v) => !v)}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    whatsappConsent ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            How do you want to pay?
          </p>
          <div className="space-y-2">
            <PaymentChoice
              selected={activePaymentMode === "full"}
              title="Pay full online"
              badge="Recommended"
              badgeTone="green"
              description="Done in one go — nothing due to the driver, ever."
              amount={reviewPrice}
              disabled={submitting}
              onSelect={() => choosePaymentMode("full")}
            />
            {partialOffered && (
              <PaymentChoice
                selected={activePaymentMode === "partial"}
                title="Pay part now"
                badge={partialBadge}
                badgeTone="sky"
                description={`Pay ₹${formatInr(advanceAmount)} now. ₹${formatInr(balanceDue)} to the driver after the trip.`}
                amount={advanceAmount}
                disabled={submitting}
                onSelect={() => choosePaymentMode("partial")}
              />
            )}
            {cashOffered && (
              <PaymentChoice
                selected={activePaymentMode === "cash"}
                title="Pay cash to driver"
                badge="Cash"
                badgeTone="amber"
                description="No online payment. Confirm cash and open the booking."
                amount={reviewPrice}
                disabled={submitting}
                onSelect={() => choosePaymentMode("cash")}
              />
            )}
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentTerms}
              onChange={(e) => setConsentTerms(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <span className="font-medium text-sky-600">cab service terms</span> and{" "}
              <span className="font-medium text-sky-600">RailYatri&apos;s terms</span>
            </span>
          </label>

          {bookError && (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {bookError}
            </p>
          )}
          {pendingPaymentLink && (
            <a
              className="mt-3 block text-sm font-medium text-sky-700 underline"
              href={pendingPaymentLink}
              target="_blank"
              rel="noreferrer"
            >
              Open payment page
            </a>
          )}

          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  ₹{formatInr(payNowAmount)}
                </p>
                <p className="text-xs text-slate-500">
                  {activePaymentMode === "partial"
                    ? `Pay now · ₹${formatInr(balanceDue)} due to driver`
                    : activePaymentMode === "cash"
                      ? "Pay cash to the driver"
                      : "Full fare, nothing due to driver"}
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: RAIL_PRIMARY }}
              >
                {submitting
                  ? "Please wait…"
                  : activePaymentMode === "cash"
                    ? "Confirm cash"
                    : "Proceed to pay"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (step === "results") {
    const filters: VehicleFilter[] = ["All", "Hatchback", "Sedan", "SUV"];
    return (
      <div className="mx-auto mt-4 max-w-md pb-8">
        <header className="rounded-xl bg-white px-3 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                className="mt-0.5 rounded-lg p-1 text-slate-600 hover:bg-slate-100"
                onClick={() => setStep("search")}
                aria-label="Back"
              >
                <FiArrowLeft className="text-xl" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {shortPlace(trip?.sourceName || trip?.sourceAddress)} →{" "}
                  {shortPlace(trip?.destinationName || trip?.destinationAddress)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatTripDateTime(trip?.startDatetime)}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: RAIL_PRIMARY, color: RAIL_PRIMARY }}
              onClick={() => setStep("search")}
            >
              Edit
            </button>
          </div>
        </header>

        <p className="mb-2 mt-4 text-base font-semibold text-slate-900">
          Select the cab of your choice
        </p>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = vehicleFilter === filter;
            const label = filter === "All" ? "All cabs" : filter;
            return (
              <button
                key={filter}
                type="button"
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  active ? "text-white" : "border border-slate-200 bg-white text-slate-700"
                }`}
                style={active ? { backgroundColor: RAIL_PRIMARY } : undefined}
                onClick={() => setVehicleFilter(filter)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-sky-600">
          {filteredFares.length} cab{filteredFares.length === 1 ? "" : "s"} · full fare
          for the whole cab · Tolls &amp; taxes included
        </p>

        <div className="mt-3 flex flex-col gap-3">
          {filteredFares.map((fare, index) => {
            const id = String(fare.searchId || `fare-${index}`);
            return (
              <RailCabCard
                key={id}
                fare={fare}
                expanded={expandedId === id}
                onToggleDetails={() =>
                  setExpandedId((current) => (current === id ? "" : id))
                }
                onBook={() => openReview(fare)}
              />
            );
          })}
        </div>

        {filteredFares.length === 0 && (
          <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            No cabs in this filter. Try All cabs.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Fares hold for 15 minutes. Distance and time are approximate road estimates.
        </p>
      </div>
    );
  }

  // Search landing
  return (
    <div className="mx-auto mt-4 max-w-md pb-24">
      <header className="flex items-center justify-between gap-3 rounded-t-xl bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">
            <FiArrowLeft className="text-xl" />
          </span>
          <h2 className="text-lg font-bold text-slate-900">Book Your Cab</h2>
        </div>
        <a
          href="/dashboard/customerCare/HandleBooking"
          className="rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: RAIL_PRIMARY, color: RAIL_PRIMARY }}
        >
          My bookings
        </a>
      </header>

      <div
        className="px-4 pb-10 pt-5 text-sm font-medium leading-snug text-white"
        style={{ backgroundColor: RAIL_PRIMARY_DARK }}
      >
        Cab booked. Journey confirmed. Door-to-door drop. Fixed fare. 100% confirmed
        before you pack.
      </div>

      <section className="-mt-6 mx-3 rounded-xl bg-white p-4 shadow-md">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Pickup
        </p>
        <div className="relative border-b border-slate-100 pb-3">
          <PlacesAutocomplete
            partner={partner}
            value={pickup}
            placeholder="Search pickup station or address"
            sessiontoken={placesSession}
            icon={<FaTrain className="shrink-0 text-[#00529B]" />}
            onInputChange={onPickupTyped}
            onPlaceResolved={(place) => applyResolvedPlace("source", place)}
          />
          <button
            type="button"
            className="absolute -bottom-4 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
            onClick={swapPlaces}
            aria-label="Swap pickup and drop"
          >
            <MdSwapVert />
          </button>
        </div>
        {sourcePlace && (
          <p className="mt-1 text-[10px] text-emerald-600">
            Lat {sourcePlace.latitude.toFixed(5)}, Lng {sourcePlace.longitude.toFixed(5)}
            {sourcePlace.city ? ` · ${sourcePlace.city}` : ""}
          </p>
        )}

        <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Drop
        </p>
        <div className="border-b border-slate-100 pb-3">
          <PlacesAutocomplete
            partner={partner}
            value={drop}
            placeholder="Search drop station or address"
            sessiontoken={placesSession}
            icon={<FiMapPin className="shrink-0 text-rose-500" />}
            onInputChange={onDropTyped}
            onPlaceResolved={(place) => applyResolvedPlace("destination", place)}
          />
        </div>
        {destinationPlace && (
          <p className="mt-1 text-[10px] text-emerald-600">
            Lat {destinationPlace.latitude.toFixed(5)}, Lng{" "}
            {destinationPlace.longitude.toFixed(5)}
            {destinationPlace.city ? ` · ${destinationPlace.city}` : ""}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Date
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2">
              <FiCalendar className="text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {formatTripDate(startLocal) || "Pick date"}
                </p>
                <input
                  type="date"
                  className="mt-0.5 w-full text-xs text-slate-500 outline-none"
                  value={startLocal.slice(0, 10)}
                  onChange={(e) => {
                    const time = startLocal.slice(11, 16) || "14:30";
                    syncField({ startDatetime: `${e.target.value}T${time}` });
                  }}
                />
              </div>
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Pickup time
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2">
              <FiClock className="text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {formatTripTime(startLocal) || "Pick time"}
                </p>
                <input
                  type="time"
                  className="mt-0.5 w-full text-xs text-slate-500 outline-none"
                  value={startLocal.slice(11, 16)}
                  onChange={(e) => {
                    const date = startLocal.slice(0, 10);
                    syncField({ startDatetime: `${date}T${e.target.value}` });
                  }}
                />
              </div>
            </div>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Journey type
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            value={journeyTypeChoice}
            onChange={(event) => {
              const next = event.target.value as JourneyTypeChoice;
              setJourneyTypeChoice(next);
              if (next !== "auto") syncField({ journeyType: next });
            }}
          >
            <option value="auto">Auto (from pickup, drop, km)</option>
            {JOURNEY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-400">
          Earliest slot selected — book at least 2 hrs in advance. Pick places from
          Google suggestions so lat/lng are set before fare search.
          {journeyTypeChoice === "LOCAL"
            ? " LOCAL quotes the covering city package."
            : journeyTypeChoice === "auto"
              ? " Auto never picks LOCAL — choose it here to test city covering packages."
              : ""}
        </p>

        {routeInfo && (
          <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
            {routeInfo}
          </p>
        )}

        <button
          type="button"
          className="mt-4 w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: RAIL_PRIMARY }}
          onClick={search}
          disabled={loading}
        >
          {loading ? "Preparing & searching…" : "Search cabs"}
        </button>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between text-xs font-medium text-slate-500"
          onClick={() => setShowAdvanced((open) => !open)}
        >
          <span>Advanced request JSON (lat/lng, km…)</span>
          {showAdvanced ? <FiChevronDown /> : <FiChevronRight />}
        </button>
        {showAdvanced && (
          <textarea
            className="mt-2 h-48 w-full rounded-lg border border-slate-200 p-2 font-mono text-[11px]"
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            spellCheck={false}
          />
        )}

        {error && (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="mt-2 text-[11px] text-slate-400">
          Searching {partner.toUpperCase()}
          {host ? ` at ${host}` : ""}. Customer-style response (no mojoboxx context).
        </p>
      </section>

      <div className="mx-3 mt-4 flex flex-wrap gap-2">
        {TRUST_PILLS.map((pill) => (
          <span
            key={pill}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
          >
            <FiCheck className="text-emerald-500" />
            {pill}
          </span>
        ))}
      </div>

      <section className="mx-3 mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Your trip. Your rules
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TRIP_RULES.map((rule) => (
            <div key={rule.title} className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{rule.title}</p>
              <p className="mt-1 text-xs text-slate-500">{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-3 mt-8">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Popular from your location
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
            <FiMapPin />
            Using your location
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {POPULAR_ROUTES.map((route) => (
            <button
              key={`${route.from}-${route.to}`}
              type="button"
              className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left shadow-sm"
              onClick={() => {
                syncField({
                  sourceName: `${route.from}`,
                  destinationName: `${route.to}`,
                  kilometer: route.km,
                  duration: route.mins,
                });
              }}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {route.from} — {route.to}
                </p>
                <p className="text-xs text-slate-500">
                  ~{route.km} km · {formatDuration(route.mins)}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {formatInr(route.price)}{" "}
                <span className="text-xs font-normal text-slate-500">
                  total for the cab
                </span>
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-3 mt-8 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">
          The RailYatri Assured Journey
        </h3>
        <ul className="mt-4 space-y-4">
          {ASSURED.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <FiCheck />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-3 mt-8">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          3 steps to your destination
        </h3>
        <ol className="mt-3 space-y-3">
          {STEPS.map((item, index) => (
            <li key={item.title} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: "#5BA3D9" }}
              >
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-3 mt-8 mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Common questions
        </h3>
        <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
          {FAQS.map((faq, index) => {
            const open = openFaq === index;
            return (
              <div key={faq.q} className="border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm font-medium text-slate-800"
                  onClick={() => setOpenFaq(open ? null : index)}
                >
                  {faq.q}
                  {open ? (
                    <FiChevronDown className="shrink-0 text-slate-400" />
                  ) : (
                    <FiChevronRight className="shrink-0 text-slate-400" />
                  )}
                </button>
                {open && (
                  <p className="px-4 pb-3 text-xs leading-relaxed text-slate-500">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-center text-sm font-semibold text-slate-800">
          The price you see is the price you pay.
        </p>
        <p className="mt-1 text-center text-xs text-slate-500">
          One fare for the full cab, not per person. Tolls and taxes included. No meter.
          No surge. Nothing extra at the end.
        </p>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: RAIL_PRIMARY }}
            onClick={search}
            disabled={loading}
          >
            {loading ? "Searching…" : "Check fare on your route"}
          </button>
        </div>
      </div>
    </div>
  );
}
