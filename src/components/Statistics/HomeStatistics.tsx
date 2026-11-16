import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  GET_BOOKING_DAILY_COUNTS,
  GET_LIVE_CITIES_LIST,
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_IXIGO_FARE_STATS,
} from "../../config/customerCare/operationsApicall";
// import { CityListTypes, DataPartner } from "../../config/types";
import { CityListTypes } from "../../config/types";
import dayjs from "dayjs";
import { AnalyticsLoader } from "../../config/customerCare/helper";
import { Empty } from "antd";
import { AvailablecabPartners } from "../../config/customerCare/constant";
import {
  getLoginUsername,
  isRailyatriOnlyLogin,
  isRailyatriOpsUser,
  resolveLockedCabPartners,
  shouldHideDashboardRevenuePerformance,
} from "../../utils/partnerAccess";
import { useSelector } from "react-redux";
import {
  FaCalendar,
  FaSearch,
  FaCity,
  FaEraser,
  FaTaxi,
  FaCreditCard,
  FaCheckCircle,
  FaClipboardCheck,
  FaTimesCircle,
  FaFlagCheckered,
  // FaExclamationTriangle,
  FaMoneyBillWave,
  FaCoins,
  FaChartLine,
  FaPercent,
  FaWallet,
  FaPiggyBank,
  // FaTags,
} from "react-icons/fa";
import { RangerPicker } from "../common/RangePicker";
// import { DevicePersonaPerformance } from "./DevicePersonaPerformance";
import { getPlatformShareLabel } from "../../utils/partnerDisplayLabels";

type DailyUpdateStats = {
  transactions_initiated: number;
  payment_complete: number;
  rides_completed: number;
  rides_pending: number;
  bookings_cancelled: number;
  bookings_failed: number;
  transactions_abandoned: number;
  total_gmv: string | number;
  base_fare_gmv: string | number;
  completed_booking_gmv?: string | number;
  completed_booking_basefare?: string | number;
  total_refund_amount: string | number;
  total_rides: number;
  active_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  indigo_share_2_5?: number | string;
  indigo_share_7_5?: number | string;
  ibc_disbursed?: number | string;
  ibcDisbursed?: number | string;
  discount_given?: number | string;
  discountGiven?: number | string;
  discounts?: number | string;
  rides_pending_partial_paid?: number;
  rides_pending_full_paid?: number;
  total_gmv_partial?: string | number;
  total_gmv_full?: string | number;
  rides_completed_partial_paid?: number;
  rides_completed_full_paid?: number;
  total_gmv_completed_partial?: string | number;
  total_gmv_completed_full?: string | number;
  total_gmv_collected_partial?: string | number;
  total_gmv_collected_full?: string | number;
  [key: string]: any;
};

type StatStyle = { bg: string; iconBg: string; iconColor: string };

const STAT_STYLES: StatStyle[] = [
  { bg: "bg-blue-50", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  { bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  { bg: "bg-rose-50", iconBg: "bg-rose-100", iconColor: "text-rose-600" },
  { bg: "bg-sky-50", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { bg: "bg-violet-50", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  { bg: "bg-orange-50", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
  { bg: "bg-teal-50", iconBg: "bg-teal-100", iconColor: "text-teal-600" },
  { bg: "bg-pink-50", iconBg: "bg-pink-100", iconColor: "text-pink-600" },
  { bg: "bg-indigo-50", iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  { bg: "bg-cyan-50", iconBg: "bg-cyan-100", iconColor: "text-cyan-600" },
  { bg: "bg-lime-50", iconBg: "bg-lime-100", iconColor: "text-lime-600" },
];

const formatRoundAmount = (value: string | number | null | undefined): number =>
  Math.round(Number(value ?? 0));

// export const HomeStatistics = ({ partner }: DataPartner) => {
export const HomeStatistics = ({
  partner,
  onFiltersChange,
}: {
  partner: string;
  onFiltersChange?: (
    city: any,
    cabPartner: string | null,
    dateRange: [string, string],
  ) => void;
}) => {
  let today = dayjs().format("YYYY-MM-DD");
  const [loading, setLoading] = useState(false);

  // STATS STATE used for mapping
  const [stats, setStats] = useState<DailyUpdateStats | null>(null);
  const [OperationStats, SetOperationStats] = useState<DailyUpdateStats | null>(
    null,
  );

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
  const [totalFareSearches, setTotalFareSearches] = useState<number | null>(
    null,
  );

  const [travelType, setTravelType] = useState<string>("");
  const [payType, setPayType] = useState<string>("");
  const [deviceType, setDeviceType] = useState<string>("");

  // taking from Redux
  const loginUsername = useSelector(
    (state: any) => state.authStore?.login_username,
  );
  const loginPartners = useSelector(
    (state: any) => state.authStore?.login_partners ?? [],
  );
  const logsPartner = useSelector(
    (state: any) => state.authStore?.logsPartner ?? "",
  );
  const lockCabPartnerToAll =
    isRailyatriOpsUser(getLoginUsername(loginUsername)) ||
    isRailyatriOnlyLogin(loginPartners);
  const lockedCabPartners = resolveLockedCabPartners(loginPartners, logsPartner);
  const cabPartnerChoices = lockedCabPartners.length
    ? lockedCabPartners
    : AvailablecabPartners;
  const appliedCabPartner = lockCabPartnerToAll
    ? null
    : lockedCabPartners.length === 1
      ? lockedCabPartners[0]
      : lockedCabPartners.length > 1
        ? selectedCabPartner &&
          lockedCabPartners.some(
            (partnerName) =>
              partnerName.toLowerCase() === selectedCabPartner.toLowerCase(),
          )
          ? selectedCabPartner
          : lockedCabPartners[0]
        : selectedCabPartner;
  const statsPartners = (Array.isArray(loginPartners) ? loginPartners : []).filter(
    (p: string) =>
      ![
        "bac_agent",
        "bac_mb",
        "bac_yatra",
        "bac_corp",
        "bac_swiggy",
        "bac_agentic_chat_dev",
        "bac_agentic_chat",
      ].includes(p),
  );
  const hideRevenuePerformance = shouldHideDashboardRevenuePerformance(
    loginUsername,
  );

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
  //     const response: CityListTypes[] = await GET_LIVE_CITIES_LIST(partner);
  //     const filtered = response.filter(
  //       (obj) => obj.is_departure === 1 || obj.is_arrival === 1,
  //     );
  //     setCities(filtered);
  //     setFilteredCities(filtered);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  const fetchCities = async (signal?: AbortSignal) => {
    try {
      const response: any[] = await GET_LIVE_CITIES_LIST(partner);
      if (signal?.aborted) return;
      if (!Array.isArray(response)) {
        setCities([]);
        setFilteredCities([]);
        return;
      }

      const mapped = response
        .map((c) => ({
          ...c,
          name:
            c.name ||
            `${c.sourceCity ?? ""} - ${c.airportCode ?? c.code ?? ""}${
              c.terminalId ? ` (${c.terminalId})` : ""
            }`.trim(),
          code: c.code || c.airportCode,
        }))
        .filter((c) => c.code || c.name);

      setCities(mapped);
      setFilteredCities(mapped);
    } catch (err: any) {
      if (
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.name === "AbortError"
      ) {
        return;
      }
      console.log(err);
      setCities([]);
      setFilteredCities([]);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCities(controller.signal);
    return () => controller.abort();
  }, [partner]);

  const getDate = (range: [string, string]) => {
    setDateRange((prev) =>
      prev[0] === range[0] && prev[1] === range[1] ? prev : range,
    );
    onFiltersChange?.(selectedCity, appliedCabPartner, range);
  };

  useEffect(() => {
    const result = cities.filter((city) =>
      city.name.toLowerCase().includes(citySearch.toLowerCase()),
    );
    setFilteredCities(result);
  }, [citySearch, cities]);

  const mergeStats = (data: DailyUpdateStats[]) => {
    if (!data || data.length === 0) return null;
    return data.reduce(
      (acc, curr) => {
        acc.transactions_initiated += Number(curr.transactions_initiated || 0);
        acc.payment_complete += Number(curr.payment_complete || 0);
        acc.rides_completed += Number(curr.rides_completed || 0);
        acc.rides_pending += Number(curr.rides_pending || 0);
        acc.bookings_cancelled += Number(curr.bookings_cancelled || 0);
        acc.bookings_failed += Number(curr.bookings_failed || 0);
        acc.transactions_abandoned += Number(curr.transactions_abandoned || 0);

        acc.total_gmv =
          Number(acc.total_gmv || 0) + Number(curr.total_gmv || 0);
        acc.base_fare_gmv =
          Number(acc.base_fare_gmv || 0) + Number(curr.base_fare_gmv || 0);
        acc.total_refund_amount =
          Number(acc.total_refund_amount || 0) +
          Number(curr.total_refund_amount || 0);

        // Shares might be numbers or strings in response
        acc.indigo_share_2_5 =
          Number(acc.indigo_share_2_5 || 0) +
          Number(curr.indigo_share_2_5 || 0);
        acc.indigo_share_7_5 =
          Number(acc.indigo_share_7_5 || 0) +
          Number(curr.indigo_share_7_5 || 0);
        acc.rides_pending_partial_paid =
          Number(acc.rides_pending_partial_paid || 0) +
          Number(curr.rides_pending_partial_paid || 0);
        acc.rides_pending_full_paid =
          Number(acc.rides_pending_full_paid || 0) +
          Number(curr.rides_pending_full_paid || 0);
        acc.rides_completed_partial_paid =
          Number(acc.rides_completed_partial_paid || 0) +
          Number(curr.rides_completed_partial_paid || 0);
        acc.rides_completed_full_paid =
          Number(acc.rides_completed_full_paid || 0) +
          Number(curr.rides_completed_full_paid || 0);

        acc.total_gmv_partial =
          Number(acc.total_gmv_partial || 0) +
          Number(curr.total_gmv_partial || 0);
        acc.total_gmv_full =
          Number(acc.total_gmv_full || 0) + Number(curr.total_gmv_full || 0);
        acc.total_gmv_completed_partial =
          Number(acc.total_gmv_completed_partial || 0) +
          Number(curr.total_gmv_completed_partial || 0);
        acc.total_gmv_completed_full =
          Number(acc.total_gmv_completed_full || 0) +
          Number(curr.total_gmv_completed_full || 0);
        acc.total_gmv_collected_partial =
          Number(acc.total_gmv_collected_partial || 0) +
          Number(curr.total_gmv_collected_partial || 0);
        acc.total_gmv_collected_full =
          Number(acc.total_gmv_collected_full || 0) +
          Number(curr.total_gmv_collected_full || 0);

        return acc;
      },
      {
        transactions_initiated: 0,
        payment_complete: 0,
        rides_completed: 0,
        rides_pending: 0,
        bookings_cancelled: 0,
        bookings_failed: 0,
        transactions_abandoned: 0,
        total_gmv: 0,
        base_fare_gmv: 0,
        total_refund_amount: 0,
        indigo_share_2_5: 0,
        indigo_share_7_5: 0,

        rides_pending_partial_paid: 0,
        rides_pending_full_paid: 0,
        rides_completed_partial_paid: 0,
        rides_completed_full_paid: 0,
        total_gmv_partial: 0,
        total_gmv_full: 0,
        total_gmv_completed_partial: 0,
        total_gmv_completed_full: 0,
        total_gmv_collected_partial: 0, 
        total_gmv_collected_full: 0,  
      } as DailyUpdateStats,
    );
  };

  const OperationsStats = (data: DailyUpdateStats[]) => {
    if (!data || data.length === 0) return null;
    return data.reduce(
      (acc, curr) => {
        acc.total_rides += Number(curr.total_rides || 0);
        acc.active_rides += Number(curr.active_rides || 0);
        acc.completed_rides += Number(curr.completed_rides || 0);
        acc.cancelled_rides += Number(curr.cancelled_rides || 0);
        acc.total_gmv =
          Number(acc.total_gmv || 0) + Number(curr.total_gmv || 0);
        acc.base_fare_gmv =
          Number(acc.base_fare_gmv || 0) + Number(curr.base_fare_gmv || 0);
        acc.completed_booking_gmv =
          Number(acc.completed_booking_gmv || 0) +
          Number(curr.completed_booking_gmv || 0);
        acc.completed_booking_basefare =
          Number(acc.completed_booking_basefare || 0) +
          Number(curr.completed_booking_basefare || 0);

        return acc;
      },
      {
        total_rides: 0,
        active_rides: 0,
        completed_rides: 0,
        cancelled_rides: 0,
        total_gmv: 0,
        base_fare_gmv: 0,
        completed_booking_gmv: 0,
        completed_booking_basefare: 0,
      } as DailyUpdateStats,
    );
  };

  const toStatsArray = (value: unknown): DailyUpdateStats[] => {
    if (Array.isArray(value)) return value as DailyUpdateStats[];
    if (value && typeof value === "object") return [value as DailyUpdateStats];
    return [];
  };

  const settledValue = <T,>(result: PromiseSettledResult<T>): T | null => {
    if (result.status === "fulfilled") return result.value;
    const reason = result.reason as { code?: string; name?: string };
    if (
      reason?.code === "ERR_CANCELED" ||
      reason?.name === "CanceledError" ||
      reason?.name === "AbortError"
    ) {
      return null;
    }
    console.error(result.reason);
    return null;
  };

  const fetchAPI = async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      const fareParams = {
        reportType: "seven_day_fare_search_conversion",
        from: dateRange[0],
        to: dateRange[1],
      };

      // added for All tab
      if (partner === "all") {
        const bookingParams = {
          date: dateRange[0],
          endDate: dateRange[1],
          groupByDay: true,
          ...(appliedCabPartner && {
            groupByCabPartner: true,
            cabPartner: appliedCabPartner,
          }),
          ...(selectedCity && {
            groupByCityCode: true,
            cityCode: selectedCity.code,
            ...(travelType && { travelType }),
            ...(payType && { payType }),
            ...(deviceType && { deviceType }),
          }),
          ...(deviceType && { filterBy: "startTime" }),
        };

        const operationParams = {
          date: dateRange[0],
          endDate: dateRange[1],
          groupByDay: true,
          filterBy: "startTime",
          ...(appliedCabPartner && {
            groupByCabPartner: true,
            cabPartner: appliedCabPartner,
          }),
          ...(selectedCity && {
            groupByCityCode: true,
            cityCode: selectedCity.code,
            ...(travelType && { travelType }),
            ...(payType && { payType }),
            ...(deviceType && { deviceType }),
          }),
          ...(deviceType && { filterBy: "startTime" }),
        };

        // Handle mixed partner fare search promises
        const farePromises = statsPartners.map((p: string) => {
          if (p === "ixigo") return GET_IXIGO_FARE_STATS(fareParams, signal);
          return GET_CUSTOM_BOOKING_STATISTICS(p, fareParams, signal);
        });

        const [bookingResults, operationResults, fareResults] =
          await Promise.all([
            Promise.allSettled(
              statsPartners.map((p: string) =>
                GET_BOOKING_DAILY_COUNTS(p, bookingParams, signal),
              ),
            ),
            Promise.allSettled(
              statsPartners.map((p: string) =>
                GET_BOOKING_DAILY_COUNTS(p, operationParams, signal),
              ),
            ),
            Promise.allSettled(farePromises),
          ]);

        if (signal?.aborted) return;

        const allBookingData: DailyUpdateStats[] = bookingResults.flatMap(
          (r) => toStatsArray(settledValue(r)),
        );
        const allOperationData: DailyUpdateStats[] = operationResults.flatMap(
          (r) => toStatsArray(settledValue(r)),
        );
        const allFareData = fareResults.flatMap((r) =>
          toStatsArray(settledValue(r) as any),
        );

        setStats(mergeStats(allBookingData));
        SetOperationStats(OperationsStats(allOperationData));
        // Calculate and set total fare searches for "All"
        setTotalFareSearches(
          allFareData.reduce(
            (acc: number, curr: any) => acc + Number(curr.fare_searches || 0),
            0,
          ),
        );

        return;
      }

      let queryParams: { [key: string]: string | number | boolean } = {
        date: dateRange[0],
        endDate: dateRange[1],
        groupByDay: true,
      };
      if (travelType) {
        queryParams["travelType"] = travelType;
      }

      if (payType) {
        queryParams["payType"] = payType;
      }

      if (deviceType) {
        queryParams["deviceType"] = deviceType;
        queryParams["filterBy"] = "createdAt";
      }

      let OperationQueryParams: { [key: string]: string | number | boolean } = {
        date: dateRange[0],
        endDate: dateRange[1],
        groupByDay: true,
        filterBy: "startTime",
      };

      if (travelType) {
        OperationQueryParams["travelType"] = travelType;
      }

      if (payType) {
        OperationQueryParams["payType"] = payType;
      }

      if (deviceType) {
        OperationQueryParams["deviceType"] = deviceType;
      }

      if (selectedCity != null || appliedCabPartner != null) {
        if (appliedCabPartner) {
          queryParams["groupByCabPartner"] = true;
          queryParams["cabPartner"] = appliedCabPartner;

          OperationQueryParams["groupByCabPartner"] = true;
          OperationQueryParams["cabPartner"] = appliedCabPartner;
        }

        if (selectedCity) {
          queryParams["groupByCityCode"] = true;
          queryParams["cityCode"] = selectedCity?.code;

          OperationQueryParams["groupByCityCode"] = true;
          OperationQueryParams["cityCode"] = selectedCity?.code;
        }
      }

      // Run specific partner APIs in parallel; don't fail whole UI if one hangs/errors
      const [bookingResult, operationResult, fareResult] =
        await Promise.allSettled([
          GET_BOOKING_DAILY_COUNTS(partner, queryParams, signal),
          GET_BOOKING_DAILY_COUNTS(partner, OperationQueryParams, signal),
          partner === "ixigo"
            ? GET_IXIGO_FARE_STATS(fareParams, signal)
            : GET_CUSTOM_BOOKING_STATISTICS(partner, fareParams, signal),
        ]);

      if (signal?.aborted) return;

      const response = settledValue(bookingResult);
      const OperationStats_response = settledValue(operationResult);
      const fareResponse = settledValue(fareResult);

      const merged = mergeStats(toStatsArray(response));
      const OperationsMerged = OperationsStats(
        toStatsArray(OperationStats_response),
      );

      const fareDataArray = toStatsArray(fareResponse);

      setStats(merged);
      SetOperationStats(OperationsMerged);
      setTotalFareSearches(
        fareDataArray.reduce(
          (acc, curr: any) => acc + Number(curr.fare_searches || 0),
          0,
        ),
      );
    } catch (error) {
      if (signal?.aborted) return;
      console.error(error);
      setStats(null);
      setTotalFareSearches(null);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!lockedCabPartners.length || !appliedCabPartner) return;
    onFiltersChange?.(selectedCity, appliedCabPartner, dateRange);
  }, [appliedCabPartner]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(controller.signal);
    return () => controller.abort();
  }, [
    dateRange[0],
    dateRange[1],
    partner,
    selectedCity,
    appliedCabPartner,
    travelType,
    payType,
    deviceType,
  ]);

  if (loading) {
    return <AnalyticsLoader height="h-[180px]" />;
  }

  // --- Layout Helper ---
  const renderStatCard = (
    label: string,
    value: string | number | null | undefined,
    icon: ReactNode,
    i: number,
    size: "small" | "large" = "small",
    isAmount = false,
  ) => {
    const style = STAT_STYLES[i % STAT_STYLES.length];
    const displayValue = isAmount ? formatRoundAmount(value) : value;
    return (
      <div
        key={label}
        className={`flex-1 ${size === "small" ? "min-w-[120px]" : "min-w-[150px]"} rounded-2xl ${style.bg} p-3 shadow-sm border border-white/80 hover:shadow-md transition-shadow`}
      >
        <div
          className={`w-10 h-10 rounded-xl ${style.iconBg} ${style.iconColor} flex items-center justify-center mb-3 hidden`}
        >
          {icon}
        </div>
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide break-words">
          {label}
        </p>
        {label === "Booking Confirmed" || label === "Transactions Initiated" ? (
          <p className="text-[10px] text-gray-500">
            {label === "Booking Confirmed"
              ? "Ride complete + Pending + Cancelled"
              : "Booking Confirmed + Abandoned"}
          </p>
        ) : null}
        {label === "Collected Amount" || label === "Net Collected Amount" ? (
          <p className="text-[10px] text-gray-500">
            {label === "Collected Amount"
              ? "Completed Full + Completed Partial GMV"
              : "Collected Amount - Total Refund"}
          </p>
        ) : null}
        {label === "IBC Disbursed" ? (
          <>
            <p className="text-[10px] text-gray-500">(Completed rides)</p>
            <p className="text-[10px] text-gray-500">Logged-in</p>
          </>
        ) : null}
        {label === "Discounts" ? (
          <p className="text-[10px] text-gray-500">(Completed rides)</p>
        ) : null}
        <p className="text-xl font-bold mt-1 text-gray-900">{displayValue}</p>
      </div>
    );
  };

  const hasData = stats !== null;

  // Collected Amount & Net Collected Amount — uses total_gmv_full / total_gmv_partial
  const collectedAmount = hasData
    ? Number(stats.total_gmv_full || 0) +
      Number(stats.total_gmv_partial || 0)
    : 0;

  const netCollectedAmount = hasData
    ? collectedAmount - Number(stats.total_refund_amount || 0)
    : 0;

  return (
    <div className="w-full px-1.5 py-2 sm:px-2 sm:py-3 bg-gradient-to-b from-slate-50 to-gray-100 rounded-2xl text-black space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-5 p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 mb-3">
        <div className="flex flex-col">
          <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
            <FaCalendar className="text-blue-500" />
            Date Range
          </p>
          <div className="flex items-center gap-2 rounded-xl py-2 bg-gray-50/80 border border-gray-200/80 h-10 px-2">
            <RangerPicker
              updateDate={[dateRange[0], dateRange[1]]}
              selectedRange={getDate}
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-2 mb-0 ml-2">
            Selected : {dateRange[0]} → {dateRange[1]}
          </p>
        </div>

        <div ref={dropdownRef} className="relative w-full sm:w-56">
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
                      onFiltersChange?.(city, appliedCabPartner, dateRange);
                    }}
                  >
                    {city.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="w-full sm:w-48">
          <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
            <FaTaxi className="text-amber-500" />
            Cab Partner
          </p>
          <select
            className="rounded-xl px-3 py-2.5 w-full text-sm bg-gray-50/80 border border-gray-200/80 h-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:text-gray-800"
            value={lockCabPartnerToAll ? "" : appliedCabPartner || ""}
            disabled={lockCabPartnerToAll || lockedCabPartners.length === 1}
            onChange={(e) => {
              if (lockCabPartnerToAll) return;
              const val = e.target.value || null;
              setSelectedCabPartner(val);
              onFiltersChange?.(selectedCity, val, dateRange);
            }}
          >
            {(lockCabPartnerToAll || lockedCabPartners.length === 0) && (
              <option value="">All Partners</option>
            )}
            {!lockCabPartnerToAll &&
              cabPartnerChoices.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
        </div>

        {(selectedCity ||
          (selectedCabPartner && lockedCabPartners.length === 0)) && (
          <button
            onClick={() => {
              setSelectedCity(null);
              setSelectedCabPartner(null);
              setCitySearch("");

              setTravelType("");
              setPayType("");
              setDeviceType("");

              onFiltersChange?.(
                null,
                lockedCabPartners.length === 1 ? lockedCabPartners[0] : null,
                dateRange,
              );
            }}
            className="flex items-center gap-1.5 text-xs text-rose-600 font-medium py-2 px-3 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <FaEraser />
            Clear filters
          </button>
        )}

        <div className="w-full sm:w-40">
          <p className="text-xs mb-1.5 text-gray-600 font-medium">
            Travel Type
          </p>
          <select
            className="rounded-xl px-3 py-2.5 w-full text-sm bg-gray-50 border h-10"
            value={travelType}
            onChange={(e) => setTravelType(e.target.value)}
          >
            <option value="">All</option>
            <option value="arrival">Arrival</option>
            <option value="departure">Departure</option>
          </select>
        </div>

        <div className="w-full sm:w-40">
          <p className="text-xs mb-1.5 text-gray-600 font-medium">Pay Type</p>
          <select
            className="rounded-xl px-3 py-2.5 w-full text-sm bg-gray-50 border h-10"
            value={payType}
            onChange={(e) => setPayType(e.target.value)}
          >
            <option value="">All</option>
            <option value="FULL">FULL</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <p className="text-xs mb-1.5 text-gray-600 font-medium">
            Device Type
          </p>
          <select
            className="rounded-xl px-3 py-2.5 w-full text-sm bg-gray-50 border h-10"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
          >
            <option value="">All</option>
            <option value="app">app</option>
            <option value="Msite">Msite</option>
            <option value="Web">Web</option>
            <option value="unknown">unknown</option>
            {/* <option value="NULL">NULL</option>
            <option value="mSite_app">mSite_app</option>
            <option value="mSite">mSite</option>
            <option value="Skai_mSite_app">Skai_mSite_app</option>
            <option value="Skai_mSite">Skai_mSite</option>
            <option value="web">web</option> */}
          </select>
        </div>
      </div>

      {!hasData ? (
        <Empty description="No data available for the selected range" />
      ) : (
        <div className="space-y-4">
         {/* Booking Performance Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              Booking Performance:
            </h3>
            <div className="flex flex-wrap gap-4">
              {/* NEW FARE SEARCH CARD */}
              {renderStatCard(
                "Fare Searches",
                totalFareSearches ?? 0,
                <FaSearch className="w-5 h-5" />, // Or reuse <FaChartLine />
                8, // Picks an unused color styling from your STAT_STYLES array
              )}
              {renderStatCard(
                "Transactions Initiated",
                stats.transactions_initiated,
                <FaCreditCard className="w-5 h-5" />,
                0,
              )}
              {renderStatCard(
                "Booking Confirmed",
                stats.payment_complete,
                <FaCheckCircle className="w-5 h-5" />,
                1,
              )}
              {renderStatCard(
                "Rides Completed(Same day)",
                stats.rides_completed,
                <FaFlagCheckered className="w-5 h-5" />,
                2,
              )}
              {renderStatCard(
                "Rides Pending",
                stats.rides_pending,
                <FaClipboardCheck className="w-5 h-5" />,
                3,
              )}
              {renderStatCard(
                "Bookings Cancelled",
                stats.bookings_cancelled,
                <FaTimesCircle className="w-5 h-5" />,
                4,
              )}
              {/* {renderStatCard("Bookings Failed", stats.bookings_failed, <FaExclamationTriangle className="w-5 h-5" />, 5)} */}
              {renderStatCard(
                "Transactions Abandoned",
                stats.transactions_abandoned,
                <FaEraser className="w-5 h-5" />,
                6,
              )}
              {/* {renderStatCard(
                "Pending (Partial Paid)",
                stats.rides_pending_partial_paid || 0,
                <FaClipboardCheck className="w-5 h-5" />,
                8,
              )}
              {renderStatCard(
                "Pending (Full Paid)",
                stats.rides_pending_full_paid || 0,
                <FaClipboardCheck className="w-5 h-5" />,
                9,
              )}
              {renderStatCard(
                "Completed (Partial Paid)",
                stats.rides_completed_partial_paid || 0,
                <FaFlagCheckered className="w-5 h-5" />,
                10,
              )}
              {renderStatCard(
                "Completed (Full Paid)",
                stats.rides_completed_full_paid || 0,
                <FaFlagCheckered className="w-5 h-5" />,
                11,
              )} */}
            </div>
          </div>
          {!hideRevenuePerformance && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 mt-3 flex items-center gap-2">
              Revenue Performance:
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              {renderStatCard(
                "Total GMV",
                stats.total_gmv,
                <FaCoins className="w-5 h-5" />,
                7,
                "large",
                true,
              )}
              {renderStatCard(
                "Base Fare GMV",
                stats.base_fare_gmv,
                <FaMoneyBillWave className="w-5 h-5" />,
                0,
                "large",
                true,
              )}
              {renderStatCard(
                getPlatformShareLabel(partner, "2.5%"),
                stats.indigo_share_2_5,
                <FaPercent className="w-5 h-5" />,
                1,
                "large",
                true,
              )}
              {renderStatCard(
                "Engagement Reserve 5%",
                stats.indigo_share_7_5,
                <FaPercent className="w-5 h-5" />,
                2,
                "large",
                true,
              )}
              {renderStatCard(
                "Total Refund Amount",
                stats.total_refund_amount,
                <FaMoneyBillWave className="w-5 h-5" />,
                3,
                "large",
                true,
              )}
              {/* {renderStatCard(
                "IBC Disbursed",
                "—",
                <FaCoins className="w-5 h-5" />,
                4,
                "large",
              )}
              {renderStatCard(
                "Discounts",
                "—",
                <FaTags className="w-5 h-5" />,
                5,
                "large",
              )} */}
              {renderStatCard(
                "Collected Amount",
                collectedAmount,
                <FaWallet className="w-5 h-5" />,
                9,
                "large",
                true,
              )}
              {renderStatCard(
                "Net Collected Amount",
                netCollectedAmount,
                <FaPiggyBank className="w-5 h-5" />,
                10,
                "large",
                true,
              )}
              {/* {renderStatCard(
                "GMV Partial",
                Number(stats.total_gmv_partial || 0).toFixed(2),
                <FaCoins className="w-5 h-5" />,
                4,
                "large",
              )}
              {renderStatCard(
                "GMV Full",
                Number(stats.total_gmv_full || 0).toFixed(2),
                <FaCoins className="w-5 h-5" />,
                5,
                "large",
              )}
              {renderStatCard(
                "Completed GMV Partial",
                Number(stats.total_gmv_completed_partial || 0).toFixed(2),
                <FaMoneyBillWave className="w-5 h-5" />,
                6,
                "large",
              )}
              {renderStatCard(
                "Completed GMV Full",
                Number(stats.total_gmv_completed_full || 0).toFixed(2),
                <FaMoneyBillWave className="w-5 h-5" />,
                8,
                "large",
              )} */}
            </div>
          </div>
          )}
          {/* <DevicePersonaPerformance /> */}
        </div>
      )}
      {/* Operations Section */}
      {OperationStats !== null && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mt-3 mb-3 flex items-center gap-2">
            Operations:
          </h3>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {renderStatCard(
              "Total Rides",
              OperationStats.total_rides,
              <FaTaxi className="w-5 h-5" />,
              4,
              "large",
            )}
            {renderStatCard(
              "Active Rides",
              OperationStats.active_rides,
              <FaChartLine className="w-5 h-5" />,
              5,
              "large",
            )}
            {renderStatCard(
              "Completed Rides",
              OperationStats.completed_rides,
              <FaCheckCircle className="w-5 h-5" />,
              6,
              "large",
            )}
            {renderStatCard(
              "Cancelled Rides",
              OperationStats.cancelled_rides,
              <FaTimesCircle className="w-5 h-5" />,
              7,
              "large",
            )}
            {renderStatCard(
              "Base Fare Amount",
              OperationStats.completed_booking_basefare,
              <FaMoneyBillWave className="w-5 h-5" />,
              8,
              "large",
              true,
            )}

            {renderStatCard(
              "Total GMV",
              OperationStats.completed_booking_gmv,
              <FaTimesCircle className="w-5 h-5" />,
              7,
              "large",
              true,
            )}
          </div>
        </div>
      )}
    </div>
  );
};
