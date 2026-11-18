import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { useSelector } from "react-redux";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { RangerPicker } from "../../../components/common/RangePicker";
import PageMeta from "../../../components/common/PageMeta";
import { AnalyticsLoader } from "../../../config/customerCare/helper";
import { AvailablecabPartners } from "../../../config/customerCare/constant";
import { GET_CUSTOM_BOOKING_STATISTICS } from "../../../config/customerCare/operationsApicall";
import { isRequestCanceled } from "../../../config/apiMethods";
import {
  IndiaRouteMap,
  MetroRoute,
} from "../../../components/analytics/IndiaRouteMap";
import { PinDensityMap } from "../../../components/analytics/PinDensityMap";
import {
  FareSearchPinReport,
  garagesToPoints,
  parseFareSearchPinReport,
} from "../../../components/analytics/FareSearchPinPanel";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const ROUTE_LIMIT = 20;
const SPOT_LIMIT = 20;
const DISTANCE_OPTIONS = [400, 500, 800, 1500];
const PER_KM_OPTIONS = [
  { value: 0, label: "Any ₹/km" },
  { value: 15, label: "≤ ₹15/km" },
  { value: 20, label: "≤ ₹20/km" },
  { value: 25, label: "≤ ₹25/km" },
  { value: 30, label: "≤ ₹30/km" },
  { value: 40, label: "≤ ₹40/km" },
];

const JOURNEY_OPTIONS = [
  { value: "OUTSTATION", label: "Outstation" },
  { value: "AIRPORT", label: "Airport transfer" },
  { value: "LOCAL", label: "Local" },
  { value: "RENTAL", label: "Rental" },
  { value: "ALL", label: "All journey types" },
];

const TRAVEL_OPTIONS = [
  { value: "", label: "Arrival and departure" },
  { value: "Departure", label: "Departure" },
  { value: "Arrival", label: "Arrival" },
];

const METRO_AIRPORTS = [
  { city: "Delhi", code: "DEL" },
  { city: "Mumbai", code: "BOM" },
  { city: "Bengaluru", code: "BLR" },
  { city: "Pune", code: "PNQ" },
  { city: "Chennai", code: "MAA" },
  { city: "Hyderabad", code: "HYD" },
  { city: "Ahmedabad", code: "AMD" },
  { city: "Chandigarh", code: "IXC" },
  { city: "Kochi", code: "COK" },
  { city: "Lucknow", code: "LKO" },
  { city: "Kolkata", code: "CCU" },
] as const;

const CITY_PIN_KM = 80;

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800";

const toNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRoute = (row: Record<string, unknown>): MetroRoute | null => {
  const originLat = toNumber(row.originLat);
  const originLng = toNumber(row.originLng);
  const destLat = toNumber(row.destLat);
  const destLng = toNumber(row.destLng);
  const city = String(row.city ?? "");
  const route = String(row.route ?? "");
  if (!city || !route || originLat == null || originLng == null || destLat == null || destLng == null) {
    return null;
  }
  const avgKm = toNumber(row.avgKm) ?? 0;
  const minFare = toNumber(row.minFare);
  const perKmFromApi = toNumber(row.perKmRate);
  const perKmRate =
    perKmFromApi ??
    (minFare != null && avgKm > 0 ? Math.round((minFare / avgKm) * 10) / 10 : null);
  return {
    city,
    route,
    searches: toNumber(row.searches) ?? 0,
    searchesPerDay: toNumber(row.searchesPerDay) ?? 0,
    avgKm,
    minFare,
    perKmRate,
    originLat,
    originLng,
    destLat,
    destLng,
  };
};

export const MetroRouteMap = () => {
  const selectedPartner =
    useSelector((state: { operationStore?: { ReportSelectedPartner?: string } }) =>
      state?.operationStore?.ReportSelectedPartner,
    ) || "indigo";

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = getTodayIST();
    return [today, today];
  });
  const [maxKm, setMaxKm] = useState(500);
  const [maxPerKmRate, setMaxPerKmRate] = useState(0);
  const [journeyType, setJourneyType] = useState("OUTSTATION");
  const [travelType, setTravelType] = useState("");
  const [airportCode, setAirportCode] = useState("");
  const [cabPartner, setCabPartner] = useState("");
  const [pinCity, setPinCity] = useState("Delhi");
  const [routes, setRoutes] = useState<MetroRoute[]>([]);
  const [pinReport, setPinReport] = useState<FareSearchPinReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const partner = !selectedPartner || selectedPartner === "all" ? "indigo" : selectedPartner;

  const loadRoutes = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await GET_CUSTOM_BOOKING_STATISTICS(
          partner,
          {
            reportType: "metro_top_routes",
            from: dateRange[0],
            to: dateRange[1],
            limit: ROUTE_LIMIT,
            maxKm,
            journeyType,
            ...(travelType ? { travelType } : {}),
            ...(airportCode ? { airportCode } : {}),
            ...(cabPartner ? { cabPartner } : {}),
            ...(maxPerKmRate > 0 ? { maxPerKmRate } : {}),
          },
          signal,
        );
        const rows = Array.isArray(response) ? response : [];
        setRoutes(
          rows
            .map((row) => toRoute(row as Record<string, unknown>))
            .filter((row): row is MetroRoute => row != null),
        );
      } catch (error) {
        if (isRequestCanceled(error)) return;
        setRoutes([]);
        message.error("Could not load metro route map.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [airportCode, cabPartner, dateRange, journeyType, maxKm, maxPerKmRate, partner, travelType],
  );

  const pinAirport =
    airportCode ||
    METRO_AIRPORTS.find((metro) => metro.city === pinCity)?.code ||
    "DEL";

  const loadPins = useCallback(
    async (signal?: AbortSignal) => {
      setPinLoading(true);
      try {
        const response = await GET_CUSTOM_BOOKING_STATISTICS(
          partner,
          {
            reportType: "fare_search_pins",
            from: dateRange[0],
            to: dateRange[1],
            pinKm: CITY_PIN_KM,
            airportCode: pinAirport,
            ...(travelType ? { travelType } : {}),
            ...(journeyType && journeyType !== "ALL" ? { journeyType } : {}),
            ...(cabPartner ? { cabPartner } : {}),
          },
          signal,
        );
        const payload =
          response && !Array.isArray(response)
            ? (response as unknown as Record<string, unknown>)
            : {};
        setPinReport(parseFareSearchPinReport(payload));
      } catch (error) {
        if (isRequestCanceled(error)) return;
        setPinReport(null);
        message.error("Could not load the pincode map.");
      } finally {
        if (!signal?.aborted) setPinLoading(false);
      }
    },
    [cabPartner, dateRange, journeyType, partner, pinAirport, travelType],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadRoutes(controller.signal);
    return () => controller.abort();
  }, [loadRoutes]);

  useEffect(() => {
    const controller = new AbortController();
    loadPins(controller.signal);
    return () => controller.abort();
  }, [loadPins]);

  useEffect(() => {
    setSelectedPin(null);
  }, [pinCity, pinAirport, dateRange, partner, journeyType, travelType, cabPartner]);

  useEffect(() => {
    if (!airportCode) return;
    const match = METRO_AIRPORTS.find((metro) => metro.code === airportCode);
    if (match) setPinCity(match.city);
  }, [airportCode]);

  const pinPoints = pinReport ? garagesToPoints(pinReport.garages) : [];
  const topPins = [...(pinReport?.garages || [])].sort((a, b) => b.searches - a.searches);

  return (
    <>
      <PageMeta
        title="Metro route map"
        description="Top searched outstation routes from metro cities"
      />
      <div className="flex h-[calc(100dvh-6.25rem)] min-h-[640px] flex-col">
      <div className="shrink-0">
        <PartnerTab propsData={{ isall: false }} />
      </div>
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-3">
        <RangerPicker updateDate={dateRange} selectedRange={setDateRange} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Journey type
          <select
            value={journeyType}
            onChange={(event) => setJourneyType(event.target.value)}
            className={selectClass}
          >
            {JOURNEY_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Travel type
          <select
            value={travelType}
            onChange={(event) => setTravelType(event.target.value)}
            className={selectClass}
          >
            {TRAVEL_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          City / airport
          <select
            value={airportCode}
            onChange={(event) => setAirportCode(event.target.value)}
            className={selectClass}
          >
            <option value="">All metros</option>
            {METRO_AIRPORTS.map((metro) => (
              <option key={metro.code} value={metro.code}>
                {metro.city} ({metro.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Cab partner
          <select
            value={cabPartner}
            onChange={(event) => setCabPartner(event.target.value)}
            className={selectClass}
          >
            <option value="">All partners</option>
            {AvailablecabPartners.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Hide routes longer than
          <select
            value={maxKm}
            onChange={(event) => setMaxKm(Number(event.target.value))}
            className={selectClass}
          >
            {DISTANCE_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Max ₹/km
          <select
            value={maxPerKmRate}
            onChange={(event) => setMaxPerKmRate(Number(event.target.value))}
            className={selectClass}
          >
            {PER_KM_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          PIN map
          <select
            value={pinCity}
            onChange={(event) => {
              setPinCity(event.target.value);
              const match = METRO_AIRPORTS.find((metro) => metro.city === event.target.value);
              if (match) setAirportCode(match.code);
            }}
            className={selectClass}
          >
            {METRO_AIRPORTS.map((metro) => (
              <option key={metro.code} value={metro.city}>
                {metro.city}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
      {loading ? (
        <AnalyticsLoader height="h-full" />
      ) : routes.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
          No routes in this date range under {maxKm} km
          {maxPerKmRate > 0 ? ` and ≤ ₹${maxPerKmRate}/km` : ""}.
        </div>
      ) : (
        <IndiaRouteMap
          className="h-full"
          routes={routes}
          from={dateRange[0]}
          to={dateRange[1]}
          maxKm={maxKm}
          limit={ROUTE_LIMIT}
          onCityChange={(city) => {
            if (city) {
              setPinCity(city);
              const match = METRO_AIRPORTS.find((metro) => metro.city === city);
              if (match) setAirportCode(match.code);
            }
          }}
        />
      )}
      </div>
      </div>
      <section className="mt-4 h-[calc(100dvh-5.5rem)] min-h-[640px]">
        {pinLoading ? (
          <AnalyticsLoader height="h-full" />
        ) : pinPoints.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center text-sm text-slate-500">
            No pincodes for {pinCity} fare searches within {CITY_PIN_KM} km in this date range.
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1">
            <PinDensityMap
              fill
              title={`${pinCity} search demand by PIN`}
              subtitle={`${dateRange[0]} to ${dateRange[1]} · within ${CITY_PIN_KM} km · deeper colour is more searches · click a pin to zoom`}
              points={pinPoints}
              selectedId={selectedPin}
              onSelect={setSelectedPin}
            />
            <aside className="flex h-[min(520px,55vh)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-full">
              <h3 className="shrink-0 text-sm font-semibold text-slate-800">Top {SPOT_LIMIT} origin spots</h3>
              <p className="mt-1 shrink-0 text-xs text-slate-500">
                Click a spot to frame it. Searches are fare lookups, not bookings. Nearby PINs within 6 km
                are one spot.
              </p>
              <ul className="mt-3 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                {topPins.slice(0, SPOT_LIMIT).map((garage) => {
                  const active = selectedPin === garage.pin;
                  const perKm =
                    garage.avgFare != null && garage.avgKm
                      ? Math.round((garage.avgFare / garage.avgKm) * 10) / 10
                      : null;
                  return (
                    <li key={garage.pin}>
                      <button
                        type="button"
                        onClick={() => setSelectedPin(active ? null : garage.pin)}
                        className={`w-full py-2 text-left ${active ? "bg-slate-50" : ""}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            {garage.label} · {garage.pin}
                          </span>
                          <span className="text-sm tabular-nums text-slate-700">
                            {garage.searches.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {garage.searchesPerDay.toFixed(1)}/day
                          {garage.avgKm == null ? "" : ` · ${garage.avgKm.toLocaleString("en-IN")} km`}
                          {garage.avgFare == null
                            ? ""
                            : ` · ₹${Math.round(garage.avgFare).toLocaleString("en-IN")}`}
                          {perKm == null ? "" : ` · ₹${perKm.toFixed(1)}/km`}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        )}
      </section>
    </>
  );
};
