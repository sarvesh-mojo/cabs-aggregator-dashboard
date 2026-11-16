import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { useSelector } from "react-redux";
import PageMeta from "../../../components/common/PageMeta";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { RangerPicker } from "../../../components/common/RangePicker";
import DataTable from "../../../components/tables/DataTable";
import { GET_ENGAGEMENT_REPORT } from "../../../config/customerCare/operationsApicall";
import { EngagementReportRow } from "../../../config/types";

const todayStr = () => new Date().toISOString().split("T")[0];

const startOfYearStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};

const formatINR = (value: number | string | undefined | null) => {
  if (value == null || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹${num.toLocaleString("en-IN")}`;
};

const formatNumber = (value: number | string | undefined | null) => {
  if (value == null || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("en-IN");
};

const normalizeRows = (rows: EngagementReportRow[]) =>
  rows.map((row, index) => ({
    ...row,
    key:
      row.isTotal
        ? `total-${row.partner ?? "all"}`
        : row.month || `${row.partner ?? "row"}-${index}`,
  }));

const isErReportSupported = (partner: string) =>
  partner.toLowerCase() !== "travelvip";

const ErReport = () => {
  const operationStore = useSelector((state: any) => state?.operationStore);
  const loginPartners = useSelector(
    (state: any) => state.authStore?.login_partners ?? [],
  );
  const selectedPartner =
    operationStore?.ReportSelectedPartner || loginPartners[0] || "indigo";

  const [dateRange, setDateRange] = useState<[string, string]>([
    startOfYearStr(),
    todayStr(),
  ]);
  const [data, setData] = useState<EngagementReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const query = {
        from_date: dateRange[0],
        to_date: dateRange[1],
      };

      let rows: EngagementReportRow[] = [];

      if (selectedPartner === "all") {
        const partners = loginPartners.filter(
          (partner: string) =>
            partner !== "all" && isErReportSupported(partner),
        );
        const results = await Promise.allSettled(
          partners.map((partner: string) =>
            GET_ENGAGEMENT_REPORT(partner, query, abortRef.current?.signal),
          ),
        );

        rows = results.flatMap((result, index) => {
          if (result.status !== "fulfilled") return [];
          return result.value.map((row: EngagementReportRow) => ({
            ...row,
            partner: partners[index]?.toUpperCase(),
          }));
        });
      } else if (!isErReportSupported(selectedPartner)) {
        setError("ER Report is not available for TravelVIP.");
        setData([]);
        return;
      } else {
        const result = await GET_ENGAGEMENT_REPORT(
          selectedPartner,
          query,
          abortRef.current?.signal,
        );
        rows = result.map((row) => ({
          ...row,
          partner: selectedPartner.toUpperCase(),
        }));
      }

      setData(normalizeRows(rows));
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
      if (err?.response?.status === 403) {
        setError("You do not have access to ER Report for this partner.");
      } else {
        setError("Failed to fetch ER report. Please try again.");
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, loginPartners, selectedPartner]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const showPartnerColumn = selectedPartner === "all";

  const columns = useMemo<ColumnsType<EngagementReportRow>>(
    () => [
      ...(showPartnerColumn
        ? [
            {
              title: "Partner",
              dataIndex: "partner",
              key: "partner",
              render: (text: string) => text || "-",
            },
          ]
        : []),
      {
        title: "Month",
        dataIndex: "month",
        key: "month",
        render: (text: string, record) => (
          <span className={record.isTotal ? "font-semibold" : ""}>
            {text || "-"}
          </span>
        ),
      },
      {
        title: "Confirmed Bookings",
        dataIndex: "confirmedBookings",
        key: "confirmedBookings",
        align: "right" as const,
        render: (_value: number, record) =>
          formatNumber(record.confirmedBookings ?? record.completedRides),
      },
      {
        title: "GMV",
        dataIndex: "gmv",
        key: "gmv",
        align: "right" as const,
        render: (value: number) => formatINR(value),
      },
      {
        title: "Base Fare",
        dataIndex: "baseFare",
        key: "baseFare",
        align: "right" as const,
        render: (value: number) => formatINR(value),
      },
      {
        title: "Listing Fee",
        dataIndex: "listingFee",
        key: "listingFee",
        align: "right" as const,
        render: (value: number) => formatINR(value),
      },
      {
        title: "Engagement Reserve",
        dataIndex: "engagementReserve",
        key: "engagementReserve",
        align: "right" as const,
        render: (value: number) => formatINR(value),
      },
      {
        title: "IBC Disbursed",
        dataIndex: "ibcDisbursed",
        key: "ibcDisbursed",
        align: "right" as const,
        render: (value: number) => formatINR(value),
      },
      {
        title: "Discount Given",
        dataIndex: "discountGiven",
        key: "discountGiven",
        align: "right" as const,
        render: (value: number) => formatINR(value),
      },
    ],
    [showPartnerColumn],
  );

  return (
    <div className="p-4">
      <PageMeta title="ER Report" description="Engagement Reserve Report" />
      <PartnerTab />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <RangerPicker updateDate={dateRange} selectedRange={setDateRange} />
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="rounded-lg border border-indigo-300 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded shadow-sm">
        <DataTable
          title={`ER Report (${selectedPartner.toUpperCase()})`}
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="key"
          scroll={{ x: "max-content" }}
          pagination={false}
        />
      </div>
    </div>
  );
};

export default ErReport;
