import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, message } from "antd";
import { useSelector } from "react-redux";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { RangerPicker } from "../../../components/common/RangePicker";
import PageMeta from "../../../components/common/PageMeta";
import { AnalyticsLoader } from "../../../config/customerCare/helper";
import {
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_LIVE_CITIES_LIST,
} from "../../../config/customerCare/operationsApicall";
import { isRequestCanceled } from "../../../config/apiMethods";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800";

const HIDDEN_PARTNERS = new Set(["MOJOCABS", "IBFAIL", "IBCFAIL"]);

const JOURNEY_OPTIONS = [
  { value: "", label: "All journey types" },
  { value: "AIRPORT", label: "Airport transfer" },
  { value: "OUTSTATION", label: "Outstation" },
  { value: "LOCAL", label: "Local" },
  { value: "RENTAL", label: "Rental" },
];

const TRAVEL_OPTIONS = [
  { value: "", label: "Arrival and departure" },
  { value: "Arrival", label: "Arrival" },
  { value: "Departure", label: "Departure" },
];

const isVisiblePartner = (partner: string) =>
  !HIDDEN_PARTNERS.has(String(partner || "").trim().toUpperCase());

type CityOption = { code: string; label: string };

type PerformanceRow = {
  date: string;
  cityCode: string;
  cityCategory: number;
  cityCategoryLabel: string;
  partner: string;
  live: boolean;
  search: number;
  book: number;
  bestPct: number;
  supplyPct: number;
  npsScore: number | null;
  npsResponses: number;
};

type CategoryOption = { value: number; label: string };

type Report = {
  summary: {
    from: string;
    to: string;
    cityCode: string;
    cabPartner: string;
    journeyType: string;
    travelType: string;
    top25Category: number | null;
    citySearches: number;
    partners: number;
    rows: number;
  };
  filters: {
    cities: Array<{
      code: string;
      searches: number;
      category: number;
      categoryLabel: string;
    }>;
    categories: CategoryOption[];
    partners: string[];
    journeyTypes: string[];
    travelTypes: string[];
  };
  rows: PerformanceRow[];
};

const emptyReport = (): Report => ({
  summary: {
    from: "",
    to: "",
    cityCode: "",
    cabPartner: "",
    journeyType: "",
    travelType: "",
    top25Category: null,
    citySearches: 0,
    partners: 0,
    rows: 0,
  },
  filters: {
    cities: [],
    categories: [],
    partners: [],
    journeyTypes: [],
    travelTypes: [],
  },
  rows: [],
});

const toNullableNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseReport = (payload: Record<string, unknown>): Report => {
  const summaryRaw =
    payload.summary && typeof payload.summary === "object"
      ? (payload.summary as Record<string, unknown>)
      : {};
  const filtersRaw =
    payload.filters && typeof payload.filters === "object"
      ? (payload.filters as Record<string, unknown>)
      : {};
  const rowsRaw = Array.isArray(payload.rows) ? payload.rows : [];

  const cities = Array.isArray(filtersRaw.cities)
    ? filtersRaw.cities.map((item) => {
        const row = (item || {}) as Record<string, unknown>;
        return {
          code: String(row.code || "").toUpperCase(),
          searches: toNumber(row.searches),
          category: toNumber(row.category),
          categoryLabel: String(row.categoryLabel || ""),
        };
      })
    : [];

  const categories = Array.isArray(filtersRaw.categories)
    ? filtersRaw.categories.map((item) => {
        const row = (item || {}) as Record<string, unknown>;
        return {
          value: toNumber(row.value),
          label: String(row.label || ""),
        };
      })
    : [];

  const partners = Array.isArray(filtersRaw.partners)
    ? filtersRaw.partners
        .map((p) => String(p || "").toUpperCase())
        .filter((p) => p && isVisiblePartner(p))
    : [];

  const journeyTypes = Array.isArray(filtersRaw.journeyTypes)
    ? filtersRaw.journeyTypes
        .map((item) => String(item || "").toUpperCase())
        .filter(Boolean)
    : [];

  const travelTypes = Array.isArray(filtersRaw.travelTypes)
    ? filtersRaw.travelTypes
        .map((item) => String(item || "").toLowerCase())
        .filter(Boolean)
    : [];

  const rows: PerformanceRow[] = rowsRaw
    .map((item) => {
      const row = (item || {}) as Record<string, unknown>;
      const partner = String(row.partner || "").toUpperCase();
      if (!isVisiblePartner(partner)) return null;
      return {
        date: String(row.date || ""),
        cityCode: String(row.cityCode || "").toUpperCase(),
        cityCategory: toNumber(row.cityCategory),
        cityCategoryLabel: String(row.cityCategoryLabel || ""),
        partner,
        live: Boolean(row.live),
        search: toNumber(row.search),
        book: toNumber(row.book),
        bestPct: toNumber(row.bestPct),
        supplyPct: toNumber(row.supplyPct),
        npsScore: toNullableNumber(row.npsScore),
        npsResponses: toNumber(row.npsResponses),
      };
    })
    .filter((row): row is PerformanceRow => row != null);

  return {
    summary: {
      from: String(summaryRaw.from || ""),
      to: String(summaryRaw.to || ""),
      cityCode: String(summaryRaw.cityCode || ""),
      cabPartner: String(summaryRaw.cabPartner || ""),
      journeyType: String(summaryRaw.journeyType || ""),
      travelType: String(summaryRaw.travelType || ""),
      top25Category:
        summaryRaw.top25Category == null
          ? null
          : toNumber(summaryRaw.top25Category),
      citySearches: toNumber(summaryRaw.citySearches),
      partners: toNumber(summaryRaw.partners),
      rows: toNumber(summaryRaw.rows),
    },
    filters: { cities, categories, partners, journeyTypes, travelTypes },
    rows,
  };
};

const csvCell = (value: string | number | boolean | null | undefined) => {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const csvLine = (cells: Array<string | number | boolean | null | undefined>) =>
  cells.map(csvCell).join(",");

const formatCount = (value: number) => value.toLocaleString("en-IN");

const formatNps = (score: number | null, responses: number) => {
  if (score == null || responses <= 0) return "—";
  return `${score}%`;
};

const npsTone = (score: number | null) => {
  if (score == null) return "text-slate-400";
  if (score >= 50) return "text-emerald-700";
  if (score >= 0) return "text-amber-700";
  return "text-rose-700";
};

export const PartnerPerformance = () => {
  const selectedPartner =
    useSelector(
      (state: { operationStore?: { ReportSelectedPartner?: string } }) =>
        state?.operationStore?.ReportSelectedPartner,
    ) || "indigo";

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = getTodayIST();
    return [today, today];
  });
  const [cityCode, setCityCode] = useState("BOM");
  const [top25Category, setTop25Category] = useState("");
  const [cabPartner, setCabPartner] = useState("");
  const [journeyType, setJourneyType] = useState("");
  const [travelType, setTravelType] = useState("");
  const [airports, setAirports] = useState<CityOption[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const partner =
    !selectedPartner || selectedPartner === "all" ? "indigo" : selectedPartner;

  useEffect(() => {
    let active = true;
    const loadCities = async () => {
      try {
        const response = await GET_LIVE_CITIES_LIST(partner);
        if (!active || !Array.isArray(response)) return;
        const byCode = new Map<string, CityOption>();
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
            reportType: "partner_performance",
            from: dateRange[0],
            to: dateRange[1],
            ...(cityCode ? { cityCode } : {}),
            ...(cabPartner ? { cabPartner } : {}),
            ...(journeyType ? { journeyType } : {}),
            ...(travelType ? { travelType } : {}),
            ...(top25Category ? { top25Category: Number(top25Category) } : {}),
          },
          signal,
        );
        const payload =
          response && !Array.isArray(response)
            ? (response as unknown as Record<string, unknown>)
            : {};
        setReport(parseReport(payload));
      } catch (error) {
        if (isRequestCanceled(error)) return;
        setReport(null);
        message.error("Could not load partner performance.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [
      cabPartner,
      cityCode,
      dateRange,
      journeyType,
      partner,
      top25Category,
      travelType,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadReport(controller.signal);
    return () => controller.abort();
  }, [loadReport]);

  const categoryOptions = useMemo(() => {
    const fromApi = report?.filters.categories || [];
    if (fromApi.length) return fromApi;
    return [
      { value: 1, label: "1. 1st Top 25 City" },
      { value: 2, label: "2. 2nd Top 25 City" },
    ];
  }, [report]);

  const partnerOptions = useMemo(() => {
    const set = new Set(
      (report?.filters.partners || []).filter(isVisiblePartner),
    );
    if (cabPartner && isVisiblePartner(cabPartner)) set.add(cabPartner);
    return [...set].sort();
  }, [cabPartner, report]);

  const cityLabel =
    airports.find((airport) => airport.code === cityCode)?.label ||
    (cityCode ? cityCode : "All cities");

  const journeyLabel =
    JOURNEY_OPTIONS.find((option) => option.value === journeyType)?.label ||
    "All journey types";

  const travelLabel =
    TRAVEL_OPTIONS.find((option) => option.value === travelType)?.label ||
    "Arrival and departure";

  const journeyOptions = useMemo(() => {
    const fromApi = (report?.filters.journeyTypes || []).map((value) =>
      String(value || "").toUpperCase(),
    );
    if (!fromApi.length) return JOURNEY_OPTIONS;
    const allowed = new Set(fromApi);
    return JOURNEY_OPTIONS.filter(
      (option) => !option.value || allowed.has(option.value),
    );
  }, [report]);

  const travelOptions = useMemo(() => {
    const fromApi = (report?.filters.travelTypes || []).map((value) =>
      String(value || "").toLowerCase(),
    );
    if (!fromApi.length) return TRAVEL_OPTIONS;
    const allowed = new Set(fromApi);
    return TRAVEL_OPTIONS.filter(
      (option) =>
        !option.value || allowed.has(String(option.value).toLowerCase()),
    );
  }, [report]);

  const downloadReport = () => {
    if (!report) return;
    const lines = [
      csvLine(["Partner performance"]),
      csvLine(["From", dateRange[0]]),
      csvLine(["To", dateRange[1]]),
      csvLine(["API partner", partner]),
      csvLine(["City", cityLabel]),
      csvLine(["Journey type", journeyLabel]),
      csvLine(["Travel type", travelLabel]),
      csvLine(["City category", top25Category || "All"]),
      csvLine(["Cab partner", cabPartner || "All"]),
      csvLine(["City searches", report.summary.citySearches]),
      "",
      csvLine([
        "Date",
        "City",
        "City category",
        "Partner",
        "Live",
        "Search",
        "Book",
        "Best%",
        "Supply%",
        "NPS%",
        "NPS responses",
      ]),
      ...report.rows.map((row) =>
        csvLine([
          row.date,
          row.cityCode,
          row.cityCategoryLabel,
          row.partner,
          row.live ? "Yes" : "No",
          row.search,
          row.book,
          row.bestPct,
          row.supplyPct,
          row.npsScore == null ? "" : row.npsScore,
          row.npsResponses,
        ]),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `partner_performance_${cityCode || "all"}_${dateRange[0]}_${dateRange[1]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const data = report || emptyReport();

  return (
    <>
      <PageMeta
        title="Partner performance"
        description="Search, book, fare-best, and supply rates by partner, city, and date"
      />
      <PartnerTab propsData={{ isall: false }} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Partner Performance Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Date → City → Journey → Travel → Top 25 category → Partner → Live /
            Search / Book / Best% / Supply% / NPS.
          </p>
        </div>
        <Button
          type="primary"
          disabled={!report || loading}
          onClick={downloadReport}
        >
          Download CSV
        </Button>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Dashboard filters
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangerPicker updateDate={dateRange} selectedRange={setDateRange} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            City
            <select
              value={cityCode}
              onChange={(event) => setCityCode(event.target.value)}
              className={selectClass}
            >
              <option value="">All cities</option>
              {airports.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.label}
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
              {journeyOptions.map((option) => (
                <option key={option.label} value={option.value}>
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
              {travelOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            City category
            <select
              value={top25Category}
              onChange={(event) => setTop25Category(event.target.value)}
              className={selectClass}
            >
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Partner
            <select
              value={cabPartner}
              onChange={(event) => setCabPartner(event.target.value)}
              className={selectClass}
            >
              <option value="">All Partners</option>
              {partnerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">City searches</div>
          <div className="text-xl font-semibold text-slate-900">
            {formatCount(data.summary.citySearches)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Partners</div>
          <div className="text-xl font-semibold text-slate-900">
            {formatCount(data.summary.partners)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Rows</div>
          <div className="text-xl font-semibold text-slate-900">
            {formatCount(data.summary.rows)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">City</div>
          <div className="truncate text-xl font-semibold text-slate-900">
            {cityLabel}
          </div>
        </div>
      </div>

      {loading ? (
        <AnalyticsLoader />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Live</th>
                <th className="px-4 py-3 font-semibold">Search</th>
                <th className="px-4 py-3 font-semibold">Book</th>
                <th className="px-4 py-3 font-semibold">Best%</th>
                <th className="px-4 py-3 font-semibold">Supply%</th>
                <th className="px-4 py-3 font-semibold">NPS</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No partner rows for these filters.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr
                    key={`${row.date}-${row.cityCode}-${row.partner}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.partner}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.live
                            ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                            : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                        }
                      >
                        {row.live ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {formatCount(row.search)}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {formatCount(row.book)}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{row.bestPct}%</td>
                    <td className="px-4 py-3 text-slate-800">
                      {row.supplyPct}%
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${npsTone(row.npsScore)}`}>
                        {formatNps(row.npsScore, row.npsResponses)}
                      </div>
                      {row.npsResponses > 0 && (
                        <div className="text-xs text-slate-500">
                          {formatCount(row.npsResponses)} responses
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.cityCode}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.cityCategoryLabel}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="mb-2 font-semibold text-slate-800">Definitions</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-slate-800">Search</span> —
            searches where that partner returned at least one quote.
          </li>
          <li>
            <span className="font-medium text-slate-800">Book</span> —
            confirmed bookings for that partner on those searches (includes
            later cancels).
          </li>
          <li>
            <span className="font-medium text-slate-800">Best%</span> — share of
            that partner&apos;s quoted searches where they had the cheapest
            fare.
          </li>
          <li>
            <span className="font-medium text-slate-800">Supply%</span> — share
            of city searches where that partner quoted.
          </li>
          <li>
            <span className="font-medium text-slate-800">Live</span> — partner
            was in that city&apos;s live list at search time
            (<code>fareSearch.livePartnerList</code>). Older rows without a
            snapshot fall back to today&apos;s <code>city_cab_status</code>.
          </li>
          <li>
            <span className="font-medium text-slate-800">NPS</span> — partner
            score for the selected dates (and city / journey / travel filters):
            (promoters − detractors) ÷ responses. Same formula as NPS Records.
            A partner with no ratings in the window shows —.
          </li>
        </ul>
      </div>
    </>
  );
};

export default PartnerPerformance;
