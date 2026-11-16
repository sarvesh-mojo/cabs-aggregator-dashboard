// import CustomBookingReport from "./CustomBookingReport";

// const CabManagement = () => {
//   return <CustomBookingReport />;
// };

// export default CabManagement;

import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../../components/common/PageMeta";
import { PartnerTab } from "../../../components/common/PartnerTab";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_UPDATE,
  CUSTOM_GENERIC_CREATE,
  CUSTOM_GENERIC_TABLE_CSV,
} from "../../../config/customerCare/operationsApicall";
import { GenericTablePayload } from "../../../config/types";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router";
import HourlyWindowRunbook from "./HourlyWindowRunbook.tsx";
import HourlyQuotaBoard from "./HourlyQuotaBoard.tsx";

const HIDDEN_APP_CONFIG_KEY = "DOWNLOADABLE_TABLE_DATA";

function isDownloadableConfigRow(row: any) {
  const key = String(row?.config_key ?? row?.key ?? row?.name ?? "").trim();
  return key === HIDDEN_APP_CONFIG_KEY;
}

function isSafeTableName(table: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(table);
}

function stripTableNameQuotes(item: unknown) {
  return String(item ?? "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim();
}

function parseDownloadableTables(value: unknown): string[] {
  if (value == null || value === "") return [];

  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => parseDownloadableTables(item)))];
  }

  if (typeof value === "object") {
    const maybeTables = (value as { tables?: unknown }).tables;
    if (Array.isArray(maybeTables)) return parseDownloadableTables(maybeTables);
    return [];
  }

  let text = String(value).trim();
  if (
    (text.startsWith("'") && text.endsWith("'") && text.length > 1) ||
    (text.startsWith('"') && text.endsWith('"') && text.length > 1)
  ) {
    const inner = text.slice(1, -1).trim();
    if (inner.startsWith("[") || inner.startsWith("{") || inner.includes(",")) {
      text = inner;
    }
  }

  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      return parseDownloadableTables(JSON.parse(text.replace(/'/g, '"')));
    } catch {
      return parseDownloadableTables(
        text.replace(/^\[/, "").replace(/\]$/, "").split(","),
      );
    }
  }

  return text
    .split(",")
    .map(stripTableNameQuotes)
    .filter((name) => isSafeTableName(name));
}

function configValueToJsonArray(value: unknown) {
  return JSON.stringify(parseDownloadableTables(value));
}

function getRowConfigValue(row: any) {
  return row?.config_value ?? row?.value ?? "";
}

const REPORT_TABLES: { value: string; label: string }[] = [
  { value: "cabPartner_counter", label: "Counter Update" },
  { value: "cab_invoice_providers", label: "Invoice Table" },
  { value: "cab_partner_images", label: "Cab Partner Images" },
  { value: "cab_partner_visibility", label: "Cab Partner Visibility" },
  { value: "cab_usp", label: "Cab Partner Usb Update" },
  { value: "city_cab_status", label: "Cab Partner Live" },
  { value: "coupons", label: "Add coupons" },
  { value: "google_accounts ", label: "Add Mapkey" },
  { value: "operation_team_contacts", label: "Add Email or Mobile Internal Team For Mojoboxx" },
  { value: "partner_payment_config", label: "Add Partial Amount Table" },
  { value: "partner_spoke_detail", label: "Add Cab Partner Email For Sent Email Rca" },
  { value: "pickup_points", label: "live Airport" },
  { value: "rebrand_partner", label: "Rebrand Partner" },
  { value: "signature_fare", label: "Signature Fare" },
  { value: "signature_add_on_service", label: "Signature Add-on Services" },
  { value: "vip_customers", label: "Vip Customers" },
  { value: "nps_chat_logs", label: "NPS Chat Logs" },
  { value: "nps_message_sends", label: "NPS Message Sends" },
  { value: "app_config", label: "App Config" },
  { value: "multicity_quote_request", label: "Multicity Quote Request" },
  { value: "advance_booking_config", label: "Advance Booking Config" },
  { value: "cab_partner_hourly_threshold", label: "Cab Partner hourly threshold" },
  { value: "chat_history", label: "Chat History" },
  { value: "user_partner_vehicle_config", label: "User Partner Vehicle" },
  { value: "signature_fare_schedule", label: "Signature Fare Schedule" },
  { value: "hourly_discount_config", label: "Hourly Discount Config" },
  { value: "partner_fare_adjustment", label: "Partner Fare Adjustment" },
  { value: "client_config", label: "Client Config" },
  { value: "booking_status_events", label: "Booking Status Events" },
];

function reportLabel(table: string) {
  return REPORT_TABLES.find((item) => item.value === table)?.label || table;
}

type CabManagementProps = {
  variant?: "cab" | "audit";
};

const CabManagement = ({ variant = "cab" }: CabManagementProps) => {
  const isAudit = variant === "audit";
  // Core State
  const OperationstoreData = useSelector((state: any) => state?.operationStore);

  const [pageView, setPageView] = useState<"tables" | "quota" | "runbook">("tables");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Data & Filters State
  const [filterInputs, setFilterInputs] = useState<Record<string, any>>({});
  const [responseData, setResponseData] = useState<any[]>([]);
  const [tableKeys, setTableKeys] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const limit = 20;

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<string | null | number>(null);

  const [SelectedPartner, setSelectedPartner] = useState<string>(
    OperationstoreData?.ReportSelectedPartner,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [searchParams] = useSearchParams();
  const [urlHandled, setUrlHandled] = useState(false);
  const [csvEnabled, setCsvEnabled] = useState<boolean | null>(null);
  const [csvLoading, setCsvLoading] = useState<"filtered" | "all" | null>(null);
  const [downloadableTables, setDownloadableTables] = useState<string[]>([]);
  const [downloadableLoaded, setDownloadableLoaded] = useState(false);

  const loadDownloadableTables = useCallback(async (partner: string) => {
    if (!partner) {
      setDownloadableTables([]);
      setDownloadableLoaded(true);
      return [];
    }
    try {
      const res = await CUSTOM_GENERIC_TABLE(partner, {
        table: "app_config",
        limit: 20,
        page: 1,
        filters: {},
        auditConfig: true,
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      const row = rows.find(isDownloadableConfigRow);
      const tables = parseDownloadableTables(getRowConfigValue(row));
      setDownloadableTables(tables);
      setDownloadableLoaded(true);
      return tables;
    } catch (err) {
      console.error(err);
      setDownloadableTables([]);
      setDownloadableLoaded(true);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!searchParams.get("partner")) {
      setSelectedPartner(OperationstoreData?.ReportSelectedPartner);
    }
  }, [OperationstoreData?.ReportSelectedPartner, searchParams]);

  useEffect(() => {
    if (!isAudit || !SelectedPartner) {
      setDownloadableTables([]);
      setDownloadableLoaded(false);
      return;
    }
    setDownloadableLoaded(false);
    loadDownloadableTables(SelectedPartner);
  }, [isAudit, SelectedPartner, loadDownloadableTables]);

  // Reset pagination when table changes
  useEffect(() => {
    // If handling URL params, do not clear newly set filters
    const uId = searchParams.get("id");
    const uTable = searchParams.get("table");
    if (uId && uTable && selectedTable === uTable && urlHandled) {
      // If we already handled URL, but just changed table manually, we SHOULD reset.
      // Wait, if urlHandled is true, we should reset. If false or currently handling, skip.
      if (!urlHandled) return;
    }

    setCurrentPage(1);
    setFilterInputs({});
    setResponseData([]);
    setTableKeys([]);
    setTotalRecords(0);
    setCsvEnabled(null);
  }, [selectedTable, SelectedPartner]);

  const handleSearch = async (
    page = 1,
    overrideTable?: string,
    overrideFilters?: Record<string, any>,
    overridePartner?: string,
  ) => {
    const tableToUse = overrideTable || selectedTable;
    if (!tableToUse) {
      setError("Please select a report name.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentPage(page);

    try {
      // Construct Payload
      const payload: Record<string, any> = {
        // Mandatory Fields
        table: tableToUse,
        limit: limit,
        page: page,
      };

      // Date Range
      if (fromDate) payload["from"] = fromDate;
      if (toDate) payload["to"] = toDate;

      // filters Object
      let activeFilters: Record<string, any> = {};
      if (overrideFilters) {
        activeFilters = overrideFilters;
      } else {
        Object.keys(filterInputs).forEach((key) => {
          if (filterInputs[key] !== "" && filterInputs[key] !== undefined) {
            activeFilters[key] = filterInputs[key];
          }
        });
      }
      payload["filters"] = activeFilters;

      const partnerToUse = overridePartner || SelectedPartner;
      if (isAudit && (tableToUse === "app_config" || tableToUse === "app_config_stage")) {
        payload.auditConfig = true;
      }

      // Await the API response and handle errors gracefully
      let res = await CUSTOM_GENERIC_TABLE(
        partnerToUse,
        payload as GenericTablePayload,
      );

      let dataArray: any[] = [];
      let count = 0;

      if (res.code === 200 && Array.isArray(res.data)) {
        dataArray = res.data;
        // Try to get count from pagination object first
        if (res.pagination && typeof res.pagination.totalCount === "number") {
          count = res.pagination.totalCount;
        } else {
          count = dataArray.length;
        }
      } else if (res.data && res.data) {
        // Fallback for other potential success responses
        dataArray = Array.isArray(res.data) ? res.data : [res.data];
        count = dataArray.length;
      } else {
        // Fallback if structure is unexpected but successful
        // setError(res.data.message || "Failed to fetch data");
        // Sometimes code might not be 200 or format slightly different
      }

      if (tableToUse === "app_config" || tableToUse === "app_config_stage") {
        const before = dataArray.length;
        dataArray = dataArray.filter(
          (row) => isDownloadableConfigRow(row) === isAudit,
        );
        if (isAudit) {
          count = dataArray.length;
        } else if (before !== dataArray.length) {
          count = Math.max(0, count - (before - dataArray.length));
        }
      }

      setResponseData(dataArray);
      setTotalRecords(count);

      // Extract Keys for Dynamic Filters (from first item)
      // Filtering out technical fields and image URLs mostly
      if (dataArray.length > 0) {
        const firstItem = dataArray[0];
        const excludeKeys = [
          "id",
          "_id",
          "createdAt",
          "updatedAt",
          "desktop_logo_url",
          "mobile_logo_url",
          "image_url",
          "mobile_app_url",
        ];
        const newKeys = Object.keys(firstItem).filter(
          (k) => !excludeKeys.includes(k),
        );

        // Merge new keys with existing keys to ensure we don't lose filter inputs
        setTableKeys((prev) => {
          const combined = new Set([...prev, ...newKeys]);
          return Array.from(combined);
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.response) {
        const apiMessage = err.response.data?.message;
        setError(
          apiMessage ||
            `Error ${err.response.status}: ${JSON.stringify(err.response.data)}`,
        );
      } else {
        setError(err.message || "An error occurred");
      }
      setResponseData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const uId = searchParams.get("id");
    const uTable = searchParams.get("table");
    const uPartner = searchParams.get("partner");

    if (uId && uTable && !urlHandled) {
      const initFilters =
        uTable === "tracking_cab_location" ||
        uTable === "tracking_driver_location"
          ? { order_referance_no: uId }
          : { booking_id: uId };

      setSelectedTable(uTable);
      setFilterInputs(initFilters);
      if (uPartner) {
        setSelectedPartner(uPartner);
      }

      handleSearch(1, uTable, initFilters, uPartner || SelectedPartner);
      setUrlHandled(true);
    }
  }, [searchParams, urlHandled, SelectedPartner]);

  useEffect(() => {
    if (!isAudit) {
      setCsvEnabled(null);
      return;
    }
    if (!selectedTable || selectedTable === "app_config") {
      setCsvEnabled(false);
      return;
    }
    setCsvEnabled(downloadableTables.includes(selectedTable));
  }, [isAudit, selectedTable, downloadableTables]);

  useEffect(() => {
    if (!isAudit || !downloadableLoaded || !selectedTable || selectedTable === "app_config") return;
    if (!downloadableTables.includes(selectedTable)) {
      setSelectedTable("");
    }
  }, [isAudit, downloadableLoaded, selectedTable, downloadableTables]);

  const downloadCsv = async (withFilters: boolean) => {
    if (!selectedTable) {
      setError("Please select a report name.");
      return;
    }

    setCsvLoading(withFilters ? "filtered" : "all");
    setError(null);

    try {
      const activeFilters: Record<string, any> = {};
      if (withFilters) {
        Object.keys(filterInputs).forEach((key) => {
          if (filterInputs[key] !== "" && filterInputs[key] !== undefined) {
            activeFilters[key] = filterInputs[key];
          }
        });
      }

      const payload: GenericTablePayload = {
        table: selectedTable,
        filters: activeFilters,
      };
      if (withFilters && fromDate) payload.from = fromDate;
      if (withFilters && toDate) payload.to = toDate;
      if (
        isAudit &&
        (selectedTable === "app_config" || selectedTable === "app_config_stage")
      ) {
        payload.auditConfig = true;
      }

      const { csv, fileName } = await CUSTOM_GENERIC_TABLE_CSV(
        SelectedPartner,
        payload,
      );
      if (!csv) {
        setError("No CSV data returned.");
        return;
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || err?.message || "CSV download failed");
    } finally {
      setCsvLoading(null);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFilterInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(totalRecords / limit)) {
      handleSearch(newPage);
    }
  };

  // Calculate applied filters for display
  const appliedFilters = Object.entries(filterInputs).filter(
    ([_, val]) => val !== "" && val !== undefined,
  );
  if (fromDate) appliedFilters.push(["From Date", fromDate]);
  if (toDate) appliedFilters.push(["To Date", toDate]);

  const showTableEditAction = selectedTable !== "multicity_quote_request";

  const reportOptions = isAudit
    ? [
        { value: "app_config", label: "App Config (DOWNLOADABLE_TABLE_DATA)" },
        ...downloadableTables
          .filter(
            (table, index, list) =>
              table &&
              table !== "app_config" &&
              list.indexOf(table) === index,
          )
          .map((table) => ({ value: table, label: reportLabel(table) })),
      ]
    : REPORT_TABLES;

  return (
    <div>
      <PageMeta
        title={isAudit ? "Mojo Audit" : "Custom Booking Report"}
        description={
          isAudit
            ? "Update downloadable tables and export CSV"
            : "View and Filter Tabular Data"
        }
      />

      <div className="bg-white p-6 mx-auto max-w-full rounded-xl shadow-lg mt-0">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          {isAudit ? "Mojo Audit" : "Cab Management Report"}
        </h2>
        {isAudit && (
          <p className="mb-4 text-sm text-gray-600">
            This list always includes{" "}
            <span className="font-semibold">App Config (DOWNLOADABLE_TABLE_DATA)</span>
            . After you save table names in that key, only those tables appear
            here for search and CSV download. Cab Management never shows this
            key.
          </p>
        )}

        {!isAudit && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPageView("tables")}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                pageView === "tables"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Tables
            </button>
            <button
              type="button"
              onClick={() => setPageView("quota")}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                pageView === "quota"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Quota
            </button>
            <button
              type="button"
              onClick={() => setPageView("runbook")}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                pageView === "runbook"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Runbook
            </button>
          </div>
        )}

        {!isAudit && pageView === "runbook" ? (
          <HourlyWindowRunbook />
        ) : !isAudit && pageView === "quota" ? (
          <>
            <PartnerTab />
            <HourlyQuotaBoard partner={SelectedPartner} />
          </>
        ) : (
          <>
        <PartnerTab />

        {/* Top Controls: Table & Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
          {/* Table Name Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Name
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              <option value="">-- Select Report --</option>
              {reportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To Date */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Search Button */}
          <div>
            <button
              onClick={() => handleSearch(1)}
              disabled={loading || !selectedTable}
              className={`w-full p-2 rounded-lg text-white font-medium shadow transition-colors h-[42px] ${
                loading || !selectedTable
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Loading..." : "Search"}
            </button>
            
            {/* {selectedTable === "rebrand_partner" && ( */}
            {selectedTable &&
              !(
                isAudit &&
                selectedTable === "app_config" &&
                responseData.some(isDownloadableConfigRow)
              ) && (
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setFormData(
                    isAudit && selectedTable === "app_config"
                      ? {
                          config_key: HIDDEN_APP_CONFIG_KEY,
                          config_value: "[]",
                          value_type: "json",
                          status: "1",
                        }
                      : {},
                  );
                  setIsModalOpen(true);
                }}
                className="w-full p-2  mt-2 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700"
              >
                + Create
              </button>
            )}
          </div>
        </div>

        {isAudit && selectedTable && csvEnabled && (
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <button
              type="button"
              onClick={() => downloadCsv(true)}
              disabled={csvLoading !== null}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium shadow ${
                csvLoading !== null
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {csvLoading === "filtered"
                ? "Downloading..."
                : "Download CSV with filters"}
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(false)}
              disabled={csvLoading !== null}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium shadow ${
                csvLoading !== null
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-teal-700 hover:bg-teal-800"
              }`}
            >
              {csvLoading === "all"
                ? "Downloading..."
                : "Download CSV without filters"}
            </button>
          </div>
        )}

        {/* Applied Filters Display */}
        {appliedFilters.length > 0 && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold text-blue-800 mr-2">
              Applied Filters:
            </span>
            {appliedFilters.map(([key, val]) => (
              <span
                key={key}
                className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700 shadow-sm"
              >
                <span className="font-bold">{key}:</span> {val}
              </span>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Dynamic Filters Input Section */}
        {tableKeys.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm uppercase font-bold text-gray-500 tracking-wider">
                Dynamic Filters
              </h3>
              <button
                onClick={() => handleSearch(1)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded hover:bg-indigo-700 transition shadow-sm"
              >
                Apply Filters
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {tableKeys.map((key) => (
                <div key={key}>
                  <label
                    className="block text-xs font-medium text-gray-600 mb-1 truncate"
                    title={key}
                  >
                    {key}
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    placeholder={`Filter ${key}...`}
                    value={filterInputs[key] || ""}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch(1);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Table */}
        {responseData.length > 0 ? (
          <>
            {/* Pagination Info Top */}
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="text-sm text-gray-600">
                Total Records:{" "}
                <span className="font-bold text-gray-900">{totalRecords}</span>
                <span className="mx-2">|</span>
                Page:{" "}
                <span className="font-bold text-gray-900">
                  {currentPage}
                </span>{" "}
                of {Math.ceil(totalRecords / limit) || 1}
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-t-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* {Object.keys(responseData[0] || {}).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap "
                      >
                        {key}
                      </th>
                    ))}
                    <th>Action</th> */}
                    {showTableEditAction && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}

                    {Object.keys(responseData[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-3 ...">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responseData.map((row, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setActiveRow(idx)}
                      className={`cursor-pointer transition-colors
        ${activeRow === idx ? "bg-blue-100" : "hover:bg-gray-50"}
      `}
                    >
                      {showTableEditAction && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditMode(true);
                              setFormData(
                                isAudit && isDownloadableConfigRow(row)
                                  ? {
                                      ...row,
                                      config_value: JSON.stringify(
                                        parseDownloadableTables(
                                          getRowConfigValue(row),
                                        ),
                                      ),
                                    }
                                  : row,
                              );
                              setIsModalOpen(true);
                            }}
                            className="px-3 py-1 bg-yellow-500 text-white rounded"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                      {Object.keys(row).map((key) => (
                        <td
                          key={`${idx}-${key}`}
                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-700"
                        >
                          {typeof row[key] === "object" ? (
                            <span
                              title={JSON.stringify(row[key])}
                              className="text-xs text-gray-500 cursor-help underline decoration-dotted"
                            >
                              {Array.isArray(row[key]) ? "[Array]" : "{Object}"}
                            </span>
                          ) : (
                            String(row[key]?.toString().substring(0, 100)) +
                            (String(row[key]).length > 100 ? "..." : "")
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bottom */}
            <div className="bg-gray-50 px-4 py-3 border-x border-b border-gray-200 rounded-b-lg flex items-center justify-between sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * limit, totalRecords)}
                    </span>{" "}
                    of <span className="font-medium">{totalRecords}</span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      <span className="sr-only">Previous</span>
                      &lt; Prev
                    </button>

                    {/* Simple Page Indicator */}
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {currentPage}
                    </span>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalRecords / limit)}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage >= Math.ceil(totalRecords / limit) ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      <span className="sr-only">Next</span>
                      Next &gt;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        ) : (
          !loading &&
          !error && (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <p>No data to display. Select a report and click search.</p>
            </div>
          )
        )}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-auto">
              <h2 className="text-xl font-bold mb-4">
                {isEditMode ? "Update Record" : "Create Record"}
              </h2>

              {/* {(isEditMode ? Object.keys(formData) : tableKeys).map((key) => ( */}

              {(isEditMode
                ? Object.keys(formData)
                : isAudit && selectedTable === "app_config"
                  ? ["config_key", "config_value", "value_type", "status"]
                  : tableKeys
              )
                .filter((key) => !["createdAt", "updatedAt"].includes(key))
                .map((key) => {
                  const lockConfigKey =
                    isAudit &&
                    selectedTable === "app_config" &&
                    key === "config_key";
                  const valueText =
                    key === "config_value" &&
                    formData[key] &&
                    typeof formData[key] === "object"
                      ? JSON.stringify(formData[key])
                      : formData[key] ?? "";
                  return (
                  <div key={key} className="mb-3">
                    <label className="text-sm">{key}</label>
                    {key === "config_value" &&
                    isAudit &&
                    selectedTable === "app_config" ? (
                      <textarea
                        rows={5}
                        value={valueText}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded font-mono text-sm"
                      />
                    ) : (
                    <input
                      type="text"
                      readOnly={lockConfigKey}
                      value={valueText}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className={`w-full p-2 border rounded ${lockConfigKey ? "bg-gray-100" : ""}`}
                    />
                    )}
                  </div>
                  );
                })}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    try {
                      // const cleanData = Object.fromEntries(
                      //   Object.entries(formData).filter(([_, v]) => v !== "")
                      // );
                      const excludeFields = [
                        "id",
                        "createdAt",
                        "updatedAt",
                        "partnerName",
                      ];

                      const cleanData = Object.fromEntries(
                        Object.entries(formData)
                          .filter(
                            ([key, value]) =>
                              value !== "" &&
                              value !== undefined &&
                              !excludeFields.includes(key),
                          )
                          // .map(([key, value]) => {
                          //   if (
                          //     typeof value === "string" &&
                          //     value.includes("T") &&
                          //     value.includes("Z")
                          //   ) {
                          //     const date = new Date(value);
                          //     const formatted = date
                          //       .toISOString()
                          //       .slice(0, 19)
                          //       .replace("T", " ");
                          //     return [key, formatted];
                          //   }

                          //   return [key, value];
                          // }),
                          .map(([key, value]) => {
                            if (
                              typeof value === "string" &&
                              value.includes("T") &&
                              value.includes("Z")
                            ) {
                              const date = new Date(value);

                              // Prevent invalid date crash
                              if (!isNaN(date.getTime())) {
                                return [
                                  key,
                                  date
                                    .toISOString()
                                    .slice(0, 19)
                                    .replace("T", " "),
                                ];
                              }

                              // fallback
                              return [key, value];
                            }

                            return [key, value];
                          }),
                      );

                      const payloadData: Record<string, any> = { ...cleanData };
                      const auditAppConfig =
                        isAudit &&
                        (selectedTable === "app_config" ||
                          selectedTable === "app_config_stage");
                      if (auditAppConfig) {
                        payloadData.config_key = HIDDEN_APP_CONFIG_KEY;
                        payloadData.value_type = payloadData.value_type || "json";
                        payloadData.config_value = configValueToJsonArray(
                          payloadData.config_value,
                        );
                        if (
                          payloadData.status === undefined ||
                          payloadData.status === ""
                        ) {
                          payloadData.status = 1;
                        }
                      }

                      if (isEditMode) {
                        await CUSTOM_GENERIC_UPDATE(SelectedPartner, {
                          table: selectedTable,
                          id: formData.id,
                          data: payloadData,
                          ...(auditAppConfig ? { auditConfig: true } : {}),
                        });
                      } else {
                        await CUSTOM_GENERIC_CREATE(SelectedPartner, {
                          table: selectedTable,
                          data: payloadData,
                          ...(auditAppConfig ? { auditConfig: true } : {}),
                        });
                      }

                      setIsModalOpen(false);
                      handleSearch(currentPage);
                      if (auditAppConfig) {
                        setDownloadableTables(
                          parseDownloadableTables(payloadData.config_value),
                        );
                        await loadDownloadableTables(SelectedPartner);
                      }
                    } catch (err: any) {
                      console.error(err);
                      setError(
                        err?.response?.data?.message ||
                          err?.message ||
                          "Save failed",
                      );
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default CabManagement;
