// import { useEffect, useState, useCallback } from "react";
// import { LogsTable } from "../../../components/tables/LogsTable";
// import { GET_CUSTOM_BOOKING_STATISTICS, GET_IXIGO_FARE_STATS } from "../../../config/customerCare/operationsApicall";
// import { Booking } from "../../../config/customerCare/interfaceTypes";
// import { useSelector } from "react-redux";
// // import { render } from "@fullcalendar/core/preact.js";
// import moment from "moment";
// import { PartnerTab } from "../../../components/common/PartnerTab";

// const getTodayIST = () =>
//   new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// export const FareSearchReport = () => {

//   const OperationstoreData = useSelector((state: any) => state?.operationStore);
//   const selectedPartner = OperationstoreData?.ReportSelectedPartner || "indigo";

//   const defaultZero = (value: any) => value ?? 0;

//   const columns = [
//     {
//       title: "Journey Date",
//       dataIndex: "journey_date",
//       key: "journey_date",
//     },
//     {
//       title: "Fare Searches",
//       dataIndex: "fare_searches",
//       key: "fare_searches",
//       render: defaultZero

//     },
//     {
//       title: "Success Bookings",
//       dataIndex: "successful_bookings",
//       key: "successful_bookings",
//       render: defaultZero

//     },
//     {
//       title: "Conversion Percent",
//       dataIndex: "conversion_percentage",
//       key: "conversion_percentage",
//       render: defaultZero

//     },
//     {
//       title: "Fare Search Growth PCT",
//       dataIndex: "fare_search_growth_pct",
//       key: "fare_search_growth_pct",
//       render: defaultZero
//     },
//     {
//       title: "Booking Growth PCT",
//       dataIndex: "booking_growth_pct",
//       key: "booking_growth_pct",
//       render: defaultZero
//     }
//   ];

//   const [dateRange, setDateRange] = useState<[string, string]>(() => {
//     const start = moment().subtract(14, 'days').format('YYYY-MM-DD');
//     const end = getTodayIST();
//     return [start, end];
//   });

//   const [LogsData, setLogsData] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(false);

//   const FetchAPI = useCallback(async () => {
//     // const p = "indigo";
//     setLoading(true);
//     try {
//       const bodyPayload = {
//         reportType: "seven_day_fare_search_conversion",
//         from: dateRange[0],
//         to: dateRange[1],
//       };

//       let response;
//       if (selectedPartner === "ixigo") {

//         response = await GET_IXIGO_FARE_STATS(bodyPayload);
//       } else {

//         response = await GET_CUSTOM_BOOKING_STATISTICS("indigo", bodyPayload);
//       }

//       // const LogsResp: any = await GET_CUSTOM_BOOKING_STATISTICS(p, bodyPayload);
//       setLogsData(response ?? []);
//     } catch (err) {
//       // console.error(" Error:", err);
//       setLogsData([]);
//     } finally {
//       setLoading(false);
//     }
//     // }, [dateRange[0], dateRange[1]]);
//   }, [dateRange, selectedPartner]);

//   useEffect(() => {
//     FetchAPI();
//   }, [FetchAPI]);

//   const handleRangeChange = (range: [string, string]) => {
//     setDateRange(range);
//   };

//   return (
//     <>
//       <PartnerTab propsData={{ isall: false }} />
//       <LogsTable
//         columns={columns}
//         dataSource={LogsData}
//         loading={loading}
//         updateDate={dateRange}
//         selectedRange={handleRangeChange}
//         totalCount={LogsData?.length}
//         // title="Fare Search Report"
//         title={`Fare Search Report (${selectedPartner.toUpperCase()})`}
//         type="FARESEARCH"
//       />
//     </>
//   );
// };

import { useEffect, useState, useCallback, useMemo } from "react";
import { LogsTable } from "../../../components/tables/LogsTable";
import {
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_IXIGO_FARE_STATS,
} from "../../../config/customerCare/operationsApicall";
import { Booking } from "../../../config/customerCare/interfaceTypes";
import { useSelector } from "react-redux";
import moment from "moment";
import { PartnerTab } from "../../../components/common/PartnerTab";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const compactHeader = {
  onHeaderCell: () => ({
    style: {
      whiteSpace: "normal" as const,
      lineHeight: 1.15,
      padding: "4px 4px",
    },
  }),
};

const compactCol = (width: number) => ({
  width,
  ...compactHeader,
});

const addFareAmount = (
  target: Record<string, any>,
  source: any,
  field: "baseFare" | "totalFare" | "paidAmount",
) => {
  const raw = source?.[field];
  if (raw === null || raw === undefined || raw === "") return;
  const num = Number(raw);
  if (!Number.isFinite(num)) return;
  target[field] = (target[field] ?? 0) + num;
};

const mergeByDate = (indigoRows: any[], ixigoRows: any[]): any[] => {
  const map: Record<string, any> = {};
  [...indigoRows, ...ixigoRows].forEach((row) => {
    const d = row.journey_date;
    if (!map[d])
      map[d] = {
        journey_date: d,
        fare_searches: 0,
        confirmed_bookings: 0,
        successful_bookings: 0,
        baseFare: null,
        totalFare: null,
        paidAmount: null,
      };
    map[d].fare_searches += Number(row.fare_searches || 0);
    map[d].confirmed_bookings += Number(row.confirmed_bookings || 0);
    map[d].successful_bookings += Number(row.successful_bookings || 0);
    addFareAmount(map[d], row, "baseFare");
    addFareAmount(map[d], row, "totalFare");
    addFareAmount(map[d], row, "paidAmount");
  });
  return Object.values(map).sort((a, b) =>
    a.journey_date.localeCompare(b.journey_date),
  );
};

export const FareSearchReport = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  // const selectedPartner = OperationstoreData?.ReportSelectedPartner || "indigo";
  // const isAllSelected = selectedPartner.toLowerCase() === "all";
  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "all";

  const defaultZero = (value: any) => {
    if (value === null || value === undefined || value === "") return 0;
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : 0;
  };

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    // const start = moment().subtract(14, "days").format("YYYY-MM-DD"); // show only 15 days daya from current date
    const start = moment().startOf("month").format("YYYY-MM-DD");
    const end = getTodayIST();
    return [start, end];
  });

  const [LogsData, setLogsData] = useState<Booking[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // const isMobile = window.innerWidth < 768;

  // Columns builder — sirf Normalized Growth % add ki, baaki sab same
  // const buildColumns = (rawData: any[]) => {
  // Base value = current month ki 1 tarikh wali row
  // const today = new Date();
  // const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  // const baseRow = rawData.find((item: any) => item.journey_date === firstOfMonth);
  // const baseValue = Number(baseRow?.fare_searches || 0);
  const buildColumns = (rawData: any[], range: [string, string]) => {
    const renderFareAmount =
      (field: "baseFare" | "totalFare" | "paidAmount") =>
      (_: unknown, record: any) => {
        const val = record?.[field];
        if (val === null || val === undefined || val === "") return "-";
        const num = Number(val);
        if (!Number.isFinite(num)) return "-";
        return Math.round(num).toLocaleString("en-IN");
      };
    // if (isMobile) {
    //   //  MOBILE VIEW
    //   return [
    //     {
    //       title: "Date",
    //       dataIndex: "journey_date",
    //       key: "journey_date",
    //     },
    //     {
    //       title: "FS",
    //       dataIndex: "fare_searches",
    //       key: "fare_searches",
    //     },
    //     {
    //       title: "CB",
    //       dataIndex: "confirmed_bookings",
    //       key: "confirmed_bookings",
    //     },
    //     {
    //       title: "%",
    //       key: "book_to_search_pct",
    //       render: (_: any, record: any) => {
    //         const fare = Number(record?.fare_searches || 0);
    //         const confirm = Number(record?.confirmed_bookings || 0);
    //         return fare ? ((confirm / fare) * 100).toFixed(1) + "%" : "0%";
    //       },
    //     },
    //   ];
    // }
    const rangeStart = new Date(range[0]);
    const firstOfMonth = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-01`;
    const baseRow =
      rawData.find((item: any) => item.journey_date === firstOfMonth) ||
      rawData[0];
    // const baseRow = rawData[0];
    const baseFare = Number(baseRow?.fare_searches || 0);
    const baseConfirmed = Number(baseRow?.confirmed_bookings || 0);
    const baseBookings = Number(baseRow?.successful_bookings || 0);

    return [
      {
        title: "Journey Date",
        dataIndex: "journey_date",
        key: "journey_date",
        ...compactCol(96),
        render: (text: any, record: any) => {
          if (record?.isForecast) {
            return (
              <div>
                <div style={{ fontWeight: "bold", color: "gray" }}>{text}</div>
                <div style={{ fontSize: "10px", color: "gray" }}> Forecast</div>
              </div>
            );
          }
          return text;
        },
      },
      {
        title: "FARE_SEARCHES",
        key: "fare_searches_group",
        ...compactHeader,
        children: [
          {
            title: "Actual",
            dataIndex: "fare_searches",
            key: "fare_searches",
            ...compactCol(72),
            render: defaultZero,
          },
          {
            title: "Norm. Growth %",
            key: "normalized_growth",
            ...compactCol(78),
            render: (_: any, record: any) => {
              if (!baseFare) return "-";
              const fare = Number(record?.fare_searches || 0);
              const growth = ((fare - baseFare) / baseFare) * 100;
              return Math.round(growth) + "%";
            },
          },
        ],
      },
      // {
      //   title: "Confirmed Bookings",
      //   dataIndex: "confirmed_bookings",
      //   key: "confirmed_bookings",
      //   render: defaultZero,
      // },
      {
        title: "CONFIRMED_BOOKINGS",
        key: "confirmed_bookings_group",
        ...compactHeader,
        children: [
          {
            title: "Actual ",
            dataIndex: "confirmed_bookings",
            key: "confirmed_bookings",
            ...compactCol(72),
            render: defaultZero,
          },
          {
            title: "Norm. Growth %",
            key: "confirmed_booking_growth",
            ...compactCol(78),
            render: (_: any, record: any) => {
              if (!baseBookings) return "-";

              const confirmed = Number(record?.confirmed_bookings || 0);
              const growth =
                ((confirmed - baseConfirmed) / baseConfirmed) * 100;

              return Math.round(growth) + "%";
            },
          },
        ],
      },

      // {
      //   title: "SUCCESS_BOOKINGS",
      //   key: "success_bookings_group",
      //   children: [
      //     {
      //       title: "A.Value",
      //       dataIndex: "successful_bookings",
      //       key: "successful_bookings",
      //       render: defaultZero,
      //     },
      //     {
      //       title: "Norm. Growth %",
      //       key: "booking_normalized_growth",
      //       render: (_: any, record: any) => {
      //         if (!baseBookings) return "-";
      //         const bookings = Number(record?.successful_bookings || 0);
      //         const growth = ((bookings - baseBookings) / baseBookings) * 100;
      //         return growth.toFixed(2) + "%";
      //       },
      //     },
      //   ],
      // },

      {
        title: "Book 2 Search  %",
        key: "book_to_search_pct",
        ...compactCol(84),
        render: (_: any, record: any) => {
          const fareSearch = Number(record?.fare_searches || 0);
          const confirm = Number(record?.confirmed_bookings || 0);

          if (!fareSearch) return "0%";

          const percent = (confirm / fareSearch) * 100;
          return Math.round(percent) + "%";
        },
      },
      {
        title: "BASE FARE",
        dataIndex: "baseFare",
        key: "baseFare",
        ...compactCol(92),
        render: renderFareAmount("baseFare"),
      },
      {
        title: "TOTAL FARE",
        dataIndex: "totalFare",
        key: "totalFare",
        ...compactCol(92),
        render: renderFareAmount("totalFare"),
      },
      {
        title: "PAID AMOUNT",
        dataIndex: "paidAmount",
        key: "paidAmount",
        ...compactCol(92),
        render: renderFareAmount("paidAmount"),
      },
      // {
      //   title: "Conversion Percent",
      //   dataIndex: "conversion_percentage",
      //   key: "conversion_percentage",
      //   width: 100,
      //   render: defaultZero,
      // },
      // {
      //   title: "Fare Search Growth PCT",
      //   dataIndex: "fare_search_growth_pct",
      //   key: "fare_search_growth_pct",
      //   render: defaultZero,
      // },
      // {
      //   title: "Booking Growth PCT",
      //   dataIndex: "booking_growth_pct",
      //   key: "booking_growth_pct",
      //   render: defaultZero,
      // },
    ];
  };

  const FetchAPI = useCallback(async () => {
    setLoading(true);
    try {
      const bodyPayload = {
        reportType: "seven_day_fare_search_conversion",
        from: dateRange[0],
        to: dateRange[1],
      };

      let rawData: any[] = [];
      // if (selectedPartner === "all") {
      //   const results = await Promise.all([
      //     GET_CUSTOM_BOOKING_STATISTICS("indigo", bodyPayload),
      //     GET_IXIGO_FARE_STATS(bodyPayload),
      //   ]);
      //   const indigoRes = (results[0] as unknown as any[]) ?? [];
      //   const ixigoRes = (results[1] as unknown as any[]) ?? [];
      //   rawData = mergeByDate(indigoRes, ixigoRes);
      // }
      // if (selectedPartner === "all") {
      //   const [indigoResult, ixigoResult] = await Promise.allSettled([
      //     GET_CUSTOM_BOOKING_STATISTICS("indigo", bodyPayload),
      //     GET_IXIGO_FARE_STATS(bodyPayload),
      //   ]);
      //   const indigoRes =
      //     indigoResult.status === "fulfilled"
      //       ? ((indigoResult.value as unknown as any[]) ?? [])
      //       : [];
      //   const ixigoRes =
      //     ixigoResult.status === "fulfilled"
      //       ? ((ixigoResult.value as unknown as any[]) ?? [])
      //       : [];
      //   rawData = mergeByDate(indigoRes, ixigoRes);
       if (selectedPartner === "all") {
  const [indigoResult, ixigoResult, bacResult] =
    await Promise.allSettled([
      GET_CUSTOM_BOOKING_STATISTICS("indigo", bodyPayload),
      GET_CUSTOM_BOOKING_STATISTICS("bac", bodyPayload),
      GET_IXIGO_FARE_STATS(bodyPayload),
    ]);

const indigoRes =
  indigoResult.status === "fulfilled"
    ? (indigoResult.value as any)
    : [];

  const ixigoRes =
    ixigoResult.status === "fulfilled"
      ? (ixigoResult.value as any)
      : [];

 const bacRes =
  bacResult.status === "fulfilled"
    ? (bacResult.value as any)
    : [];

  rawData = mergeByDate(
    [...indigoRes, ...bacRes],
    ixigoRes
    
  );
  // console.log("ALL Count", rawData);
  
      } else if (selectedPartner === "ixigo") {
        rawData =
          ((await GET_IXIGO_FARE_STATS(bodyPayload)) as unknown as any[]) ?? [];
      } else {
        rawData =
          ((await GET_CUSTOM_BOOKING_STATISTICS(
             // "indigo",
            selectedPartner,
            bodyPayload,
          )) as unknown as any[]) ?? [];
      }

      const todayStr = getTodayIST();
      const now = new Date();
      // const hoursElapsed = now.getHours() + now.getMinutes() / 60;
      const hoursElapsed = Math.max(1, now.getHours() + now.getMinutes() / 60);

      const todayRow = rawData.find((r: any) => r.journey_date === todayStr);

      if (todayRow && hoursElapsed > 0) {
        const forecastFare = Math.round(
          (Number(todayRow.fare_searches || 0) / hoursElapsed) * 24,
        );
        const forecastConfirmed = Math.round(
          (Number(todayRow.confirmed_bookings || 0) / hoursElapsed) * 24,
        );
        const forecastSuccess = Math.round(
          (Number(todayRow.successful_bookings || 0) / hoursElapsed) * 24,
        );
        const forecastConversion = forecastFare
          ? Number(((forecastSuccess / forecastFare) * 100).toFixed(2))
          : 0;

        rawData.push({
          journey_date: todayStr,
          fare_searches: forecastFare,
          confirmed_bookings: forecastConfirmed,
          successful_bookings: forecastSuccess,
          conversion_percentage: forecastConversion,
          fare_search_growth_pct: todayRow.fare_search_growth_pct,
          booking_growth_pct: todayRow.booking_growth_pct,
          baseFare: todayRow.baseFare,
          totalFare: todayRow.totalFare,
          paidAmount: todayRow.paidAmount,
          isForecast: true,
        });
      }

      setDynamicColumns(buildColumns(rawData, dateRange));
      setLogsData(rawData);
    } catch (err) {
      setLogsData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPartner]);

  useEffect(() => {
    FetchAPI();
  }, [FetchAPI]);

  const handleRangeChange = (range: [string, string]) => {
    setDateRange(range);
    setPagination({ current: 1, pageSize: 10 });
  };

  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return LogsData.slice(start, end);
  }, [LogsData, pagination]);

  return (
    <div className="fare-search-compact">
      <style>{`
        .fare-search-compact .ant-table-thead > tr > th {
          font-size: 11px;
        }
        .fare-search-compact .ant-table-tbody > tr > td {
          font-size: 12px;
          padding: 4px 6px;
        }
      `}</style>
      <PartnerTab propsData={{ isall: true }} />
      <LogsTable
        columns={dynamicColumns}
        // dataSource={LogsData}
        dataSource={paginatedData}
        loading={loading}
        updateDate={dateRange}
        selectedRange={handleRangeChange}
        totalCount={LogsData?.length}
        title={`Fare Search Report (${selectedPartner.toUpperCase()})`}
        type="FARESEARCH"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: LogsData.length,
          showSizeChanger: true,
        }}
        onPaginationChange={(page, pageSize) =>
          setPagination({
            current: page,
            pageSize: pageSize,
          })
        }
      />
    </div>
  );
};
