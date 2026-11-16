import { useCallback, useEffect, useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GET_CUSTOM_BOOKING_STATISTICS } from "../../config/customerCare/operationsApicall";
import { AnalyticsLoader } from "../../config/customerCare/helper";
import { FaClock, FaSearch } from "react-icons/fa";
import { Empty } from "antd";
import { useSelector } from "react-redux";
import { RangerPicker } from "../common/RangePicker";

const groupByDate = (raw: HourlyDataPoint[]) => {
  const map: Record<string, HourlyDataPoint[]> = {};

  raw.forEach((item) => {
    const date = item.createdDate;
    if (!map[date]) map[date] = [];
    map[date].push(item);
  });

  Object.keys(map).forEach((date) => {
    map[date] = buildFullDay(map[date]);
  });

  return map;
};

type HourlyDataPoint = {
  createdDate: string;
  createdHour: number;
  count: number;
  percentage: string;
};

type HourlyFareSearchChartProps = {
  partner: string;
  dateRange: [string, string];
  selectedCity?: { code: string; name: string } | null;
  selectedCabPartner?: string | null;
};

/** Format hour number → "12 AM", "3 PM", etc. */
const formatHour = (h: number) => {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
};

/** Build a full 24-hour skeleton so gaps show as 0 */
// const buildFullDay = (raw: HourlyDataPoint[]): HourlyDataPoint[] =>
//   Array.from({ length: 24 }, (_, h) => {
//     const found = raw.find((d) => Number(d.createdHour) === h);
//     return (
//       found ?? { createdDate: raw[0]?.createdDate || "", createdHour: h, count: 0, percentage: "0" }
//     );
//   });

const buildFullDay = (raw: HourlyDataPoint[]): HourlyDataPoint[] => {
  const total = raw.reduce((s, d) => s + Number(d.count), 0);

  return Array.from({ length: 24 }, (_, h) => {
    const items = raw.filter((d) => Number(d.createdHour) === h);

    const count = items.reduce((sum, d) => sum + Number(d.count), 0);

    return {
      createdDate: raw[0]?.createdDate || "",
      createdHour: h,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(2) : "0",
    };
  });
};

/**  Merge multiple partners' hourly arrays by summing counts per hour */
const mergeHourly = (arrays: HourlyDataPoint[][]): HourlyDataPoint[] => {
  const map = new Map<number, HourlyDataPoint>();
  for (const arr of arrays) {
    for (const pt of arr) {
      const h = Number(pt.createdHour);
      if (map.has(h)) {
        const prev = map.get(h)!;
        const newCount = prev.count + Number(pt.count);
        map.set(h, { ...prev, count: newCount, percentage: "0" });
      } else {
        map.set(h, { ...pt, count: Number(pt.count) });
      }
    }
  }
  // Recalculate percentages
  const total = Array.from(map.values()).reduce((s, d) => s + d.count, 0);
  map.forEach((v, k) => {
    map.set(k, {
      ...v,
      percentage: total > 0 ? ((v.count / total) * 100).toFixed(2) : "0",
    });
  });
  return Array.from(map.values()).sort((a, b) => a.createdHour - b.createdHour);
};

// ─── Custom Tooltip

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const { count, percentage } = payload[0].payload as HourlyDataPoint;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">
        {formatHour(Number(label))}
      </p>
      <p className="text-blue-600 font-bold text-base">
        {count.toLocaleString()} searches
      </p>
      <p className="text-gray-500">{percentage}% of day</p>
    </div>
  );
};

// ─── Bar colour: gradient from muted blue → vivid blue based on count ─────────

const barColor = (count: number, maxCount: number): string => {
  if (maxCount === 0) return "#bfdbfe";
  const ratio = count / maxCount;
  if (ratio > 0.75) return "#1d4ed8";
  if (ratio > 0.5) return "#3b82f6";
  if (ratio > 0.25) return "#93c5fd";
  return "#dbeafe";
};

// ─── Main Component

export const HourlyFareSearchChart = ({
  partner,
  dateRange,
  selectedCity,
  selectedCabPartner,
}: HourlyFareSearchChartProps) => {

  // ── Chart-local date range (independent from parent) ──
const [localDateRange, setLocalDateRange] = useState<[string, string]>(dateRange);
const isUserOverride = useRef(false);

// Sync with parent only if user hasn't manually overridden
useEffect(() => {
  if (isUserOverride.current) return;
  setLocalDateRange((prev) =>
    prev[0] === dateRange[0] && prev[1] === dateRange[1] ? prev : [dateRange[0], dateRange[1]],
  );
}, [dateRange[0], dateRange[1]]);

const handleChartDateChange = (dates: any) => {
  if (dates) {
    isUserOverride.current = true;
    setLocalDateRange([dates[0], dates[1]]);
  }
};

const handleResetToGlobal = () => {
  isUserOverride.current = false;
  setLocalDateRange(dateRange);
};

  const [data, setData] = useState<HourlyDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [peakHour, setPeakHour] = useState<HourlyDataPoint | null>(null);
  const [totalSearches, setTotalSearches] = useState(0);
  const [multiData, setMultiData] = useState<Record<string, HourlyDataPoint[]>>(
    {},
  );

  const loginPartners: string[] = useSelector(
    (state: any) => state.authStore?.login_partners,
  ) ?? [];

  const partnersKey = (loginPartners ?? []).join(",");

const fetchHourlyData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean> = {
        reportType: "fareSearch_hour_day_wise",
        from: localDateRange[0],
        to: localDateRange[1],
        ...(selectedCabPartner && { cabPartner: selectedCabPartner }),
        ...(selectedCity && { cityCode: selectedCity.code }),
      };

      let raw: HourlyDataPoint[] = [];
      const partners = partnersKey ? partnersKey.split(",") : [];

      if (partner === "all") {
        const results = await Promise.all(
          partners
            .filter(
              (p) =>
                ![
                  "bac_agent",
                  "bac_mb",
                  "bac_yatra",
                  "bac_corp",
                  "bac_swiggy",
                  "bac_agentic_chat_dev",
                  "bac_agentic_chat",
                ].includes(p),
            )
            .map((p) =>
              GET_CUSTOM_BOOKING_STATISTICS(p, params as any, signal).catch(
                () => [] as any,
              ),
            ),
        );
        const arrays: HourlyDataPoint[][] = results.map((r) =>
          Array.isArray(r) ? r : [],
        );
        raw = arrays.flat();
      } else {
        const response = await GET_CUSTOM_BOOKING_STATISTICS(
          partner,
          params as any,
          signal,
        );
        raw = Array.isArray(response)
          ? (response as unknown as HourlyDataPoint[])
          : [];
      }

      if (signal?.aborted) return;

      const groupedRaw = groupByDate(raw);

      const grouped: Record<string, HourlyDataPoint[]> = {};

      Object.keys(groupedRaw).forEach((date) => {
        grouped[date] = mergeHourly([groupedRaw[date]]);
      });

      setMultiData(grouped);

      const full = buildFullDay(raw);
      setData(full);

      const total = raw.reduce((s, d) => s + Number(d.count), 0);
      setTotalSearches(total);

      const peak = full.reduce(
        (max, d) => (d.count > max.count ? d : max),
        full[0],
      );
      setPeakHour(peak?.count > 0 ? peak : null);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error("HourlyFareSearchChart error:", err);
      setData([]);
  } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [partner, localDateRange[0], localDateRange[1], selectedCity, selectedCabPartner, partnersKey]);

    useEffect(() => {
    const controller = new AbortController();
    fetchHourlyData(controller.signal);
    return () => controller.abort();
  }, [fetchHourlyData]);

  // ── Render

  if (loading) return <AnalyticsLoader height="h-[260px]" />;

  const hasData = data.some((d) => d.count > 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const isMultiDay = Object.keys(multiData).length > 1;

  const dates = Object.keys(multiData);

  const comparisonData = Array.from({ length: 24 }, (_, h) => {
    const obj: any = { hour: h };

    dates.forEach((date) => {
      const found = multiData[date]?.find((d) => d.createdHour === h);
      obj[date] = found?.count || 0;
      obj[`${date}_percentage`] = found?.percentage || "0";
    });

    return obj;
  });

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* <div>
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <FaSearch className="text-blue-500 w-4 h-4" />
            Hourly Fare Searches
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {dateRange[0] === dateRange[1]
              ? dateRange[0]
              : `${dateRange[0]} → ${dateRange[1]}`}
            {selectedCity ? ` · ${selectedCity.name}` : ""}
            {selectedCabPartner ? ` · ${selectedCabPartner}` : ""}
          </p>
        </div> */}

        <div>
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <FaSearch className="text-blue-500 w-4 h-4" />
            Hourly Fare Searches
          </h3>

          {/* Chart-local date picker */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] text-gray-500 font-medium">Chart date:</span>
            <div className="border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
              <RangerPicker
                updateDate={[localDateRange[0], localDateRange[1]]}
                selectedRange={handleChartDateChange}
                compact={true}
              />
            </div>
            {isUserOverride.current && (
              <button
                onClick={handleResetToGlobal}
                className="text-[11px] text-blue-600 font-semibold border border-blue-200 
                           rounded-lg px-2 py-1 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                ↺ Reset to global
              </button>
            )}
            {isUserOverride.current && (
              <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 
                               rounded-full px-2 py-0.5 font-semibold">
                Custom range active
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-1">
            {localDateRange[0] === localDateRange[1]
              ? localDateRange[0]
              : `${localDateRange[0]} → ${localDateRange[1]}`}
            {selectedCity ? ` · ${selectedCity.name}` : ""}
            {selectedCabPartner ? ` · ${selectedCabPartner}` : ""}
          </p>
        </div>


        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
            <FaSearch className="text-blue-400 w-3 h-3" />
            <span className="text-xs font-semibold text-blue-700">
              {totalSearches.toLocaleString()} total
            </span>
          </div>
          {peakHour && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5">
              <FaClock className="text-amber-400 w-3 h-3" />
              <span className="text-xs font-semibold text-amber-700">
                Peak: {formatHour(peakHour.createdHour)} (
                {peakHour.count.toLocaleString()})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart or Empty */}
      {!hasData ? (
        <Empty description="No fare search data for selected range" />
      ) : isMultiDay ? (
        // ✅ NEW COMPARISON CHART
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="hour"
              tickFormatter={formatHour}
              tick={{ fontSize: 10 }}
              interval={2}
            />

            <YAxis allowDecimals={false} />

            {/* <Tooltip
              formatter={(value: any, name: any,) => [`${value}`, name]}
              labelFormatter={(label) => formatHour(label)}
            /> */}
            <Tooltip
              formatter={(value: any, name: any, props: any) => {
                const percentage = props.payload[`${name}_percentage`];
                return [`${value} (${percentage}%)`, name];
              }}
              labelFormatter={(label) => formatHour(label)}
              // itemStyle={{ color: "#000000" }} // colur text black on hover
            />

            {dates.map((date, index) => (
              <Bar
                key={date}
                dataKey={date}
                fill={["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][index % 4]}
                radius={[4, 4, 0, 0]}
              />
            ))}

            {/* const currentDate = [...dates].sort().slice(-1)[0];  */}
            {/* 
            {dates.map((date) => {
              const currentDate = [...dates].sort().slice(-1)[0];
              const isCurrent = date === currentDate;

              return (
                <Bar
                  key={date}
                  dataKey={date}
                  fill={isCurrent ? "#3b82f6" : "#d1d5db"} // blue vs gray
                  radius={[4, 4, 0, 0]}
                />
              );
            })} */}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        // <Empty description="No fare search data for selected range" />
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f4f8"
                vertical={false}
              />
              <XAxis
                dataKey="createdHour"
                tickFormatter={formatHour}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#f1f5f9" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.count, maxCount)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Colour-scale legend */}
          <div className="flex items-center gap-2 justify-end">
            <span className="text-[10px] text-gray-400">Low</span>
            {["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"].map((c) => (
              <span
                key={c}
                className="inline-block w-5 h-2.5 rounded-full"
                style={{ background: c }}
              />
            ))}
            <span className="text-[10px] text-gray-400">High</span>
          </div>
        </>
      )}
    </div>
  );
};
