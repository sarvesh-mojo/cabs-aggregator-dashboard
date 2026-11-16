import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PageMeta from "../../../components/common/PageMeta";
import { GET_CEO_DASHBOARD_METRICS } from "../../../config/customerCare/operationsApicall";
import { CustomCityType } from "../../../config/types";
import DataTable from "../../../components/tables/DataTable";
import { PartnerTab } from "../../../components/common/PartnerTab";

const getDaysInMonth = (dateString: string) => {
  const date = new Date(dateString);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const roundDisplay = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return Math.round(num);
};

const compactCol = (width: number) => ({
  width,
  onHeaderCell: () => ({
    style: {
      whiteSpace: "normal" as const,
      lineHeight: 1.15,
      padding: "4px 4px",
    },
  }),
});

const INDIGO_HARDCODED_DATA = [
  // {
  //   month_start: "2025-11-01",
  //   fare_searches: 56,
  //   total_bookings: 11,
  //   successful_bookings: 2,
  //   cancelled_bookings: 9,
  //   repeat_users: 0,
  //   power_users: 0,
  //   conversion_pct: 18.18,
  //   cancellation_pct: 81.82,
  //   fare_search_growth_pct: null,
  //   booking_growth_pct: null,
  //   conversion_growth: null,
  //   cancellation_growth_pct: null,
  // },
  // {
  //   month_start: "2025-12-01",
  //   fare_searches: 2389,
  //   total_bookings: 148,
  //   successful_bookings: 68,
  //   cancelled_bookings: 80,
  //   repeat_users: 11,
  //   power_users: 5,
  //   conversion_pct: 45.95,
  //   cancellation_pct: 54.05,
  //   fare_search_growth_pct: 4166.07,
  //   booking_growth_pct: 1245.45,
  //   conversion_growth: 3300,
  //   cancellation_growth_pct: 788.89,
  // },
  {
    month_start: "2026-01-01",
    fare_searches: 13906,
    total_bookings: 686,
    successful_bookings: 481,
    cancelled_bookings: 205,
    repeat_users: 52,
    power_users: 15,
    conversion_pct: 70.12,
    cancellation_pct: 29.88,
    fare_search_growth_pct: 482.08,
    booking_growth_pct: 363.51,
    conversion_growth: 607.35,
    cancellation_growth_pct: 156.25,
    baseFare:371118.67,
    totalFare:420323.82,
    paidAmount:420323.82
  },
  {
    month_start: "2026-02-01",
    fare_searches: 50870,
    total_bookings: 1987,
    successful_bookings: 1533,
    cancelled_bookings: 454,
    repeat_users: 129,
    power_users: 24,
    conversion_pct: 77.15,
    cancellation_pct: 22.85,
    fare_search_growth_pct: 265.81,
    booking_growth_pct: 189.65,
    conversion_growth: 218.71,
    cancellation_growth_pct: 121.46,
    baseFare:1302883.02,
    totalFare:1589252.35,
    paidAmount:1589252.35
  },
  {
    month_start: "2026-03-01",
    fare_searches: 55734,
    total_bookings: 2240,
    successful_bookings: 1817,
    cancelled_bookings: 423,
    repeat_users: 177,
    power_users: 27,
    conversion_pct: 81.12,
    cancellation_pct: 18.88,
    fare_search_growth_pct: 9.56,
    booking_growth_pct: 12.73,
    conversion_growth: 18.53,
    cancellation_growth_pct: -6.83,
    baseFare:1645115.7,
    totalFare:1995073.15,
    paidAmount:1995073.15
  },
  {
    month_start: "2026-04-01",
    fare_searches: 39506,
    total_bookings: 4983,
    successful_bookings: 3844,
    cancelled_bookings: 1032,
    repeat_users: 665,
    power_users: 160,
    conversion_pct: 77.14,
    cancellation_pct: 21.16,
    fare_search_growth_pct: -31.4,
    booking_growth_pct: 117.31,
    conversion_growth: 107.56,
    cancellation_growth_pct: 138.89,
    baseFare:3418804.29,
    totalFare:4198714.06,
    paidAmount:1695270.17
  },
  {
    month_start: "2026-05-01",
    fare_searches: 0,
    total_bookings: 8115,
    successful_bookings: 6148,
    cancelled_bookings: 1855,
    repeat_users: 1066,
    power_users: 255,
    conversion_pct: 75.76,
    cancellation_pct: 23.18,
    fare_search_growth_pct: -100,
    booking_growth_pct: 62.85, 
    conversion_growth: 59.94,
    cancellation_growth_pct: 79.75,
  },
];

const IXIGO_HARDCODED_DATA = [
  // {
  //   month_start: "2025-07-01",
  //   fare_searches: 341, total_bookings: 0, successful_bookings: 0,
  //   cancelled_bookings: 0, repeat_users: 0, power_users: 0,
  //   conversion_pct: null, cancellation_pct: null,
  //   fare_search_growth_pct: null, booking_growth_pct: null,
  //   conversion_growth: null, cancellation_growth_pct: null,
  // },
  // {
  //   month_start: "2025-08-01",
  //   fare_searches: 913, total_bookings: 0, successful_bookings: 0,
  //   cancelled_bookings: 0, repeat_users: 0, power_users: 0,
  //   conversion_pct: null, cancellation_pct: null,
  //   fare_search_growth_pct: 167.74, booking_growth_pct: null,
  //   conversion_growth: null, cancellation_growth_pct: null,
  // },
  // {
  //   month_start: "2025-09-01",
  //   fare_searches: 1193, total_bookings: 22, successful_bookings: 2,
  //   cancelled_bookings: 20, repeat_users: 0, power_users: 0,
  //   conversion_pct: 9.09, cancellation_pct: 90.91,
  //   fare_search_growth_pct: 30.67, booking_growth_pct: null,
  //   conversion_growth: null, cancellation_growth_pct: null,
  // },
  // {
  //   month_start: "2025-10-01",
  //   fare_searches: 20226, total_bookings: 488, successful_bookings: 365,
  //   cancelled_bookings: 123, repeat_users: 41, power_users: 13,
  //   conversion_pct: 74.80, cancellation_pct: 25.20,
  //   fare_search_growth_pct: 1595.39, booking_growth_pct: 2118.18,
  //   conversion_growth: 18150, cancellation_growth_pct: 515,
  // },
  {
    month_start: "2025-11-01",
    fare_searches: 60152,
    total_bookings: 1231,
    successful_bookings: 941,
    cancelled_bookings: 290,
    repeat_users: 104,
    power_users: 24,
    conversion_pct: 76.44,
    cancellation_pct: 23.56,
    fare_search_growth_pct: 197.4,
    booking_growth_pct: 152.25,
    conversion_growth: 157.81,
    cancellation_growth_pct: 135.77,
    baseFare:997319,
    totalFare:1163811,
    paidAmount:1163811

  },
  {
    month_start: "2025-12-01",
    fare_searches: 70961,
    total_bookings: 1215,
    successful_bookings: 934,
    cancelled_bookings: 281,
    repeat_users: 64,
    power_users: 16,
    conversion_pct: 76.87,
    cancellation_pct: 23.13,
    fare_search_growth_pct: 17.97,
    booking_growth_pct: -1.3,
    conversion_growth: -0.74,
    cancellation_growth_pct: -3.1,
    baseFare:990398,
    totalFare:1128905.5,
    paidAmount:1128902
  },
  { 
    month_start: "2026-01-01",
    fare_searches: 72062,
    total_bookings: 1711,
    successful_bookings: 1386,
    cancelled_bookings: 325,
    repeat_users: 119,
    power_users: 18,
    conversion_pct: 81.01,
    cancellation_pct: 18.99,
    fare_search_growth_pct: 1.55,
    booking_growth_pct: 40.82,
    conversion_growth: 48.39,
    cancellation_growth_pct: 15.66,
    baseFare:1198428.8,
    totalFare:1338298,
    paidAmount:1338283
  },
  {
    month_start: "2026-02-01",
    fare_searches: 56909,
    total_bookings: 1647,
    successful_bookings: 1331,
    cancelled_bookings: 316,
    repeat_users: 108,
    power_users: 21,
    conversion_pct: 80.81,
    cancellation_pct: 19.19,
    fare_search_growth_pct: -21.03,
    booking_growth_pct: -3.74,
    conversion_growth: -3.97,
    cancellation_growth_pct: -2.77,
    baseFare:1197273.22,
    totalFare:1478878.27,
    paidAmount:1478803
  },
  {
    month_start: "2026-03-01",
    fare_searches: 65021,
    total_bookings: 1635,
    successful_bookings: 1293,
    cancelled_bookings: 342,
    repeat_users: 106,
    power_users: 13,
    conversion_pct: 79.08,
    cancellation_pct: 20.92,
    fare_search_growth_pct: 14.25,
    booking_growth_pct: -0.73,
    conversion_growth: -2.85,
    cancellation_growth_pct: 8.23,
    baseFare:1249481.67,
    totalFare:1491254.1,
    paidAmount:1491236
  },
];

const CeoMetrics = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "mojo";

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [columns, setColumns] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [pagination, setPagination] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });

  const citiesList = [
    { id: 1, title: "All Cities", code: "ALL" },
    { id: 2, title: "Mumbai", code: "BOM" },
    { id: 3, title: "Delhi", code: "DEL" },
    { id: 4, title: "Bangalore", code: "BLR" },
    { id: 5, title: "Hyderabad", code: "HYD" },
    { id: 6, title: "Kolkata", code: "CCU" },
    { id: 7, title: "Chennai", code: "MAA" },
    { id: 8, title: "Kochi", code: "COK" },
    { id: 9, title: "Pune", code: "PNQ" },
    { id: 10, title: "Ahmedabad", code: "AMD" },
    { id: 11, title: "Varanasi", code: "VTZ" },
    { id: 12, title: "Jaipur", code: "JAI" },
    { id: 13, title: "Lucknow", code: "LKO" },
    { id: 14, title: "Indore", code: "IXC" },
    { id: 15, title: "Nagpur", code: "NGB" },
    { id: 16, title: "Pune Business Dist", code: "PBX" },
  ];
  // City dropdown state
  const [cities] = useState<CustomCityType[]>(citiesList);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");

  // Fetch metrics data
  const fetchData = async (page: number, limit: number) => {
    setLoading(true);
    setData([]);
    setColumns([]);
    try {
      // Only pass cityCode if a specific city is selected (not 'ALL' or empty)
      const params: any = {};
      if (selectedCity && selectedCity !== "ALL") {
        params.cityCode = selectedCity;
      }
      // const res = await GET_CEO_DASHBOARD_METRICS(selectedPartner, params);
      // let dataArray: any[] = [];

      // // let currentTotalCount = 0;

      // if (res?.length) {
      //   dataArray = res;
      //   // currentTotalCount = res.length;
      // }

      let dataArray: any[] = [];
      if (selectedPartner === "indigo") {
        // dataArray =
        const hardcodedBase =
          selectedCity && selectedCity !== "ALL"
            ? INDIGO_HARDCODED_DATA.map((d) => ({
                ...d,
                cityCode: selectedCity,
              }))
            : [...INDIGO_HARDCODED_DATA];
        // Step 2: API se current month ka live data fetch karo
        try {
          const res = await GET_CEO_DASHBOARD_METRICS(selectedPartner, params);
          if (res?.length) {
            // Hardcoded mein jo months already hain unhe skip karo (duplicate avoid)
            const hardcodedMonths = new Set(
              hardcodedBase.map((d) => d.month_start),
            );
            const newApiRows = res.filter(
              (item: any) => !hardcodedMonths.has(item.month_start),
            );
            dataArray = [...hardcodedBase, ...newApiRows];
          } else {
            dataArray = hardcodedBase;
          }
        } catch {
          // API fail ho toh sirf hardcoded dikhao
          dataArray = hardcodedBase;
        }
        // } else {
        //   const res = await GET_CEO_DASHBOARD_METRICS(selectedPartner, params);
        //   if (res?.length) {
        //     dataArray = res;
        //   }
        // }
      } else if (selectedPartner === "ixigo") {
        const hardcodedBase =
          selectedCity && selectedCity !== "ALL"
            ? IXIGO_HARDCODED_DATA.map((d) => ({
                ...d,
                cityCode: selectedCity,
              }))
            : [...IXIGO_HARDCODED_DATA];
        try {
          const res = await GET_CEO_DASHBOARD_METRICS(selectedPartner, params);
          if (res?.length) {
            const hardcodedMonths = new Set(
              hardcodedBase.map((d) => d.month_start),
            );
            const newApiRows = res.filter(
              (item: any) => !hardcodedMonths.has(item.month_start),
            );
            dataArray = [...hardcodedBase, ...newApiRows];
          } else {
            dataArray = hardcodedBase;
          }
        } catch {
          dataArray = hardcodedBase;
        }
      } else {
        const res = await GET_CEO_DASHBOARD_METRICS(selectedPartner, params);
        if (res?.length) {
          dataArray = res;
        }
      }

      const lastItem = dataArray[dataArray.length - 1];

      if (lastItem) {
      }

      // setData(dataArray);
      // setTotalRecords(currentTotalCount);
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize: limit,
      }));

      let baseNormalized = 0;

      const baseData = dataArray.find((item: any) => {
        const date = new Date(item.month_start);
        //  INDIGO → Feb
        if (selectedPartner === "indigo") {
          return date.getMonth() === 1; // Feb
        }
        // IXIGO → Nov 2025
        if (selectedPartner === "ixigo") {
          return date.getMonth() === 10 && date.getFullYear() === 2025;
        }

        return false;
      });
      const finalBase = baseData || dataArray[0];

      if (finalBase) {
        const fare = Number(finalBase.fare_searches || 0);
        const days = getDaysInMonth(finalBase.month_start);
        baseNormalized = days ? (fare / days) * 30.4 : 0;
      }

      const baseDays = getDaysInMonth(finalBase?.month_start);
      const baseTotalBookingsNormalized = baseDays
        ? (Number(finalBase?.total_bookings || 0) / baseDays) * 30.4
        : 0;
      const baseSuccessBookingsNormalized = baseDays
        ? (Number(finalBase?.successful_bookings || 0) / baseDays) * 30.4
        : 0;
      const baseCancelledBookingsNormalized = baseDays
        ? (Number(finalBase?.cancelled_bookings || 0) / baseDays) * 30.4
        : 0;

      if (lastItem) {
        const actual = Number(lastItem.fare_searches || 0);
        const totalDaysInMonth = getDaysInMonth(lastItem.month_start);

        // Sirf current month ke elapsed days use karo
        const today = new Date();
        const monthStart = new Date(lastItem.month_start);
        const isCurrentMonth =
          today.getFullYear() === monthStart.getFullYear() &&
          today.getMonth() === monthStart.getMonth();
        const daysElapsed = isCurrentMonth ? today.getDate() : totalDaysInMonth;

        // if (actual && daysElapsed) {
        if (daysElapsed) {
          const dailyAvg = actual / daysElapsed;
          const actualForecast = dailyAvg * totalDaysInMonth;
          const normalizedForecast = dailyAvg * 30.4;

          const growth = baseNormalized
            ? ((normalizedForecast - baseNormalized) / baseNormalized) * 100
            : 0;

          const totalBookingsActual = Number(lastItem.total_bookings || 0);
          const successBookingsActual = Number(
            lastItem.successful_bookings || 0,
          );

          const totalBookingsForecast =
            (totalBookingsActual / daysElapsed) * totalDaysInMonth;
          const successBookingsForecast =
            (successBookingsActual / daysElapsed) * totalDaysInMonth;
          const cancelledBookingsActual = Number(
            lastItem.cancelled_bookings || 0,
          );
          const cancelledBookingsForecast =
            (cancelledBookingsActual / daysElapsed) * totalDaysInMonth;

          const repeatUsersForecast = Math.round(
            (Number(lastItem.repeat_users || 0) / daysElapsed) *
              totalDaysInMonth,
          );
          const powerUsersForecast = Math.round(
            (Number(lastItem.power_users || 0) / daysElapsed) *
              totalDaysInMonth,
          );
          const conversionPctForecast = totalBookingsForecast
            ? Number(
                (
                  (successBookingsForecast / totalBookingsForecast) *
                  100
                ).toFixed(2),
              )
            : 0;
          const cancellationPctForecast = totalBookingsForecast
            ? Number(
                (
                  (cancelledBookingsForecast / totalBookingsForecast) *
                  100
                ).toFixed(2),
              )
            : 0;
          const forecastAmount = (value: any) => {
            if (value === null || value === undefined || value === "") return null;
            const num = Number(value);
            if (!Number.isFinite(num)) return null;
            return Math.round((num / daysElapsed) * totalDaysInMonth);
          };

          dataArray.push({
            ...lastItem,
            month_start: lastItem.month_start,

            fare_searches: Number(actualForecast.toFixed(2)),
            normalized_fare_searches: Number(normalizedForecast.toFixed(2)),
            normalized_growth: Number(growth.toFixed(2)),
            total_bookings: Math.round(totalBookingsForecast),
            successful_bookings: Math.round(successBookingsForecast),
            cancelled_bookings: Math.round(cancelledBookingsForecast),
            repeat_users: repeatUsersForecast,
            power_users: powerUsersForecast,
            conversion_pct: conversionPctForecast,
            cancellation_pct: cancellationPctForecast,
            baseFare: forecastAmount(lastItem.baseFare),
            totalFare: forecastAmount(lastItem.totalFare),
            paidAmount: forecastAmount(lastItem.paidAmount),
            isForecast: true,
          });
        }
        console.log("FINAL DATA ARRAY:", dataArray);
        setTotalRecords(dataArray.length);
        setData([...dataArray]);
      }

      if (dataArray.length > 0) {
        const firstItem = dataArray[0];
        const excludeKeys = ["updatedAt"];

        const dynamicCols = Object.keys(firstItem)
          // .filter((k) => !excludeKeys.includes(k))
          .filter(
            (k) =>
              !excludeKeys.includes(k) &&
              ![
                "fare_search_growth_pct",
                "booking_growth_pct",
                "conversion_growth",
                "cancellation_growth_pct",
                "baseFare",
                "totalFare",
                "paidAmount",
              ].includes(k),
          )
          .map((key) => {
            //  NORMAL COLUMN
            if (key === "month_start") {
              return {
                title: "MONTH",
                dataIndex: "month_start",
                key: key,
                ...compactCol(92),
                render: (text: any, record: any) => {
                  if (record?.isForecast) {
                    return (
                      <div>
                        <div>{text}</div>
                        <div style={{ fontSize: "10px", color: "gray" }}>
                          Forecast
                        </div>
                      </div>
                    );
                  }
                  return text;
                },
              };
            }
            if (key !== "fare_searches") {
              //  TOTAL_BOOKINGS
              if (key === "total_bookings") {
                return {
                  title: "TOTAL_BOOKINGS",
                  key: "total_bookings_group",
                  children: [
                    {
                      title: "Actual Value",
                      dataIndex: "total_bookings",
                      key: "total_bookings",
                      ...compactCol(72),
                      render: (text: any) => roundDisplay(text),
                    },
                    {
                      title: "Norm. Growth %",
                      key: "total_bookings_growth",
                      ...compactCol(78),

                      render: (_: any, record: any) => {
                        if (!baseTotalBookingsNormalized) return "-";
                        const days = getDaysInMonth(record?.month_start);
                        const val = Number(record?.total_bookings || 0);
                        const currentNormalized = days
                          ? (val / days) * 30.4
                          : 0;
                        const growth =
                          ((currentNormalized - baseTotalBookingsNormalized) /
                            baseTotalBookingsNormalized) *
                          100;
                        return Math.round(growth) + "%";
                      },
                    },
                  ],
                };
              }

              //  SUCCESSFUL_BOOKINGS
              if (key === "successful_bookings") {
                return {
                  title: "SUCCESSFUL_BOOKINGS",
                  key: "successful_bookings_group",
                  children: [
                    {
                      title: "Actual Value",
                      dataIndex: "successful_bookings",
                      key: "successful_bookings",
                      ...compactCol(72),
                      render: (text: any) => roundDisplay(text),
                    },
                    {
                      title: "Norm. Growth %",
                      key: "successful_bookings_growth",
                      ...compactCol(78),

                      render: (_: any, record: any) => {
                        if (!baseSuccessBookingsNormalized) return "-";
                        const days = getDaysInMonth(record?.month_start);
                        const val = Number(record?.successful_bookings || 0);
                        const currentNormalized = days
                          ? (val / days) * 30.4
                          : 0;
                        const growth =
                          ((currentNormalized - baseSuccessBookingsNormalized) /
                            baseSuccessBookingsNormalized) *
                          100;
                        return Math.round(growth) + "%";
                      },
                    },
                  ],
                };
              }
              //   CANCELLED_BOOKINGS
              if (key === "cancelled_bookings") {
                return {
                  title: "CANCELLED_BOOKINGS",
                  key: "cancelled_bookings_group",
                  children: [
                    {
                      title: "Actual Value",
                      dataIndex: "cancelled_bookings",
                      key: "cancelled_bookings",
                      ...compactCol(72),
                      render: (text: any) => roundDisplay(text),
                    },
                    {
                      title: "Norm. Growth %",
                      key: "cancelled_bookings_growth",
                      ...compactCol(78),

                      render: (_: any, record: any) => {
                        if (!baseCancelledBookingsNormalized) return "-";
                        const days = getDaysInMonth(record?.month_start);
                        const val = Number(record?.cancelled_bookings || 0);
                        const currentNormalized = days
                          ? (val / days) * 30.4
                          : 0;
                        const growth =
                          ((currentNormalized -
                            baseCancelledBookingsNormalized) /
                            baseCancelledBookingsNormalized) *
                          100;
                        return Math.round(growth) + "%";
                      },
                    },
                  ],
                };
              }
              const narrowMetricKeys = new Set([
                "repeat_users",
                "power_users",
                "conversion_pct",
                "cancellation_pct",
              ]);
              return {
                title: key.toUpperCase(),
                dataIndex: key,
                key: key,
                ...(narrowMetricKeys.has(key)
                  ? { className: "ceo-metric-narrow", ...compactCol(64) }
                  : compactCol(76)),
                render: (text: any) => {
                  if (text === null || text === undefined) return "-";
                  if (typeof text === "number") return Math.round(text);
                  if (
                    typeof text === "string" &&
                    text.trim() !== "" &&
                    Number.isFinite(Number(text))
                  ) {
                    return Math.round(Number(text));
                  }
                  return typeof text === "object"
                    ? JSON.stringify(text).substring(0, 50) + "..."
                    : String(text).substring(0, 50);
                },
              };
            }

            //  FARE + NORMALIZED (safe way)
            return {
              title: "FARE_SEARCHES",
              key: "fare_searches_group",
              children: [
                {
                  title: "Actual Value",
                  dataIndex: "fare_searches",
                  key: "fare_searches",
                  ...compactCol(72),
                  render: (text: any) => roundDisplay(text),
                },
                {
                  title: "Normalized Value",
                  key: "normalized_fare_searches",
                  ...compactCol(80),
                  render: (_: any, record: any) => {
                    if (record?.isForecast) {
                      return roundDisplay(record.normalized_fare_searches);
                    }
                    const fare = Number(record?.fare_searches || 0);
                    const days = getDaysInMonth(record?.month_start);

                    if (!days) return "-";

                    const normalized = (fare / days) * 30.4;

                    return Math.round(normalized);
                  },
                },
                {
                  title: "Norm. Growth %",
                  key: "normalized_growth",
                  ...compactCol(78),
                  render: (_: any, record: any) => {
                    if (record?.isForecast) {
                      const rounded = roundDisplay(record.normalized_growth);
                      return rounded === "-" ? "-" : rounded + "%";
                    }
                    const fare = Number(record?.fare_searches || 0);
                    const days = getDaysInMonth(record?.month_start);

                    // if (!days || !febNormalized) return "-";
                    if (!days || !baseNormalized) return "-";

                    const currentNormalized = (fare / days) * 30.4;

                    const growth =
                      ((currentNormalized - baseNormalized) / baseNormalized) *
                      100;

                    return Math.round(growth) + "%";

                    // return growth.toFixed(2);
                  },
                },
              ],
            };
          });

        const look2BookCol = {
          title: "LOOK_2_BOOK",
          dataIndex: "look_2_book",
          key: "look_2_book",
          className: "ceo-metric-narrow",
          ...compactCol(64),
          render: (_: any, record: any) => {
            const bookings = Number(record?.total_bookings || 0);
            const searches = Number(record?.fare_searches || 0);
            if (!searches) return "-";
            return Math.round((bookings / searches) * 100) + "%";
          },
        };

        const repeatIdx = dynamicCols.findIndex(
          (col: any) => col.key === "repeat_users",
        );
        if (repeatIdx >= 0) dynamicCols.splice(repeatIdx, 0, look2BookCol);
        else dynamicCols.push(look2BookCol);

        const fareAmountCol = (title: string, dataIndex: string) => ({
          title,
          dataIndex,
          key: dataIndex,
          ...compactCol(96),
          render: (text: any) => roundDisplay(text),
        });
        const fareAmountCols = [
          fareAmountCol("BASE_FARE", "baseFare"),
          fareAmountCol("TOTAL_FARE", "totalFare"),
          fareAmountCol("PAID_AMOUNT", "paidAmount"),
        ];
        const cancelIdx = dynamicCols.findIndex(
          (col: any) => col.key === "cancellation_pct",
        );
        if (cancelIdx >= 0) dynamicCols.splice(cancelIdx + 1, 0, ...fareAmountCols);
        else dynamicCols.push(...fareAmountCols);

        setColumns(dynamicCols);
      }
    } catch (error) {
      console.error("Failed to fetch Remark Records", error);
      setData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCity) return;
    fetchData(1, pagination.pageSize);
  }, [selectedPartner, selectedCity]);

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize || 10,
    });
  };

  return (
    <div className="p-4 ceo-metrics-compact">
      <style>{`
        .ceo-metrics-compact .ant-table-thead > tr > th {
          font-size: 11px;
        }
        .ceo-metrics-compact .ant-table-tbody > tr > td {
          font-size: 12px;
        }
        .ceo-metrics-compact .ant-table-content > table {
          width: max-content !important;
          min-width: 0 !important;
        }
        .ceo-metrics-compact .ceo-metric-narrow {
          width: 64px !important;
          min-width: 64px !important;
          max-width: 64px !important;
          word-break: break-word;
        }
      `}</style>
      <PageMeta title="Remarks Records" description="Remarks Records" />
      <div className="mb-4">
        <div className="flex gap-8">
          <div className="[&_button:nth-child(3)]:hidden">
            <PartnerTab />
          </div>
          <div>
            <select
              id="city-select"
              className="w-full max-w-xs border rounded px-3 py-2"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="" disabled>
                Select CityCode
              </option>
              {cities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.title} ({city.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded shadow-sm">
        <DataTable
          title="CEO Metrics"
          columns={columns}
          dataSource={data}
          loading={loading}
          size="small"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: totalRecords,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `Total ${total} records`,
          }}
          onChange={handleTableChange}
        />
      </div>
    </div>
  );
};

export default CeoMetrics;
