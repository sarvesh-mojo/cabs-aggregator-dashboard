import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  GET_BOOKING_STATISTICSV2,
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_LIVE_CITIES_LIST,
} from "../../config/customerCare/operationsApicall";
import { CityListTypes, DataPartner } from "../../config/types";
import dayjs from "dayjs";
import { AnalyticsLoader } from "../../config/customerCare/helper";
import { Empty } from "antd";
import { AvailablecabPartners } from "../../config/customerCare/constant";
import {
  FaCalendar,
  FaCity,
  FaEraser,
  FaTaxi,
  FaCreditCard,
  FaCheckCircle,
  FaClipboardCheck,
  FaTimesCircle,
  FaFlagCheckered,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaListUl,
  FaSearch,
  FaCoins,
  FaChartLine,
  FaPercent,
} from "react-icons/fa";
import { RangerPicker } from "../common/RangePicker";

type statsData = {
  label: string;
  value: number;
};

type BookingStatsAPI = {
  createdDate: string;
  booking_confirmed: number | string;
  booking_cancelled: number | string;
  booking_completed: number | string;
  booking_failed: number | string;
  total_confirmed_fare: string;
  total_completed_fare: string;
  completed_gmv: string;
  total_completed_partial_collected: string;
  total_base_fare_collected: string | number;
  total_refund_amount?: string | number;
  refund_count?: number | string;
  [key: string]: number | string | undefined;
};

type StatStyle = { bg: string; iconBg: string; iconColor: string };

const TOP_STAT_STYLES: StatStyle[] = [
  { bg: "bg-blue-50", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  { bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  { bg: "bg-rose-50", iconBg: "bg-rose-100", iconColor: "text-rose-600" },
  { bg: "bg-sky-50", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { bg: "bg-violet-50", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  { bg: "bg-orange-50", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
  { bg: "bg-teal-50", iconBg: "bg-teal-100", iconColor: "text-teal-600" },
  { bg: "bg-pink-50", iconBg: "bg-pink-100", iconColor: "text-pink-600" },
];

const BOTTOM_STAT_STYLES: StatStyle[] = [
  { bg: "bg-indigo-50", iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  { bg: "bg-cyan-50", iconBg: "bg-cyan-100", iconColor: "text-cyan-600" },
  { bg: "bg-lime-50", iconBg: "bg-lime-100", iconColor: "text-lime-600" },
  { bg: "bg-fuchsia-50", iconBg: "bg-fuchsia-100", iconColor: "text-fuchsia-600" },
];

const TOP_STAT_ICONS: Record<string, ReactNode> = {
  "Payment Initiated": <FaCreditCard className="w-5 h-5" />,
  "Payment Completed": <FaCheckCircle className="w-5 h-5" />,
  "Booking Confirmed": <FaClipboardCheck className="w-5 h-5" />,
  "Booking Cancelled": <FaTimesCircle className="w-5 h-5" />,
  "Booking Completed": <FaFlagCheckered className="w-5 h-5" />,
  "Booking Failed": <FaExclamationTriangle className="w-5 h-5" />,
  "Total Refund Amount": <FaMoneyBillWave className="w-5 h-5" />,
  "Refund Count": <FaListUl className="w-5 h-5" />,
  "Fare Search Count": <FaSearch className="w-5 h-5" />,
};

const BOTTOM_STAT_ICONS_BY_INDEX: ReactNode[] = [
  <FaCoins className="w-5 h-5" key="coins" />,
  <FaChartLine className="w-5 h-5" key="chart" />,
  <FaPercent className="w-5 h-5" key="pct25" />,
  <FaPercent className="w-5 h-5" key="pct5" />,
];

type FareSearchStat = {
  total_searches: number | string;
};

export const HomeStatistics = ({ partner }: DataPartner) => {
  let today = dayjs().format("YYYY-MM-DD");
  const [loading, setLoading] = useState(false);
  const [topStats, setTopStats] = useState<statsData[]>([]);
  const [bottomStats, setBottomStats] = useState<
    { label: string; value: string }[]
  >([]);
  const [dateRange, setDateRange] = useState<[string, string]>([today, today]);
  const [cities, setCities] = useState<CityListTypes[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityListTypes[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityListTypes | null>(null);

  const [selectedCabPartner, setSelectedCabPartner] = useState<string | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // const fetchCities = async () => {
  //   try {
  //     const response: CityListTypes[] = await GET_LIVE_CITIES_LIST();
  //     const filtered = response.filter(
  //       (obj) => obj.is_departure === 1 || obj.is_arrival === 1,
  //     );
  //     setCities(filtered);
  //     setFilteredCities(filtered);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  // useEffect(() => {
  //   fetchCities();
  // }, []);

  const fetchCities = async () => {
  try {
    const response: any[] = await GET_LIVE_CITIES_LIST(partner);
    const mapped = response.map((c) => ({
      ...c,
      name: `${c.sourceCity} - ${c.airportCode} (${c.terminalId})`,
      code: c.airportCode,
    }));
    setCities(mapped);
    setFilteredCities(mapped);
  } catch (err) {
    console.log(err);
  }
};

useEffect(() => {
  fetchCities();
}, [partner]);

  const getDate = (range: [string, string]) => {
    setDateRange(range);
  };

  useEffect(() => {
    const result = cities.filter((city) =>
      city.name.toLowerCase().includes(citySearch.toLowerCase()),
    );
    setFilteredCities(result);
  }, [citySearch, cities]);

  const mergeStats = (data: BookingStatsAPI[]) => {
    return data.reduce(
      (acc, curr) => {
        acc.payment_initiated += Number(curr?.payment_initiated ?? 0);
        acc.booking_confirmed += Number(curr?.booking_confirmed ?? 0);
        acc.booking_cancelled += Number(curr?.booking_cancelled ?? 0);
        acc.booking_completed += Number(curr?.booking_completed ?? 0);
        acc.booking_failed += Number(curr?.booking_failed ?? 0);
        acc.completed_gmv += Number(curr?.completed_gmv ?? 0);
        acc.completed_base_fare += Number(curr?.completed_base_fare ?? 0);
        acc.total_refund_amount += Number(curr?.total_refund_amount ?? 0);
        acc.refund_count += Number(curr?.refund_count ?? 0);
        return acc;
      },
      {
        payment_initiated: 0,
        booking_confirmed: 0,
        booking_cancelled: 0,
        booking_completed: 0,
        booking_failed: 0,
        completed_gmv: 0,
        completed_base_fare: 0,
        total_refund_amount: 0,
        refund_count: 0,
      },
    );
  };

  const fetchAPI = async () => {
    try {
      setLoading(true);
      let queryParams: { [key: string]: string | number | boolean } = {
        date: dateRange[0],
        endDate: dateRange[1],
      };
      if (selectedCity != null || selectedCabPartner != null) {
        // queryParams["type"] = "day";
        if (selectedCabPartner) {
          queryParams["groupByCabPartner"] = true;
          queryParams["cabPartner"] = selectedCabPartner;
        }
        if (selectedCity) {
          ((queryParams["groupByCityCode"] = true),
            (queryParams["cityCode"] = selectedCity?.code));
        }
      }
      const respon: any = await GET_BOOKING_STATISTICSV2(partner, queryParams);
      const merged = mergeStats(respon);
      setTopStats([
        { label: "Payment Initiated", value: merged.payment_initiated || 0 },
        { label: "Booking Confirmed", value: merged.booking_confirmed || 0},
        { label: "Booking Cancelled", value: merged.booking_cancelled || 0},
        { label: "Booking Completed", value: merged.booking_completed || 0},
        { label: "Booking Failed", value: merged.booking_failed || 0},
        {
          label: "Total Refund Amount",
          value: parseFloat(merged.total_refund_amount?.toString() ?? "0"),
        },
        { label: "Refund Count", value: merged.refund_count  || 0},
      ]);

      // BOTTOM GRID
      setBottomStats([
        {
          label: "BASE FARE GMV",
          value: (merged.completed_base_fare || 0).toFixed(1),
        },
        {
          label: "TOTAL GMV",
          value: (merged.completed_gmv || 0).toFixed(1),
        },
        {
          label: `${partner} Share 2.5%`,
          value: ((merged.completed_base_fare * 0.025) || 0).toFixed(2),
        },
        {
          label: `${partner} Share 5%`,
          value: ((merged.completed_base_fare * 0.05) || 0).toFixed(2),
        },
      ]);
      Custom_Stats_Api();
    } catch (error) {
      setTopStats([]);
      setBottomStats([]);
    } finally {
      setLoading(false);
    }
  };

  const Custom_Stats_Api = async () => {
    try {
      const respon: any = await GET_CUSTOM_BOOKING_STATISTICS(partner, {
        from: dateRange[0],
        to: dateRange[1],
        reportType: "fareSearchConversion",
        groupBy: "day",
        timeField: "startTime",
      });

      const totalFareSearchCount = respon.reduce(
        (acc: { total_searches: number }, curr: FareSearchStat) => {
          acc.total_searches += Number(curr.total_searches || 0);
          return acc;
        },
        { total_searches: 0 },
      );

      setTopStats((prev) => [
        ...prev,
        {
          label: "Fare Search Count",
          value: totalFareSearchCount?.total_searches ?? 0,
        },
      ]);
    } catch (err) {
      console.log("Error:" + err);
    }
  };

  useEffect(() => {
    fetchAPI();
  }, [dateRange, partner, selectedCity, selectedCabPartner]);

  if (loading) {
    return <AnalyticsLoader height="h-[180px]" />;
  }

  return (
    <div className="w-full p-4 bg-gradient-to-b from-slate-50 to-gray-100 rounded-2xl text-black space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-start gap-5 p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col">
          <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
            <FaCalendar className="text-blue-500" />
            Date Range
          </p>
          <div className="flex items-center gap-2 rounded-xl py-2 bg-gray-50/80 border border-gray-200/80 h-10 px-2">
            <RangerPicker  updateDate={[dateRange[0], dateRange[1]]}
              selectedRange={getDate}/>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 mb-0 ml-2">
           Selected : {dateRange[0]} → {dateRange[1]}
          </p>
        </div>

        <div ref={dropdownRef} className="relative w-56">
          <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
            <FaCity className="text-emerald-500" />
            City
          </p>
          <div
            className="rounded-xl px-3 py-2.5 text-sm cursor-pointer bg-gray-50/80 border border-gray-200/80 h-10 flex justify-between items-center hover:border-gray-300 transition-colors"
            onClick={() => setOpen((p) => !p)}
          >
            <span className="truncate text-gray-700">
              {selectedCity?.name || "Select city"}
            </span>
            <span className="text-gray-400 text-xs">▼</span>
          </div>
          {open && (
            <div className="absolute z-30 w-full bg-white border border-gray-200 mt-1.5 rounded-xl shadow-lg overflow-hidden">
              <input
                type="text"
                placeholder="Search city..."
                className="w-full px-3 py-2.5 text-sm border-b border-gray-100 outline-none focus:ring-1 ring-blue-200 rounded-t-xl"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
              />
              <ul className="max-h-52 overflow-auto">
                {filteredCities.length === 0 && (
                  <li className="px-3 py-2.5 text-sm text-gray-400">
                    No city found
                  </li>
                )}
                {filteredCities.map((city) => (
                  <li
                    key={city.id}
                    className="px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer text-gray-700"
                    onClick={() => {
                      setSelectedCity(city);
                      setOpen(false);
                      setCitySearch("");
                    }}
                  >
                    {city.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="w-48">
          <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
            <FaTaxi className="text-amber-500" />
            Cab Partner
          </p>
          <select
            className="rounded-xl px-3 py-2.5 w-full text-sm bg-gray-50/80 border border-gray-200/80 h-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-200"
            value={selectedCabPartner || ""}
            onChange={(e) => setSelectedCabPartner(e.target.value || null)}
          >
            <option value="">All Partners</option>
            {AvailablecabPartners.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {(selectedCity || selectedCabPartner) && (
          <button
            onClick={() => {
              setSelectedCity(null);
              setSelectedCabPartner(null);
              setCitySearch("");
            }}
            className="flex items-center gap-1.5 text-xs text-rose-600 font-medium py-2 px-3 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <FaEraser />
            Clear filters
          </button>
        )}
      </div>


      {!topStats?.length || !bottomStats?.length ? (
        <Empty />
      ) : (
        <>
          {/* TOP STATS - Rounded cards with icons */}
          <div className="flex flex-wrap gap-4">
            {topStats.map((item, i) => {
              const style = TOP_STAT_STYLES[i % TOP_STAT_STYLES.length];
              const icon = TOP_STAT_ICONS[item.label] ?? <FaChartLine className="w-5 h-5" />;
              const displayValue =
                item.label === "Total Refund Amount"
                  ? Number(item.value).toFixed(2)
                  : item.value;
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[120px] max-w-[180px] rounded-2xl ${style.bg} p-3 shadow-sm border border-white/80 hover:shadow-md transition-shadow`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${style.iconBg} ${style.iconColor} flex items-center justify-center mb-3`}
                  >
                    {icon}
                  </div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className="text-xl font-bold mt-1 text-gray-900">
                    {displayValue}
                  </p>
                </div>
              );
            })}
          </div>

          {/* BOTTOM STATS - Rounded cards with icons */}
          <div className="flex flex-wrap gap-4">
            {bottomStats.map((item, i) => {
              const style = BOTTOM_STAT_STYLES[i % BOTTOM_STAT_STYLES.length];
              const icon = BOTTOM_STAT_ICONS_BY_INDEX[i];
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[160px] rounded-2xl ${style.bg} p-6 shadow-sm border border-white/80 hover:shadow-md transition-shadow`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${style.iconBg} ${style.iconColor} flex items-center justify-center mb-3`}
                  >
                    {icon}
                  </div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold mt-2 text-gray-900">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
