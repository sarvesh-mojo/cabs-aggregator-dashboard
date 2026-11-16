import { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Button, message } from "antd";
import { useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { RangerPicker } from "../../../components/common/RangePicker";
import PageMeta from "../../../components/common/PageMeta";
import { AnalyticsLoader } from "../../../config/customerCare/helper";
import {
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_LIVE_CITIES_LIST,
} from "../../../config/customerCare/operationsApicall";
import { isRequestCanceled } from "../../../config/apiMethods";
import {
  FareSearchPinPanel,
  FareSearchPinReport,
  parseFareSearchPinReport,
} from "../../../components/analytics/FareSearchPinPanel";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const DISTANCE_OPTIONS = [400, 500, 800, 1500];

const JOURNEY_OPTIONS = [
  { value: "AIRPORT", label: "Airport transfer" },
  { value: "OUTSTATION", label: "Outstation" },
  { value: "LOCAL", label: "Local" },
  { value: "RENTAL", label: "Rental" },
  { value: "", label: "All journey types" },
];

const TRAVEL_OPTIONS = [
  { value: "", label: "Arrival and departure" },
  { value: "Departure", label: "Departure" },
  { value: "Arrival", label: "Arrival" },
];

type Summary = {
  searches: number;
  searchesPerDay: number;
  quotedSearches: number;
  unquotedSearches: number;
  confirmedBookings: number;
  confirmationRate: number;
  avgKm: number | null;
  avgFare: number | null;
};

type DayRow = { date: string; count: number; confirmedBookings: number };
type HourRow = { hour: number; count: number; confirmedBookings: number };
type RouteRow = {
  route: string;
  searches: number;
  searchesPerDay: number;
  avgKm: number | null;
  avgFare: number | null;
  confirmedBookings: number;
};
type SplitRow = { label: string; count: number; confirmedBookings: number };

type Report = {
  summary: Summary;
  byDay: DayRow[];
  byHour: HourRow[];
  topRoutes: RouteRow[];
  travelSplit: SplitRow[];
  journeySplit: SplitRow[];
};

type AirportOption = { code: string; label: string };

const emptySummary = (): Summary => ({
  searches: 0,
  searchesPerDay: 0,
  quotedSearches: 0,
  unquotedSearches: 0,
  confirmedBookings: 0,
  confirmationRate: 0,
  avgKm: null,
  avgFare: null,
});

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNumberOrNull = (value: unknown) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCount = (value: number) => value.toLocaleString("en-IN");

const formatFare = (value: number | null) =>
  value == null ? "—" : `₹${Math.round(value).toLocaleString("en-IN")}`;

const formatKm = (value: number | null) =>
  value == null ? "—" : Math.round(value).toLocaleString("en-IN");

const percent = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0%";

const csvCell = (value: string | number | null | undefined) => {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const csvLine = (cells: Array<string | number | null | undefined>) =>
  cells.map(csvCell).join(",");

const toReport = (raw: Record<string, unknown>): Report => {
  const summaryRaw = (raw.summary || {}) as Record<string, unknown>;
  const summary: Summary = {
    searches: toNumber(summaryRaw.searches),
    searchesPerDay: toNumber(summaryRaw.searchesPerDay),
    quotedSearches: toNumber(summaryRaw.quotedSearches),
    unquotedSearches: toNumber(summaryRaw.unquotedSearches),
    confirmedBookings: toNumber(summaryRaw.confirmedBookings),
    confirmationRate: toNumber(summaryRaw.confirmationRate),
    avgKm: toNumberOrNull(summaryRaw.avgKm),
    avgFare: toNumberOrNull(summaryRaw.avgFare),
  };
  const byDay = (Array.isArray(raw.byDay) ? raw.byDay : []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      date: String(item.date || "").slice(0, 10),
      count: toNumber(item.count),
      confirmedBookings: toNumber(item.confirmedBookings),
    };
  });
  const byHour = (Array.isArray(raw.byHour) ? raw.byHour : []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      hour: toNumber(item.hour),
      count: toNumber(item.count),
      confirmedBookings: toNumber(item.confirmedBookings),
    };
  });
  const topRoutes = (Array.isArray(raw.topRoutes) ? raw.topRoutes : []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      route: String(item.route || ""),
      searches: toNumber(item.searches),
      searchesPerDay: toNumber(item.searchesPerDay),
      avgKm: toNumberOrNull(item.avgKm),
      avgFare: toNumberOrNull(item.avgFare),
      confirmedBookings: toNumber(item.confirmedBookings),
    };
  });
  const splits = (raw.splits || {}) as Record<string, unknown>;
  const travelSplit = (Array.isArray(splits.travelType) ? splits.travelType : []).map(
    (row) => {
      const item = row as Record<string, unknown>;
      return {
        label: String(item.travelType || ""),
        count: toNumber(item.count),
        confirmedBookings: toNumber(item.confirmedBookings),
      };
    },
  );
  const journeySplit = (Array.isArray(splits.journeyType) ? splits.journeyType : []).map(
    (row) => {
      const item = row as Record<string, unknown>;
      return {
        label: String(item.journeyType || ""),
        count: toNumber(item.count),
        confirmedBookings: toNumber(item.confirmedBookings),
      };
    },
  );
  return { summary, byDay, byHour, topRoutes, travelSplit, journeySplit };
};

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800";

const DEFINITIONS: Array<{ term: string; text: string }> = [
  {
    term: "Searches",
    text: "Each time someone looked up a cab fare for this airport, travel type, journey type, and date range. One search is one lookup, not a booking.",
  },
  {
    term: "Per day",
    text: "Searches divided by the days in the range, including the first day and the last day.",
  },
  {
    term: "Quoted",
    text: "A partner sent back at least one fare. The percentage is quoted searches divided by all searches.",
  },
  {
    term: "Not quoted",
    text: "No partner priced the trip. These are people who asked for a cab and got no fare.",
  },
  {
    term: "Confirmed",
    text: "The search became a booking that was confirmed. Completed trips count. A booking cancelled after confirmation still counts, because it was confirmed first. The rate is confirmed bookings divided by searches.",
  },
  {
    term: "Avg km",
    text: "Average distance stored on the search.",
  },
  {
    term: "Avg fare",
    text: "The typical fare quoted on each search, then averaged. Searches with no quote are left out. This is not an average of every cab option shown for one search.",
  },
  {
    term: "By day and by hour",
    text: "When the search was made, in India time. This is not the pickup time. Orange bars are the confirmed bookings from those searches.",
  },
  {
    term: "Top routes",
    text: "The other end of the trip. A Delhi search to Agra and an Agra search back to Delhi both show as Agra. Hinjawadi is counted as Pune.",
  },
  {
    term: "Distance cap",
    text: "Hides routes longer than this from the table only. The cards above still include those searches. A Delhi–Bengaluru quote stays off the table at 500 km.",
  },
  {
    term: "Airport",
    text: "Delhi includes Hindon. Mumbai includes Navi Mumbai. A search matches the city code or the airport code.",
  },
  {
    term: "Travel type",
    text: "Departure is a ride to the airport. Arrival is a ride from the airport.",
  },
  {
    term: "Journey type",
    text: "Airport transfer is the usual airport cab. Outstation is a trip out of the city. Local and rental are the other trip types. Airport transfer is the default because it is most of the volume.",
  },
  {
    term: "Pincodes",
    text: "The PIN is taken from the passenger address, the pickup on a departure and the drop on an arrival. Nearby PINs are one garage. Avg fare is the typical quote for searches in that garage. Type a 6-digit PIN to look that one up.",
  },
];

export const FareSearchAnalytics = () => {
  const selectedPartner =
    useSelector(
      (state: { operationStore?: { ReportSelectedPartner?: string } }) =>
        state?.operationStore?.ReportSelectedPartner,
    ) || "indigo";

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = getTodayIST();
    return [today, today];
  });
  const [airportCode, setAirportCode] = useState("DEL");
  const [travelType, setTravelType] = useState("");
  const [journeyType, setJourneyType] = useState("AIRPORT");
  const [maxKm, setMaxKm] = useState(500);
  const [pinKm, setPinKm] = useState(80);
  const [pinQuery, setPinQuery] = useState("");
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [pinReport, setPinReport] = useState<FareSearchPinReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const partner = !selectedPartner || selectedPartner === "all" ? "indigo" : selectedPartner;

  useEffect(() => {
    let active = true;
    const loadCities = async () => {
      try {
        const response = await GET_LIVE_CITIES_LIST(partner);
        if (!active || !Array.isArray(response)) return;
        const byCode = new Map<string, AirportOption>();
        response.forEach((city) => {
          const code = String(city?.airportCode || city?.code || "")
            .trim()
            .toUpperCase();
          if (!code || byCode.has(code)) return;
          const cityName = String(city?.sourceCity || city?.city || "").trim();
          byCode.set(code, {
            code,
            label: cityName ? `${cityName} (${code})` : code,
          });
        });
        setAirports(
          [...byCode.values()].sort((a, b) => a.label.localeCompare(b.label)),
        );
      } catch {
        if (active) setAirports([]);
      }
    };
    loadCities();
    return () => {
      active = false;
    };
  }, [partner]);

  const loadReport = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await GET_CUSTOM_BOOKING_STATISTICS(
          partner,
          {
            reportType: "fare_search_summary",
            from: dateRange[0],
            to: dateRange[1],
            limit: 10,
            maxKm,
            ...(airportCode ? { airportCode } : {}),
            ...(travelType ? { travelType } : {}),
            ...(journeyType ? { journeyType } : {}),
          },
          signal,
        );
        const payload =
          response && !Array.isArray(response)
            ? (response as unknown as Record<string, unknown>)
            : {};
        setReport(toReport(payload));
      } catch (error) {
        if (isRequestCanceled(error)) return;
        setReport(null);
        message.error("Could not load fare search analytics.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [airportCode, dateRange, journeyType, maxKm, partner, travelType],
  );

  const focusPin = /^\d{6}$/.test(pinQuery) ? pinQuery : "";

  const loadPins = useCallback(
    async (signal?: AbortSignal) => {
      if (!airportCode && !focusPin) {
        setPinReport(null);
        setPinLoading(false);
        return;
      }
      setPinLoading(true);
      try {
        const response = await GET_CUSTOM_BOOKING_STATISTICS(
          partner,
          {
            reportType: "fare_search_pins",
            from: dateRange[0],
            to: dateRange[1],
            pinKm,
            ...(airportCode ? { airportCode } : {}),
            ...(focusPin ? { pin: focusPin } : {}),
            ...(travelType ? { travelType } : {}),
            ...(journeyType ? { journeyType } : {}),
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
    [airportCode, dateRange, focusPin, journeyType, partner, pinKm, travelType],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadReport(controller.signal);
    return () => controller.abort();
  }, [loadReport]);

  useEffect(() => {
    const controller = new AbortController();
    loadPins(controller.signal);
    return () => controller.abort();
  }, [loadPins]);

  const days = useMemo(() => {
    const rows = new Map((report?.byDay || []).map((row) => [row.date, row]));
    const points: Array<{ date: string; label: string; searches: number; confirmed: number }> = [];
    const cursor = moment(dateRange[0]);
    const end = moment(dateRange[1]);
    while (cursor.isSameOrBefore(end, "day")) {
      const key = cursor.format("YYYY-MM-DD");
      const row = rows.get(key);
      points.push({
        date: key,
        label: cursor.format("D MMM"),
        searches: row?.count || 0,
        confirmed: row?.confirmedBookings || 0,
      });
      cursor.add(1, "day");
    }
    return points;
  }, [dateRange, report]);

  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const row = report?.byHour?.find((item) => item.hour === hour);
      return {
        hour,
        label: String(hour).padStart(2, "0"),
        searches: row?.count || 0,
        confirmed: row?.confirmedBookings || 0,
      };
    });
  }, [report]);

  const peakHour = useMemo(() => {
    return hours.reduce(
      (best, hour) => (hour.searches > best.searches ? hour : best),
      hours[0],
    );
  }, [hours]);

  const airportLabel =
    airports.find((airport) => airport.code === airportCode)?.label ||
    (airportCode ? airportCode : "All airports");
  const travelLabel =
    TRAVEL_OPTIONS.find((option) => option.value === travelType)?.label || "Arrival and departure";
  const journeyLabel =
    JOURNEY_OPTIONS.find((option) => option.value === journeyType)?.label || "All journey types";

  const downloadReport = () => {
    if (!report) return;
    const summary = report.summary;
    const lines = [
      csvLine(["Fare search analytics"]),
      csvLine(["From", dateRange[0]]),
      csvLine(["To", dateRange[1]]),
      csvLine(["Partner", partner]),
      csvLine(["Airport", airportLabel]),
      csvLine(["Travel type", travelLabel]),
      csvLine(["Journey type", journeyLabel]),
      csvLine(["Distance cap km", maxKm]),
      "",
      csvLine(["Summary"]),
      csvLine(["Searches", summary.searches]),
      csvLine(["Searches per day", summary.searchesPerDay]),
      csvLine(["Quoted", summary.quotedSearches]),
      csvLine(["Not quoted", summary.unquotedSearches]),
      csvLine(["Confirmed bookings", summary.confirmedBookings]),
      csvLine(["Confirmation %", summary.confirmationRate]),
      csvLine(["Avg km", summary.avgKm]),
      csvLine(["Avg fare", summary.avgFare]),
      "",
      csvLine(["By day"]),
      csvLine(["Date", "Searches", "Confirmed bookings"]),
      ...days.map((day) => csvLine([day.date, day.searches, day.confirmed])),
      "",
      csvLine(["By hour IST"]),
      csvLine(["Hour", "Searches", "Confirmed bookings"]),
      ...hours.map((hour) => csvLine([hour.label, hour.searches, hour.confirmed])),
      "",
      csvLine(["Top routes"]),
      csvLine(["Route", "Searches", "Per day", "Avg km", "Avg fare", "Confirmed bookings"]),
      ...report.topRoutes.map((route) =>
        csvLine([
          route.route,
          route.searches,
          route.searchesPerDay,
          route.avgKm,
          route.avgFare,
          route.confirmedBookings,
        ]),
      ),
    ];
    if (report.travelSplit.length) {
      lines.push(
        "",
        csvLine(["Travel type split"]),
        csvLine(["Travel type", "Searches", "Confirmed bookings"]),
        ...report.travelSplit.map((row) =>
          csvLine([row.label, row.count, row.confirmedBookings]),
        ),
      );
    }
    if (report.journeySplit.length) {
      lines.push(
        "",
        csvLine(["Journey type split"]),
        csvLine(["Journey type", "Searches", "Confirmed bookings"]),
        ...report.journeySplit.map((row) =>
          csvLine([row.label, row.count, row.confirmedBookings]),
        ),
      );
    }
    if (pinReport) {
      lines.push(
        "",
        csvLine(["Pincodes"]),
        csvLine(["Within km", pinKm]),
        csvLine(["Searches in slice", pinReport.summary.searches]),
        csvLine(["Searches with a PIN", pinReport.summary.withPin]),
        csvLine(["Garage", "PIN", "PINs in garage", "Searches", "Per day", "Avg km", "Avg fare", "Latitude", "Longitude"]),
        ...pinReport.garages.map((garage) =>
          csvLine([
            garage.label,
            garage.pin,
            garage.pins.join(" "),
            garage.searches,
            garage.searchesPerDay,
            garage.avgKm,
            garage.avgFare,
            garage.lat,
            garage.lng,
          ]),
        ),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fare_search_analytics_${airportCode || "all"}_${dateRange[0]}_${dateRange[1]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const summary = report?.summary || emptySummary();
  const hasSearches = summary.searches > 0;

  return (
    <>
      <PageMeta
        title="Fare search analytics"
        description="Filtered fare-search volume, quotes, and corresponding confirmed bookings"
      />
      <PartnerTab propsData={{ isall: false }} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Fare search analytics</h1>
          <p className="text-sm text-slate-500">
            How many people looked up a fare, whether a partner quoted one, and how many of those searches became a confirmed booking.
          </p>
        </div>
        <Button type="primary" disabled={!report || loading} onClick={downloadReport}>
          Download CSV
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <RangerPicker updateDate={dateRange} selectedRange={setDateRange} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Airport
          <select
            value={airportCode}
            onChange={(event) => setAirportCode(event.target.value)}
            className={selectClass}
          >
            <option value="">All airports</option>
            {airports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.label}
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
          Journey type
          <select
            value={journeyType}
            onChange={(event) => setJourneyType(event.target.value)}
            className={selectClass}
          >
            {JOURNEY_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
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
      </div>

      <details className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          What these numbers mean
        </summary>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {DEFINITIONS.map((item) => (
            <div key={item.term}>
              <dt className="text-sm font-medium text-slate-800">{item.term}</dt>
              <dd className="text-sm leading-snug text-slate-600">{item.text}</dd>
            </div>
          ))}
        </dl>
      </details>

      {loading ? (
        <AnalyticsLoader height="h-[640px]" />
      ) : !report ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
          Fare search analytics could not be loaded for this slice.
        </div>
      ) : !hasSearches ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
          No fare searches in this slice.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Metric
              label="Searches"
              value={formatCount(summary.searches)}
              definition="Fare lookups, not bookings"
            />
            <Metric
              label="Per day"
              value={summary.searchesPerDay.toFixed(1)}
              definition="Searches ÷ days selected"
            />
            <Metric
              label="Quoted"
              value={formatCount(summary.quotedSearches)}
              hint={percent(summary.quotedSearches, summary.searches)}
              definition="A partner returned a fare"
            />
            <Metric
              label="Not quoted"
              value={formatCount(summary.unquotedSearches)}
              definition="No partner priced the trip"
            />
            <Metric
              label="Confirmed"
              value={formatCount(summary.confirmedBookings)}
              hint={`${summary.confirmationRate.toFixed(1)}% of searches`}
              definition="Search became a confirmed booking"
            />
            <Metric
              label="Avg km"
              value={formatKm(summary.avgKm)}
              definition="Average trip distance"
            />
            <Metric
              label="Avg fare"
              value={formatFare(summary.avgFare)}
              definition="Average quote per search"
            />
          </div>

          {(report.travelSplit.length > 0 || report.journeySplit.length > 0) && (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              {report.travelSplit.length > 0 && (
                <SplitTable title="Arrival and departure" rows={report.travelSplit} />
              )}
              {report.journeySplit.length > 0 && (
                <SplitTable title="Journey type" rows={report.journeySplit} />
              )}
            </div>
          )}

          <div className="mb-4 grid gap-3 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">Searches by day</h2>
              <p className="mb-3 text-xs text-slate-500">
                Each bar is the day the fare was looked up. Orange is how many of those searches were confirmed.
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="searches" name="Searches" fill="#1d4e89" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="confirmed" name="Confirmed bookings" fill="#d97706" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">Searches by hour (IST)</h2>
              <p className="mb-3 text-xs text-slate-500">
                Hour the search was made, in India time, not the pickup time. Peak {peakHour.label}:00 ·{" "}
                {formatCount(peakHour.searches)} searches
                {peakHour.confirmed
                  ? ` · ${formatCount(peakHour.confirmed)} confirmed`
                  : ""}
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hours}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="searches" name="Searches" fill="#1d4e89" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="confirmed" name="Confirmed bookings" fill="#d97706" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">Top routes</h2>
            <p className="mb-3 text-xs text-slate-500">
              The other end of the trip. Both directions count as the same place. Routes longer than {maxKm} km
              are hidden here only. Confirmed is how many of that route’s searches became a booking.
            </p>
            {report.topRoutes.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No routes under {maxKm} km in this slice.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-medium">Route</th>
                      <th className="px-3 py-2 text-right font-medium">Searches</th>
                      <th className="px-3 py-2 text-right font-medium">Per day</th>
                      <th className="px-3 py-2 text-right font-medium">Avg km</th>
                      <th className="px-3 py-2 text-right font-medium">Avg fare</th>
                      <th className="px-3 py-2 text-right font-medium">Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topRoutes.map((route) => (
                      <tr key={route.route} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800">{route.route}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCount(route.searches)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{route.searchesPerDay.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatKm(route.avgKm)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatFare(route.avgFare)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCount(route.confirmedBookings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {!airportCode && !focusPin ? (
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-800">Pincodes</h2>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  PIN
                  <input
                    value={pinQuery}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="452009"
                    onChange={(event) =>
                      setPinQuery(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
              </div>
              <p className="text-sm text-slate-500">
                Pick an airport to list garage spots, or type a 6-digit PIN such as 452009 to look that one up.
              </p>
            </section>
          ) : pinLoading ? (
            <div className="mt-4">
              <AnalyticsLoader height="h-80" />
            </div>
          ) : pinReport ? (
            <FareSearchPinPanel
              report={pinReport}
              pinKm={pinKm}
              onPinKmChange={setPinKm}
              pinQuery={pinQuery}
              onPinQueryChange={setPinQuery}
              airportLabel={airportCode ? airportLabel : ""}
            />
          ) : null}
        </>
      )}
    </>
  );
};

const Metric = ({
  label,
  value,
  hint,
  definition,
}: {
  label: string;
  value: string;
  hint?: string;
  definition?: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
    {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    {definition ? <div className="mt-1 text-[11px] leading-snug text-slate-500">{definition}</div> : null}
  </div>
);

const SplitTable = ({ title, rows }: { title: string; rows: SplitRow[] }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="mb-1 text-sm font-semibold text-slate-800">{title}</h2>
    <p className="mb-2 text-xs text-slate-500">
      Shown because this filter is set to all. Confirmed is the bookings that came from those searches.
    </p>
    <table className="min-w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <th className="px-2 py-1.5 font-medium">Slice</th>
          <th className="px-2 py-1.5 text-right font-medium">Searches</th>
          <th className="px-2 py-1.5 text-right font-medium">Confirmed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-100">
            <td className="px-2 py-1.5">{row.label}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{formatCount(row.count)}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">
              {formatCount(row.confirmedBookings)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
