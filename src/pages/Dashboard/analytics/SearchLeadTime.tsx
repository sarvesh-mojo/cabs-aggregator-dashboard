import { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useSelector } from "react-redux";
import { Modal, Spin, Table } from "antd";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { LogsTable } from "../../../components/tables/LogsTable";
import {
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_IXIGO_FARE_STATS,
} from "../../../config/customerCare/operationsApicall";
import { isRequestCanceled } from "../../../config/apiMethods";

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const COUNT_FIELDS = [
  "searches",
  "same_day_searches",
  "same_day_booked",
  "same_day_bookers",
  "future_searches",
  "future_booked",
  "future_bookers",
  "other_searches",
] as const;

type CountField = (typeof COUNT_FIELDS)[number];

type LeadRow = {
  key: string;
  search_date: string;
  searches: number;
  same_day_searches: number;
  same_day_booked: number;
  same_day_bookers: number;
  future_searches: number;
  future_booked: number;
  future_bookers: number;
  other_searches: number;
};

type SplitRow = {
  key: string;
  pickup_date: string;
  days_ahead: number;
  searches: number;
  booked: number;
  bookers: number;
};

const emptyRow = (searchDate: string): LeadRow => ({
  key: searchDate,
  search_date: searchDate,
  searches: 0,
  same_day_searches: 0,
  same_day_booked: 0,
  same_day_bookers: 0,
  future_searches: 0,
  future_booked: 0,
  future_bookers: 0,
  other_searches: 0,
});

const asCount = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeRow = (row: any): LeadRow | null => {
  const searchDate = String(row?.search_date || "").slice(0, 10);
  if (!searchDate) return null;
  const next = emptyRow(searchDate);
  COUNT_FIELDS.forEach((field) => {
    next[field] = asCount(row?.[field]);
  });
  return next;
};

const mergeRows = (groups: any[][]): LeadRow[] => {
  const map: Record<string, LeadRow> = {};
  groups.flat().forEach((row) => {
    const next = normalizeRow(row);
    if (!next) return;
    if (!map[next.search_date]) map[next.search_date] = emptyRow(next.search_date);
    COUNT_FIELDS.forEach((field) => {
      map[next.search_date][field] += next[field];
    });
  });
  return Object.values(map).sort((a, b) => a.search_date.localeCompare(b.search_date));
};

const daysAhead = (searchDate: string, pickupDate: string) => {
  const start = Date.parse(searchDate);
  const pickup = Date.parse(pickupDate);
  if (!Number.isFinite(start) || !Number.isFinite(pickup)) return 0;
  return Math.round((pickup - start) / 86400000);
};

const normalizeSplitRow = (row: any, searchDate: string): SplitRow | null => {
  const pickupDate = String(row?.pickup_date || "").slice(0, 10);
  if (!pickupDate) return null;
  return {
    key: pickupDate,
    pickup_date: pickupDate,
    days_ahead: daysAhead(searchDate, pickupDate),
    searches: asCount(row?.searches),
    booked: asCount(row?.booked),
    bookers: asCount(row?.bookers),
  };
};

const mergeSplitRows = (groups: any[][], searchDate: string): SplitRow[] => {
  const map: Record<string, SplitRow> = {};
  groups.flat().forEach((row) => {
    const next = normalizeSplitRow(row, searchDate);
    if (!next) return;
    if (!map[next.pickup_date]) {
      map[next.pickup_date] = { ...next, searches: 0, booked: 0, bookers: 0 };
    }
    map[next.pickup_date].searches += next.searches;
    map[next.pickup_date].booked += next.booked;
    map[next.pickup_date].bookers += next.bookers;
  });
  return Object.values(map).sort((a, b) => a.pickup_date.localeCompare(b.pickup_date));
};

const rate = (booked: number, searches: number) =>
  searches ? `${Math.round((booked / searches) * 100)}%` : "0%";

const DEFINITIONS: Array<{ term: string; text: string }> = [
  {
    term: "Search day",
    text: "The day the fare search was made, in India time. This is not the pickup day. A row for 12 Nov is everyone who searched on 12 Nov, whether the cab is for that day or a later day.",
  },
  {
    term: "Same-day pickup",
    text: "The pickup date on the search is the same calendar day as the search. Someone looked up a cab for today and the ride is today.",
  },
  {
    term: "Future pickup",
    text: "The pickup date is after the search day. Someone searched today for a ride tomorrow or later. The booking still sits on the search day, even if they paid on a later day.",
  },
  {
    term: "Searches",
    text: "One lookup of fares. The same person refreshing the page is more than one search. Fare search rows do not store a phone number, so this is searches, not people.",
  },
  {
    term: "Booked",
    text: "That search became a booking in confirmed, completed, or cancelled. A trip cancelled after confirmation still counts, because it was confirmed first. Booked divided by searches is the book rate.",
  },
  {
    term: "Bookers",
    text: "Distinct phone numbers on those booked searches, for that day and that pickup group. One person with two bookings counts once. The same person can appear in both same-day and future if they booked both kinds of trip.",
  },
  {
    term: "Range cards",
    text: "Searches and booked trips added across the dates you picked. Bookers stay in the table only, because adding daily phone counts would count the same person again on each day.",
  },
  {
    term: "Other searches",
    text: "A search with no pickup time, or a pickup date before the day they searched. These are left out of same-day and future so those two rates stay clean.",
  },
  {
    term: "Pickup dates",
    text: "Click a search day, or its future search count, to see which later pickup dates those searches are for. The rows add up to that day’s future searches.",
  },
];

const compactHeader = {
  onHeaderCell: () => ({
    style: {
      whiteSpace: "normal" as const,
      lineHeight: 1.15,
      padding: "4px 4px",
    },
  }),
};

const countColumn = (title: string, field: CountField, width: number) => ({
  title,
  dataIndex: field,
  key: field,
  width,
  ...compactHeader,
  render: (value: unknown) => asCount(value).toLocaleString("en-IN"),
});

const buildColumns = (onOpen: (row: LeadRow) => void) => [
  {
    title: "Search day",
    dataIndex: "search_date",
    key: "search_date",
    width: 110,
    ...compactHeader,
    render: (value: string, record: LeadRow) => (
      <button
        type="button"
        className="search-lead-time-link"
        onClick={() => onOpen(record)}
      >
        {value}
      </button>
    ),
  },
  {
    title: "SAME-DAY PICKUP",
    key: "same_day",
    ...compactHeader,
    children: [
      countColumn("Searches", "same_day_searches", 80),
      countColumn("Booked", "same_day_booked", 72),
      countColumn("Bookers", "same_day_bookers", 72),
      {
        title: "Book %",
        key: "same_day_pct",
        width: 70,
        ...compactHeader,
        render: (_: unknown, record: LeadRow) =>
          rate(record.same_day_booked, record.same_day_searches),
      },
    ],
  },
  {
    title: "FUTURE PICKUP",
    key: "future",
    ...compactHeader,
    children: [
      {
        title: "Searches",
        dataIndex: "future_searches",
        key: "future_searches",
        width: 80,
        ...compactHeader,
        render: (value: unknown, record: LeadRow) => {
          const count = asCount(value);
          if (count <= 0) return "0";
          return (
            <button
              type="button"
              className="search-lead-time-link"
              onClick={() => onOpen(record)}
            >
              {count.toLocaleString("en-IN")}
            </button>
          );
        },
      },
      countColumn("Booked", "future_booked", 72),
      countColumn("Bookers", "future_bookers", 72),
      {
        title: "Book %",
        key: "future_pct",
        width: 70,
        ...compactHeader,
        render: (_: unknown, record: LeadRow) =>
          rate(record.future_booked, record.future_searches),
      },
    ],
  },
  countColumn("Other searches", "other_searches", 88),
];

const sumField = (rows: LeadRow[], field: CountField) =>
  rows.reduce((total, row) => total + row[field], 0);

const sumSplit = (rows: SplitRow[], field: "searches" | "booked" | "bookers") =>
  rows.reduce((total, row) => total + row[field], 0);

export const SearchLeadTime = () => {
  const selectedPartner =
    useSelector((state: any) => state?.operationStore?.ReportSelectedPartner) ||
    "all";

  const [dateRange, setDateRange] = useState<[string, string]>(() => [
    moment().startOf("month").format("YYYY-MM-DD"),
    getTodayIST(),
  ]);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [splitTarget, setSplitTarget] = useState<LeadRow | null>(null);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState("");

  const loadPartnerRows = useCallback(
    async (bodyPayload: Record<string, string>, signal?: AbortSignal) => {
      if (selectedPartner === "all") {
        const [indigoResult, bacResult, ixigoResult] = await Promise.allSettled([
          GET_CUSTOM_BOOKING_STATISTICS("indigo", bodyPayload, signal),
          GET_CUSTOM_BOOKING_STATISTICS("bac", bodyPayload, signal),
          GET_IXIGO_FARE_STATS(bodyPayload, signal),
        ]);
        const fulfilled = (result: PromiseSettledResult<unknown>) =>
          result.status === "fulfilled" && Array.isArray(result.value)
            ? result.value
            : [];
        const groups = [
          fulfilled(indigoResult),
          fulfilled(bacResult),
          fulfilled(ixigoResult),
        ];
        const anyLoaded = [indigoResult, bacResult, ixigoResult].some(
          (result) => result.status === "fulfilled",
        );
        return { groups, anyLoaded };
      }
      if (selectedPartner === "ixigo") {
        const response = await GET_IXIGO_FARE_STATS(bodyPayload, signal);
        return {
          groups: [Array.isArray(response) ? response : []],
          anyLoaded: true,
        };
      }
      const response = await GET_CUSTOM_BOOKING_STATISTICS(
        selectedPartner,
        bodyPayload,
        signal,
      );
      return {
        groups: [Array.isArray(response) ? response : []],
        anyLoaded: true,
      };
    },
    [selectedPartner],
  );

  const openFutureSplit = useCallback((row: LeadRow) => {
    setSplitTarget(row);
  }, []);

  const columns = useMemo(
    () => buildColumns(openFutureSplit),
    [openFutureSplit],
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { groups } = await loadPartnerRows({
        reportType: "fare_search_lead_time",
        from: dateRange[0],
        to: dateRange[1],
      });
      setRows(mergeRows(groups));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, loadPartnerRows]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (!splitTarget) return undefined;
    const controller = new AbortController();
    let active = true;
    setSplitLoading(true);
    setSplitError("");
    setSplitRows([]);

    loadPartnerRows(
      {
        reportType: "fare_search_future_pickup_split",
        from: splitTarget.search_date,
        to: splitTarget.search_date,
        searchDate: splitTarget.search_date,
      },
      controller.signal,
    )
      .then(({ groups, anyLoaded }) => {
        if (!active) return;
        if (!anyLoaded) {
          setSplitError("Could not load the pickup dates for this search day.");
          setSplitRows([]);
          return;
        }
        setSplitRows(mergeSplitRows(groups, splitTarget.search_date));
      })
      .catch((error) => {
        if (!active || isRequestCanceled(error)) return;
        setSplitError("Could not load the pickup dates for this search day.");
        setSplitRows([]);
      })
      .finally(() => {
        if (active) setSplitLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadPartnerRows, splitTarget]);

  const splitTotals = useMemo(
    () => ({
      searches: sumSplit(splitRows, "searches"),
      booked: sumSplit(splitRows, "booked"),
      bookers: sumSplit(splitRows, "bookers"),
    }),
    [splitRows],
  );

  const splitTableColumns = useMemo(
    () => [
      { title: "Pickup date", dataIndex: "pickup_date", key: "pickup_date" },
      {
        title: "Days later",
        dataIndex: "days_ahead",
        key: "days_ahead",
        width: 100,
        render: (value: number) => (value === 1 ? "1 day" : `${value} days`),
      },
      {
        title: "Searches",
        dataIndex: "searches",
        key: "searches",
        width: 90,
        render: (value: number) => asCount(value).toLocaleString("en-IN"),
      },
      {
        title: "Share",
        key: "share",
        width: 70,
        render: (_: unknown, record: SplitRow) =>
          rate(record.searches, splitTotals.searches),
      },
      {
        title: "Booked",
        dataIndex: "booked",
        key: "booked",
        width: 80,
        render: (value: number) => asCount(value).toLocaleString("en-IN"),
      },
      {
        title: "Book %",
        key: "book_pct",
        width: 70,
        render: (_: unknown, record: SplitRow) =>
          rate(record.booked, record.searches),
      },
    ],
    [splitTotals.searches],
  );

  const totals = useMemo(
    () => ({
      sameDaySearches: sumField(rows, "same_day_searches"),
      sameDayBooked: sumField(rows, "same_day_booked"),
      futureSearches: sumField(rows, "future_searches"),
      futureBooked: sumField(rows, "future_booked"),
      otherSearches: sumField(rows, "other_searches"),
    }),
    [rows],
  );

  return (
    <div className="search-lead-time">
      <style>{`
        .search-lead-time .ant-table-thead > tr > th { font-size: 11px; }
        .search-lead-time .ant-table-tbody > tr > td { font-size: 12px; padding: 4px 6px; }
        .search-lead-time-link {
          color: #1d4ed8;
          background: none;
          border: 0;
          padding: 0;
          font: inherit;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .search-lead-time-link:hover { color: #1e3a8a; }
      `}</style>
      <PartnerTab propsData={{ isall: true }} />
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
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Same-day pickup</div>
          <div className="mt-1 text-sm text-slate-800">
            {totals.sameDaySearches.toLocaleString("en-IN")} searches ·{" "}
            {totals.sameDayBooked.toLocaleString("en-IN")} booked ·{" "}
            {rate(totals.sameDayBooked, totals.sameDaySearches)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Future pickup</div>
          <div className="mt-1 text-sm text-slate-800">
            {totals.futureSearches.toLocaleString("en-IN")} searches ·{" "}
            {totals.futureBooked.toLocaleString("en-IN")} booked ·{" "}
            {rate(totals.futureBooked, totals.futureSearches)}
          </div>
        </div>
      </div>
      {totals.otherSearches > 0 && (
        <p className="mb-3 text-xs text-slate-400">
          {totals.otherSearches.toLocaleString("en-IN")} searches have no pickup
          time, or a pickup date before the search day.
        </p>
      )}
      <p className="text-xs text-slate-500">
        Click a search day, or its future search count, to see which pickup
        dates those future searches are for.
      </p>
      <LogsTable
        columns={columns}
        dataSource={rows}
        loading={loading}
        updateDate={dateRange}
        selectedRange={setDateRange}
        totalCount={rows.length}
        title={`Same-day vs future (${String(selectedPartner).toUpperCase()})`}
        type="FARESEARCH"
        pagination={{
          pageSize: 31,
          showSizeChanger: true,
          total: rows.length,
        }}
      />
      <Modal
        open={Boolean(splitTarget)}
        title={
          splitTarget
            ? `Future pickups searched on ${splitTarget.search_date}`
            : "Future pickups"
        }
        onCancel={() => setSplitTarget(null)}
        footer={null}
        width={720}
        destroyOnHidden
        styles={{ body: { maxHeight: "calc(100vh - 160px)", overflow: "auto" } }}
      >
        {splitTarget && (
          <p className="mb-3 text-sm text-slate-600">
            {splitTarget.future_searches.toLocaleString("en-IN")} future searches
            on this day. Each row is the pickup date on those searches.
            {splitRows.length > 0 &&
              splitTotals.searches !== splitTarget.future_searches &&
              ` The dates below add up to ${splitTotals.searches.toLocaleString("en-IN")}.`}
          </p>
        )}
        {splitError && (
          <p className="mb-3 text-sm text-red-600">{splitError}</p>
        )}
        <Spin spinning={splitLoading}>
          <Table
            columns={splitTableColumns}
            dataSource={splitRows}
            pagination={false}
            size="small"
            rowKey="pickup_date"
            scroll={{ y: 240 }}
            locale={{ emptyText: splitLoading ? " " : "No future pickups on this search day." }}
          />
          {splitRows.length > 0 && (
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-medium text-slate-800">
              <span>Total</span>
              <span>
                {splitTotals.searches.toLocaleString("en-IN")} searches ·{" "}
                {splitTotals.booked.toLocaleString("en-IN")} booked ·{" "}
                {rate(splitTotals.booked, splitTotals.searches)}
              </span>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};
