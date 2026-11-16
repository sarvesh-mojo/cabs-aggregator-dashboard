import { Table, } from "antd";
import { RangerPicker } from "../common/RangePicker";
import { CsvDownload } from "../common/CsvDownload";
import { useSelector } from "react-redux";
import {
  GETBOOKING_LOGS_CSV,
  // EXPORT_BOOKING_CSV,
} from "../../config/customerCare/operationsApicall";
// import dayjs from "dayjs";
import { useState } from "react";

const IXIGO_MAX_PAGE_LIMIT = 20;

const appendCsvChunk = (base: string, chunk: string): string => {
  const trimmedChunk = chunk.trim();
  if (!trimmedChunk) return base;
  if (!base.trim()) return trimmedChunk;

  const dataLines = trimmedChunk.split(/\r?\n/).slice(1).filter(Boolean);
  if (dataLines.length === 0) return base;

  return `${base.replace(/\r?\n$/, "")}\n${dataLines.join("\n")}`;
};

type LogsTableProps = {
  columns: any[];
  dataSource?: any[];
  loading?: boolean;
  pagination?: any;
  onPaginationChange?: (page: number, pageSize: number) => void;
  updateDate: [string, string];
  selectedRange: (range: [string, string]) => void;
  totalCount?: number;
  title?: string;
  /** API status filter, e.g. "CANCELLED" or "BOOKING_CONFIRMED,CANCELLED,COMPLETED" */
  type?: string;
  DownloadCSV?: boolean;
  filename?: string;
  /** Which field to filter dates by — "createdAt" or "updatedAt" */
  filterBy?: string;
  selectedCabPartner?: string | null;
  /** CSV column set selector — "bookingLog" | "conversionLog" */
  uiPageName?: "bookingLog" | "conversionLog";
};

export const LogsTable = (props: LogsTableProps) => {
  const {
    columns,
    dataSource = [],
    loading,
    pagination,
    onPaginationChange,
    updateDate,
    selectedRange,
    totalCount = 0,
    title,
    type,
    DownloadCSV = false,
    filename,
    filterBy = "createdAt",
    selectedCabPartner,
    uiPageName = "bookingLog",
  } = props;

  const { logsPartner } = useSelector((state: any) => state?.authStore);
  const selectedPartner =
    useSelector((state: any) => state?.operationStore?.ReportSelectedPartner) ||
    "mojo";
  const [activeRowKey, setActiveRowKey] = useState<string | number | null>(
    null,
  );

  // API returns raw CSV when reportType is "csv" — pass string through for blob download
  const loadCSVData = async (): Promise<string> => {
    const buildPayload = (page: number, limit: number) => {
      const bodyPayload: any = {
        bookingId: "",
        page,
        limit,
        startHour: 0,
        endHour: 23,
        status: type || "",
        startDate: updateDate[0],
        endDate: updateDate[1],
        filterBy,
        uiPageName,
      };

      if (selectedCabPartner) {
        bodyPayload.cabPartner = selectedCabPartner;
      } else if (logsPartner && logsPartner !== "") {
        bodyPayload.cabPartner = logsPartner;
      }

      return bodyPayload;
    };

    const isIxigo = selectedPartner === "ixigo";

    if (!isIxigo) {
      return GETBOOKING_LOGS_CSV(
        selectedPartner,
        buildPayload(1, totalCount > 0 ? totalCount : 10000),
      );
    }

    // ixigo API enforces limit <= 20 — paginate CSV export when needed
    const totalToFetch = totalCount > 0 ? totalCount : IXIGO_MAX_PAGE_LIMIT;
    const totalPages = Math.max(1, Math.ceil(totalToFetch / IXIGO_MAX_PAGE_LIMIT));

    let combinedCsv = "";

    for (let page = 1; page <= totalPages; page++) {
      const remaining = totalToFetch - (page - 1) * IXIGO_MAX_PAGE_LIMIT;
      const limit = Math.min(IXIGO_MAX_PAGE_LIMIT, remaining);

      const chunk = await GETBOOKING_LOGS_CSV(
        selectedPartner,
        buildPayload(page, limit),
      );

      combinedCsv =
        page === 1 ? chunk : appendCsvChunk(combinedCsv, chunk);
    }

    return combinedCsv;
  };

  return (
    <div className="p-3 bg-white shadow-sm rounded mt-2">
      <style>{`
      .active-row {
        background-color: #e6f4ff !important; /* light blue */
        }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        {title && (
          <div className="flex items-center gap-6">
            <h1 className="font-bold text-xl">{title}</h1>
            <span className="text-gray-600 text-sm font-medium">
              Total count: <strong>{totalCount}</strong>
            </span>
            {logsPartner && logsPartner != "" ? (
              <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text">
                @powered by <i>{logsPartner}</i>
              </span>
            ) : (
              ""
            )}
          </div>
        )}

        <div className="flex gap-3">
          {DownloadCSV && (
            <CsvDownload
              Headcolumns={columns}
              filename={filename}
              loadCSVData={loadCSVData}
            />
          )}

          <RangerPicker updateDate={updateDate} selectedRange={selectedRange} />
        </div>
      </div>

      <div>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          onChange={
            onPaginationChange
              ? (pag) => {
                  if (pag?.current != null)
                    onPaginationChange(pag.current, pag.pageSize ?? 10);
                }
              : undefined
          }
          rowKey={(record: any) => record.bookingId || record.id || record.key}
          bordered
          onRow={(record: any) => ({
            onClick: () => {
              setActiveRowKey(record.bookingId);
            },
          })}
          rowClassName={(record: any) => {
            return record.bookingId === activeRowKey ? "active-row" : "";
          }}
          scroll={{ x: "max-content" }}
          size="middle"
          style={{ fontSize: "12px" }}
          // size={window.innerWidth < 768 ? "small" : "middle"}
          // style={{ fontSize: window.innerWidth < 768 ? "11px" : "12px" }}
        />
      </div>
    </div>
  );
};
