import { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useSelector } from "react-redux";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { LogsTable } from "../../../components/tables/LogsTable";
import {
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_IXIGO_FARE_STATS,
} from "../../../config/customerCare/operationsApicall";
import { getPartnerBrandLabel } from "../../../utils/partnerDisplayLabels";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

type RideTypeKey =
  | "city_arrival"
  | "outstation_arrival"
  | "city_departure"
  | "outstation_departure"
  | "city_rides"
  | "rentals"
  | "outstation_one_way"
  | "outstation_round_trip"
  | "outstation"
  | "railway_transfers"
  | "other";

type CellMetrics = {
  searches: number;
  bookings: number;
  gmv: number;
};

type DayRow = {
  key: string;
  journey_date: string;
  isTotal?: boolean;
  platform_total: CellMetrics;
} & Record<RideTypeKey, CellMetrics>;

const EMPTY_CELL = (): CellMetrics => ({
  searches: 0,
  bookings: 0,
  gmv: 0,
});

const AIRPORT_TYPES: RideTypeKey[] = [
  "city_arrival",
  "outstation_arrival",
  "city_departure",
  "outstation_departure",
];

const OTHER_TYPES: RideTypeKey[] = [
  "city_rides",
  "rentals",
  "outstation_one_way",
  "outstation_round_trip",
  "outstation",
  "railway_transfers",
  "other",
];

const ALL_TYPES: RideTypeKey[] = [...AIRPORT_TYPES, ...OTHER_TYPES];

const RIDE_TYPE_LABELS: Record<RideTypeKey, string> = {
  city_arrival: "City arrival",
  outstation_arrival: "Outstation arrival",
  city_departure: "City departure",
  outstation_departure: "Outstation departure",
  city_rides: "City rides",
  rentals: "Rentals",
  outstation_one_way: "Outstation one-way",
  outstation_round_trip: "Outstation round-trip",
  outstation: "Outstation",
  railway_transfers: "Railway transfers",
  other: "Other",
};

const asCount = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const addCell = (target: CellMetrics, source: Partial<CellMetrics>) => {
  target.searches += asCount(source.searches);
  target.bookings += asCount(source.bookings);
  target.gmv += asCount(source.gmv);
};

const emptyDay = (journeyDate: string, isTotal = false): DayRow => {
  const row = {
    key: isTotal ? "period-total" : journeyDate,
    journey_date: isTotal ? "Period total" : journeyDate,
    isTotal,
    platform_total: EMPTY_CELL(),
  } as DayRow;
  ALL_TYPES.forEach((type) => {
    row[type] = EMPTY_CELL();
  });
  return row;
};

const conversion = (cell: CellMetrics) =>
  cell.searches ? (cell.bookings / cell.searches) * 100 : 0;

const formatInr = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

const formatCell = (cell: CellMetrics) => {
  if (!cell.searches && !cell.bookings && !cell.gmv) {
    return <span className="text-gray-300">—</span>;
  }
  const pct = conversion(cell);
  return (
    <div className="leading-tight">
      <div>
        {cell.searches.toLocaleString("en-IN")} /{" "}
        {cell.bookings.toLocaleString("en-IN")} / {pct.toFixed(2)}%
      </div>
      <div className="text-[11px] text-slate-600">{formatInr(cell.gmv)}</div>
    </div>
  );
};

const normalizeRideType = (raw: unknown): RideTypeKey => {
  const key = String(raw || "")
    .trim()
    .toLowerCase() as RideTypeKey;
  return ALL_TYPES.includes(key) ? key : "other";
};

const mergeFlatRows = (groups: any[][]): DayRow[] => {
  const map: Record<string, DayRow> = {};

  groups.flat().forEach((row) => {
    const journeyDate = String(row?.journey_date || "").slice(0, 10);
    if (!journeyDate) return;
    if (!map[journeyDate]) map[journeyDate] = emptyDay(journeyDate);

    const rideType = normalizeRideType(row?.ride_type);
    const cell = {
      searches: asCount(row?.searches),
      bookings: asCount(row?.bookings),
      gmv: asCount(row?.gmv),
    };
    addCell(map[journeyDate][rideType], cell);
    addCell(map[journeyDate].platform_total, cell);
  });

  const days = Object.values(map).sort((a, b) =>
    a.journey_date.localeCompare(b.journey_date),
  );

  if (!days.length) return [];

  const total = emptyDay("Period total", true);
  days.forEach((day) => {
    addCell(total.platform_total, day.platform_total);
    ALL_TYPES.forEach((type) => addCell(total[type], day[type]));
  });

  return [...days, total];
};

const visibleOtherTypes = (rows: DayRow[]) =>
  OTHER_TYPES.filter((type) => {
    if (type === "outstation_one_way" || type === "outstation_round_trip") {
      return rows.some((row) => row[type].searches > 0 || row[type].bookings > 0);
    }
    if (type === "outstation") {
      return rows.some((row) => row.outstation.searches > 0 || row.outstation.bookings > 0);
    }
    if (type === "other") {
      return rows.some((row) => row.other.searches > 0 || row.other.bookings > 0);
    }
    return true;
  });

const compactHeader = {
  onHeaderCell: () => ({
    style: {
      whiteSpace: "normal" as const,
      lineHeight: 1.15,
      padding: "6px 8px",
    },
  }),
};

const buildColumns = (brandLabel: string, otherTypes: RideTypeKey[]) => [
  {
    title: "Journey date",
    dataIndex: "journey_date",
    key: "journey_date",
    width: 120,
    fixed: "left" as const,
    ...compactHeader,
    render: (value: string, record: DayRow) => (
      <span className={record.isTotal ? "font-semibold" : undefined}>{value}</span>
    ),
  },
  {
    title: `${brandLabel} total`,
    key: "platform_total",
    width: 150,
    ...compactHeader,
    render: (_: unknown, record: DayRow) => formatCell(record.platform_total),
  },
  {
    title: "Airport rides",
    key: "airport",
    ...compactHeader,
    children: AIRPORT_TYPES.map((type) => ({
      title: RIDE_TYPE_LABELS[type],
      key: type,
      width: 140,
      ...compactHeader,
      render: (_: unknown, record: DayRow) => formatCell(record[type]),
    })),
  },
  {
    title: "Other rides",
    key: "other_rides",
    ...compactHeader,
    children: otherTypes.map((type) => ({
      title: RIDE_TYPE_LABELS[type],
      key: type,
      width: 140,
      ...compactHeader,
      render: (_: unknown, record: DayRow) => formatCell(record[type]),
    })),
  },
];

export const FareSearchRideType = () => {
  const selectedPartner =
    useSelector((state: any) => state?.operationStore?.ReportSelectedPartner) ||
    "all";

  const [dateRange, setDateRange] = useState<[string, string]>(() => [
    moment().startOf("month").format("YYYY-MM-DD"),
    getTodayIST(),
  ]);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const brandLabel = getPartnerBrandLabel(selectedPartner);

  const loadPartnerRows = useCallback(
    async (bodyPayload: Record<string, string>, signal?: AbortSignal) => {
      if (selectedPartner === "all") {
        const results = await Promise.allSettled([
          GET_CUSTOM_BOOKING_STATISTICS("indigo", bodyPayload, signal),
          GET_CUSTOM_BOOKING_STATISTICS("bac", bodyPayload, signal),
          GET_CUSTOM_BOOKING_STATISTICS("railyatri", bodyPayload, signal),
          GET_IXIGO_FARE_STATS(bodyPayload, signal),
        ]);
        return results.map((result) =>
          result.status === "fulfilled" && Array.isArray(result.value)
            ? result.value
            : [],
        );
      }
      if (selectedPartner === "ixigo") {
        const response = await GET_IXIGO_FARE_STATS(bodyPayload, signal);
        return [Array.isArray(response) ? response : []];
      }
      const response = await GET_CUSTOM_BOOKING_STATISTICS(
        selectedPartner,
        bodyPayload,
        signal,
      );
      return [Array.isArray(response) ? response : []];
    },
    [selectedPartner],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const groups = await loadPartnerRows(
          {
            reportType: "fare_search_ride_type_conversion",
            from: dateRange[0],
            to: dateRange[1],
          },
          controller.signal,
        );
        if (!cancelled) setRows(mergeFlatRows(groups));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [dateRange, loadPartnerRows]);

  const otherTypes = useMemo(() => visibleOtherTypes(rows), [rows]);
  const columns = useMemo(
    () => buildColumns(brandLabel, otherTypes),
    [brandLabel, otherTypes],
  );

  return (
    <div className="fare-search-ride-type">
      <style>{`
        .fare-search-ride-type .ant-table-thead > tr > th {
          font-size: 11px;
        }
        .fare-search-ride-type .ant-table-tbody > tr > td {
          font-size: 12px;
          padding: 6px 8px;
          vertical-align: top;
        }
        .fare-search-ride-type .ant-table-tbody > tr:last-child > td {
          background: #f8fafc;
          font-weight: 500;
        }
      `}</style>
      <PartnerTab propsData={{ isall: true }} />
      <LogsTable
        columns={columns}
        dataSource={rows}
        loading={loading}
        updateDate={dateRange}
        selectedRange={setDateRange}
        totalCount={rows.filter((row) => !row.isTotal).length}
        title={`Fare Search & Conversion — ride type (${selectedPartner.toUpperCase()})`}
        type="FARESEARCH"
        pagination={false}
      />
      <div className="mt-3 space-y-1 px-1 text-xs text-slate-600">
        <p>
          Each cell: searches / bookings / conversion%, then GMV (₹) on the next
          line.
        </p>
        <p>
          Conversion = confirmed bookings ÷ fare searches. GMV = booked total
          fare (confirmed / completed / cancelled).
        </p>
      </div>
    </div>
  );
};
