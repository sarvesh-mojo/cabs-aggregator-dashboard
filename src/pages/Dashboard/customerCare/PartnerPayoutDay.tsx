import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  GET_BOOKING_DAILY_COUNTS,
  GET_LIVE_CITIES_LIST,
} from "../../../config/customerCare/operationsApicall";
import { RangerPicker } from "../../../components/common/RangePicker";
import { AvailablecabPartners } from "../../../config/customerCare/constant";
import { PayoutViewSwitch } from "./PartnerPayout";

const TOP_CITIES = [
  { code: "DEL", label: "Delhi" },
  { code: "BOM", label: "Mumbai" },
  { code: "BLR", label: "Bengaluru" },
  { code: "MAA", label: "Chennai" },
  { code: "CCU", label: "Kolkata" },
  { code: "HYD", label: "Hyderabad" },
  { code: "PNQ", label: "Pune" },
];

const eachDate = (start: string, end: string) => {
  const days: string[] = [];
  let cursor = dayjs(start);
  const last = dayjs(end);
  if (!cursor.isValid() || !last.isValid() || cursor.isAfter(last, "day")) return days;
  while (cursor.isBefore(last, "day") || cursor.isSame(last, "day")) {
    days.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }
  return days;
};

const rowCityCode = (item: any) =>
  String(item?.cityCode || item?.citycode || item?.airportCode || item?.city_code || "")
    .trim()
    .toUpperCase();

const rowDate = (item: any, fallback: string) => {
  const raw = item?.date || item?.day || item?.report_date || item?.createdDate;
  if (!raw) return fallback;
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : String(raw).slice(0, 10);
};

const formatInr = (value: number) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

type CityMode = "top7" | "all" | "custom" | "one";

const DEFAULT_CITY_CODES = TOP_CITIES.map((city) => city.code);

const PartnerPayoutDay = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const weekStart = dayjs().subtract(6, "day").format("YYYY-MM-DD");

  const [activeTab, setActiveTab] = useState<"indigo" | "ixigo" | "all">("indigo");
  const [dateRange, setDateRange] = useState<[string, string]>([weekStart, today]);
  const [cityMode, setCityMode] = useState<CityMode>("top7");
  const [oneCity, setOneCity] = useState("");
  const [customCities, setCustomCities] = useState<string[]>(DEFAULT_CITY_CODES);
  const [cityHint, setCityHint] = useState("");
  const [cityListOpen, setCityListOpen] = useState(true);
  const [dayPartner, setDayPartner] = useState<string | null>(null);
  const [dayTravel, setDayTravel] = useState("");
  const [cities, setCities] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchId = useRef(0);

  const loginPartners = useSelector(
    (state: any) => state.authStore?.login_partners ?? [],
  );

  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await GET_LIVE_CITIES_LIST(activeTab);
        setCities(
          (Array.isArray(res) ? res : []).map((c: any) => ({
            ...c,
            name: `${c.sourceCity} - ${c.airportCode} (${c.terminalId})`,
            code: c.airportCode,
          })),
        );
      } catch (err) {
        console.error(err);
        setCities([]);
      }
    };
    loadCities();
  }, [activeTab]);

  useEffect(() => {
    const id = ++fetchId.current;
    const load = async () => {
      try {
        setLoading(true);
        const params: any = {
          date: dateRange[0],
          endDate: dateRange[1],
          groupByCabPartner: true,
          groupByDay: true,
          groupByCityCode: true,
          filterBy: "startTime",
          ...(dayPartner && { cabPartner: dayPartner }),
          ...(dayTravel && { travelType: dayTravel }),
        };

        const responses =
          activeTab === "all"
            ? await Promise.all(
                loginPartners.map((p: string) => GET_BOOKING_DAILY_COUNTS(p, params)),
              )
            : [await GET_BOOKING_DAILY_COUNTS(activeTab, params)];

        if (fetchId.current !== id) return;
        setRows(responses.flatMap((r) => (Array.isArray(r) ? r : [])));
      } catch (err) {
        console.error(err);
        if (fetchId.current === id) setRows([]);
      } finally {
        if (fetchId.current === id) setLoading(false);
      }
    };
    load();
  }, [activeTab, dateRange, dayPartner, dayTravel]);

  const dates = eachDate(dateRange[0], dateRange[1]);
  const dateSet = new Set(dates);
  const topCodes = new Set(DEFAULT_CITY_CODES);
  const customSet = new Set(customCities.map((code) => code.toUpperCase()));
  const activeCity = oneCity.toUpperCase();
  const cityTotals: Record<string, number> = {};
  const partnerMap: Record<string, { partner: string; byDate: Record<string, number> }> = {};

  const cityInTable = (city: string) => {
    if (cityMode === "all") return true;
    if (cityMode === "one") return city === activeCity;
    if (cityMode === "custom") return customSet.has(city);
    return topCodes.has(city);
  };

  rows.forEach((item) => {
    if (dayPartner && item.cabPartner !== dayPartner) return;
    const city = rowCityCode(item);
    const date = rowDate(item, dateRange[0]);
    if (!city || !dateSet.has(date)) return;

    const gmv = Number(item.completed_booking_gmv || 0);
    cityTotals[city] = (cityTotals[city] || 0) + gmv;
    if (!cityInTable(city)) return;

    const partner = item.cabPartner || "Unknown";
    if (!partnerMap[partner]) partnerMap[partner] = { partner, byDate: {} };
    partnerMap[partner].byDate[date] = (partnerMap[partner].byDate[date] || 0) + gmv;
  });

  const partnerRows = Object.values(partnerMap)
    .map((row) => ({
      ...row,
      total: dates.reduce((sum, date) => sum + (row.byDate[date] || 0), 0),
    }))
    .filter((row) => row.total !== 0)
    .sort((a, b) => b.total - a.total);

  const dayTotals = dates.map((date) =>
    partnerRows.reduce((sum, row) => sum + (row.byDate[date] || 0), 0),
  );
  const sectionGrand = partnerRows.reduce((sum, row) => sum + row.total, 0);
  const contributionPercent = (partnerGmv: number) => {
    if (!sectionGrand) return "0%";
    return `${Math.round((partnerGmv / sectionGrand) * 100)}%`;
  };
  const dayLabel = dates.length === 1 ? "Day" : "Days";
  const cityName = (code: string) =>
    TOP_CITIES.find((city) => city.code === code)?.label ||
    cities.find((item) => String(item.code || "").toUpperCase() === code)?.sourceCity ||
    code;

  const cityCards =
    cityMode === "custom"
      ? customCities.map((code) => {
          const cityCode = code.toUpperCase();
          return {
            code: cityCode,
            label: cityName(cityCode),
            total: cityTotals[cityCode] || 0,
          };
        })
      : TOP_CITIES.map((city) => ({
          ...city,
          total: cityTotals[city.code] || 0,
        })).sort((a, b) => {
          if (a.code === "DEL") return -1;
          if (b.code === "DEL") return 1;
          return b.total - a.total;
        });

  const seenCityCodes = new Set<string>();
  const cityOptions: { code: string; label: string }[] = [];
  TOP_CITIES.forEach((city) => {
    seenCityCodes.add(city.code);
    cityOptions.push(city);
  });
  const extraCities: { code: string; label: string }[] = [];
  cities.forEach((city) => {
    const code = String(city.code || "").toUpperCase();
    if (!code || seenCityCodes.has(code)) return;
    seenCityCodes.add(code);
    extraCities.push({ code, label: city.sourceCity || code });
  });
  extraCities.sort((a, b) => a.label.localeCompare(b.label));
  cityOptions.push(...extraCities);

  const toggleCustomCity = (code: string) => {
    const has = customCities.includes(code);
    if (has && customCities.length <= 2) {
      setCityHint("Select at least 2 cities.");
      return;
    }
    if (!has && customCities.length >= 7) {
      setCityHint("You can select up to 7 cities.");
      return;
    }
    setCityHint("");
    setCustomCities((prev) =>
      has ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  return (
    <div className="space-y-3 rounded-xl bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {["indigo", "ixigo", "all"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as "indigo" | "ixigo" | "all")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <RangerPicker updateDate={dateRange} selectedRange={(range) => setDateRange(range)} />
        <select
          value={cityMode}
          onChange={(e) => {
            const next = e.target.value as CityMode;
            setCityHint("");
            if (next === "custom") {
              if (customCities.length < 2) setCustomCities(DEFAULT_CITY_CODES);
              setCityListOpen(true);
            }
            setCityMode(next);
          }}
          className="w-40 rounded border px-2 py-1.5 text-sm"
        >
          <option value="top7">Top 7 Cities</option>
          <option value="all">All Cities</option>
          <option value="custom">Select Cities</option>
          {cityMode === "one" && (
            <option value="one">{cityName(oneCity)}</option>
          )}
        </select>
        <select
          value={dayPartner || ""}
          onChange={(e) => setDayPartner(e.target.value || null)}
          className="w-40 rounded border px-2 py-1.5 text-sm"
        >
          <option value="">All Partners</option>
          {AvailablecabPartners.map((partner) => (
            <option key={partner} value={partner}>
              {partner}
            </option>
          ))}
        </select>
        <select
          value={dayTravel}
          onChange={(e) => setDayTravel(e.target.value)}
          className="w-28 rounded border px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="arrival">Arrival</option>
          <option value="departure">Departure</option>
        </select>
        <div className="ml-auto">
          <PayoutViewSwitch />
        </div>
      </div>

      {cityMode === "custom" && (
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">Select 2 to 7 cities</p>
            <button
              type="button"
              onClick={() => setCityListOpen((open) => !open)}
              className="rounded border px-2 py-0.5 text-xs text-gray-600"
            >
              {cityListOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          {cityListOpen && (
            <div className="max-h-36 w-full overflow-auto rounded border p-2">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-3 gap-y-1">
                {cityOptions.map((city) => (
                  <label key={city.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={customCities.includes(city.code)}
                      onChange={() => toggleCustomCity(city.code)}
                    />
                    <span>{city.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {cityHint && <p className="mt-1 text-xs text-amber-700">{cityHint}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm">Loading...</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {cityCards.map((city) => (
              <button
                key={city.code}
                type="button"
                onClick={() => {
                  setCityHint("");
                  setOneCity(city.code);
                  setCityMode("one");
                }}
                className={`rounded-lg border px-2 py-1 text-left text-xs ${
                  (cityMode === "one" && city.code === activeCity) ||
                  (cityMode === "custom" && customSet.has(city.code))
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-gray-600">{city.label}</span>
                <span className="ml-2 font-semibold text-gray-900">{formatInr(city.total)}</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="whitespace-nowrap border px-4 py-2.5 text-left">Partner</th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      title={dayjs(date).format("DD MMM YYYY")}
                      className="whitespace-nowrap border px-4 py-2.5 text-left leading-tight"
                    >
                      {dayjs(date).format("DD MMM")}
                      <br />
                      <span className="font-normal text-gray-500">{dayjs(date).format("ddd")}</span>
                    </th>
                  ))}
                  <th className="whitespace-nowrap border px-4 py-2.5 text-left">Contribution %</th>
                  <th className="whitespace-nowrap border bg-blue-50 px-4 py-2.5 text-left leading-tight">
                    Total
                    <br />({dates.length} {dayLabel})
                  </th>
                </tr>
              </thead>
              <tbody>
                {partnerRows.length === 0 ? (
                  <tr>
                    <td colSpan={dates.length + 3} className="p-2 text-center">
                      No Data
                    </td>
                  </tr>
                ) : (
                  partnerRows.map((row) => (
                    <tr key={row.partner}>
                      <td className="whitespace-nowrap border px-4 py-2.5">{row.partner}</td>
                      {dates.map((date) => (
                        <td key={date} className="whitespace-nowrap border px-4 py-2.5">
                          {formatInr(row.byDate[date] || 0)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap border px-4 py-2.5">
                        {contributionPercent(row.total)}
                      </td>
                      <td className="whitespace-nowrap border px-4 py-2.5 font-bold">
                        {formatInr(row.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {partnerRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="whitespace-nowrap border px-4 py-2.5">
                      Grand Total
                    </td>
                    {dayTotals.map((total, index) => (
                      <td key={dates[index]} className="whitespace-nowrap border px-4 py-2.5">
                        {formatInr(total)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap border px-4 py-2.5">100%</td>
                    <td className="whitespace-nowrap border bg-blue-600 px-4 py-2.5 text-white">
                      {formatInr(sectionGrand)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerPayoutDay;
