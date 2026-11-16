import React, { useEffect, useMemo, useState } from "react";
import { GET_CLOUDWATCH_LOGS } from "../../config/customerCare/operationsApicall";
import { isRequestCanceled } from "../../config/apiMethods";

/** Log payloads are backend-defined and change shape, so every field stays unknown. */
type CloudwatchLogEntry = Record<string, unknown>;

type CloudwatchLogsResponse = {
  booking?: Record<string, unknown>;
  timeWindow?: Record<string, unknown>;
  filterPattern?: unknown;
  count?: unknown;
  truncated?: unknown;
  nextToken?: unknown;
  logs?: CloudwatchLogEntry[];
};

type Props = {
  bookingId?: string;
  partner: string;
  /** Search CloudWatch by booking id and an explicit IST window when the booking row is missing. */
  directSearch?: boolean;
};

const LEVEL_STYLES: Record<string, string> = {
  error: "bg-red-100 text-red-700 border-red-300",
  warn: "bg-yellow-100 text-yellow-800 border-yellow-300",
  info: "bg-green-100 text-green-700 border-green-300",
  debug: "bg-gray-100 text-gray-600 border-gray-300",
};

/** Renders any backend value as text — objects/arrays are stringified, not thrown at React. */
const toText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toPrettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const getLevelStyle = (level: unknown): string =>
  LEVEL_STYLES[toText(level).toLowerCase()] ||
  "bg-blue-100 text-blue-700 border-blue-300";

/** "2026-09-05 18:49:38" → datetime-local value */
const istToDatetimeLocal = (ist: string): string => {
  if (!ist) return "";
  return ist.replace(" ", "T").slice(0, 16);
};

/** datetime-local value → API IST string */
const datetimeLocalToIstApi = (local: string): string => {
  if (!local) return "";
  const normalized = local.length === 16 ? `${local}:00` : local;
  return normalized.replace("T", " ");
};

const CloudwatchLogs: React.FC<Props> = ({
  bookingId,
  partner,
  directSearch = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<CloudwatchLogsResponse | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "json">("timeline");
  const [levelFilter, setLevelFilter] = useState("all");
  const [operationFilter, setOperationFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [customStartLocal, setCustomStartLocal] = useState("");
  const [customEndLocal, setCustomEndLocal] = useState("");

  const hasCustomWindow = Boolean(customStartLocal || customEndLocal);

  const fetchLogs = async (
    signal?: AbortSignal,
    overrides?: { startLocal?: string; endLocal?: string }
  ) => {
    if (!bookingId) return;
    setLoading(true);
    setError("");
    try {
      const startLocal = overrides?.startLocal ?? customStartLocal;
      const endLocal = overrides?.endLocal ?? customEndLocal;
      const startTimeIst = startLocal
        ? datetimeLocalToIstApi(startLocal)
        : undefined;
      const endTimeIst = endLocal ? datetimeLocalToIstApi(endLocal) : undefined;

      if (directSearch && (!startTimeIst || !endTimeIst)) {
        setError("Enter both a start and an end time (IST) to search CloudWatch.");
        setLoading(false);
        return;
      }

      const response = await GET_CLOUDWATCH_LOGS(
        partner,
        { bookingId, startTimeIst, endTimeIst },
        signal
      );
      setData(response || null);
    } catch (e) {
      if (isRequestCanceled(e)) return;
      setData(null);
      const apiMessage = (
        e as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(apiMessage || "Failed to fetch CloudWatch logs for this booking.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setExpandedRows({});
    setData(null);
    setError("");
    setCustomStartLocal("");
    setCustomEndLocal("");
    if (!directSearch) {
      fetchLogs(controller.signal, { startLocal: "", endLocal: "" });
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, partner, directSearch]);

  const logs = useMemo(
    () => (Array.isArray(data?.logs) ? (data?.logs as CloudwatchLogEntry[]) : []),
    [data],
  );

  const operations = useMemo(() => {
    const unique = new Set<string>();
    logs.forEach((item) => {
      const operation = toText(item.operation);
      if (operation) unique.add(operation);
    });
    return Array.from(unique).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return logs.filter((item) => {
      if (levelFilter !== "all" && toText(item.level).toLowerCase() !== levelFilter) {
        return false;
      }
      if (operationFilter !== "all" && toText(item.operation) !== operationFilter) {
        return false;
      }
      if (!needle) return true;
      return toText(item).toLowerCase().includes(needle);
    });
  }, [logs, levelFilter, operationFilter, searchText]);

  const jsonText = useMemo(
    () => toPrettyJson(viewMode === "json" ? filteredLogs : []),
    [viewMode, filteredLogs],
  );

  const toggleRow = (index: number) =>
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));

  const handleCopyJson = () => {
    navigator.clipboard.writeText(toPrettyJson(filteredLogs));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetWindow = () => {
    setCustomStartLocal("");
    setCustomEndLocal("");
    fetchLogs(undefined, { startLocal: "", endLocal: "" });
  };

  const handleUseDefaultAsBase = () => {
    const defaultStart = toText(data?.timeWindow?.defaultStartTimeIst);
    const defaultEnd = toText(data?.timeWindow?.defaultEndTimeIst);
    setCustomStartLocal(istToDatetimeLocal(defaultStart));
    setCustomEndLocal(istToDatetimeLocal(defaultEnd));
  };

  if (!bookingId) {
    return (
      <p className="text-gray-500 italic">
        Search a booking to view its CloudWatch logs.
      </p>
    );
  }

  const bookingMissing = data?.booking?.found === false;

  const summaryFields: { label: string; value: unknown }[] = [
    { label: "Booking ID", value: data?.booking?.bookingId },
    { label: "Parent ID", value: data?.booking?.parentBookingId },
    { label: "Mobile", value: data?.booking?.mobile },
    { label: "Status", value: data?.booking?.status },
    { label: "Cab Partner", value: data?.booking?.cabPartner },
    { label: "Created At (IST)", value: data?.booking?.createdAtIst },
    { label: "Updated At (IST)", value: data?.booking?.updatedAtIst },
    { label: "Trip Start (IST)", value: data?.booking?.startTimeIst },
  ];

  const isCustomWindowActive = Boolean(data?.timeWindow?.customWindow);

  return (
    <div className="mt-4">
      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <h3 className="font-semibold text-md">☁️ CloudWatch Logs</h3>
          <div className="flex flex-wrap gap-2">
            {(["timeline", "json"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === mode
                    ? "bg-gray-800 text-white shadow-md"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {mode === "timeline" ? "Timeline" : "Raw JSON"}
              </button>
            ))}
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-700 text-white shadow hover:bg-gray-800 disabled:opacity-50"
              onClick={handleCopyJson}
              disabled={!logs.length}
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-50"
              onClick={() => fetchLogs()}
              disabled={loading || (directSearch && (!customStartLocal || !customEndLocal))}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {(directSearch || bookingMissing) && (
          <div className="mb-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
            <p>
              Booking <b>{bookingId}</b> is not in the database. CloudWatch is
              searched by that id inside the time range you set (IST, max 24 hours).
            </p>
            {bookingMissing && (
              <p className="mt-1 text-gray-700">
                <b>Time Window (IST):</b>{" "}
                {toText(data?.timeWindow?.startTimeIst) || "N/A"} →{" "}
                {toText(data?.timeWindow?.endTimeIst) || "N/A"}
                <span className="ml-2">
                  <b>Total Logs:</b> {toText(data?.count) || logs.length}
                </span>
              </p>
            )}
          </div>
        )}

        {data?.booking && !bookingMissing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-gray-700">
            {summaryFields.map((field) => (
              <p key={field.label}>
                <b>{field.label}:</b> {toText(field.value) || "N/A"}
              </p>
            ))}
            <p className="sm:col-span-2">
              <b>Time Window (IST):</b>{" "}
              {toText(data?.timeWindow?.startTimeIst) || "N/A"} →{" "}
              {toText(data?.timeWindow?.endTimeIst) || "N/A"}
              {isCustomWindowActive && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-300">
                  CUSTOM
                </span>
              )}
            </p>
            {!isCustomWindowActive && !!data?.timeWindow?.defaultStartTimeIst && (
              <p className="sm:col-span-3 text-[11px] text-gray-500">
                Auto window: {toText(data?.timeWindow?.defaultStartTimeIst)} →{" "}
                {toText(data?.timeWindow?.defaultEndTimeIst)}
              </p>
            )}
            <p>
              <b>Total Logs:</b> {toText(data?.count) || logs.length}
              {!!data?.truncated && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
                  TRUNCATED
                </span>
              )}
            </p>
          </div>
        )}

        <div className="mt-3 p-2.5 rounded-lg border border-dashed border-gray-300 bg-white">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {directSearch ? "Time range (required, IST)" : "Custom time range (optional, IST)"}
          </p>
          <p className="text-[11px] text-gray-500 mb-2">
            {directSearch
              ? "Both times are required because there is no booking row to build a window from."
              : "Leave blank to use the auto window from booking created time. Set a wider range if logs are missing."}
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex flex-col gap-1 text-[11px] text-gray-600">
              Start
              <input
                type="datetime-local"
                step="1"
                className="p-2 border border-gray-300 rounded-md text-gray-700 text-sm"
                value={customStartLocal}
                onChange={(e) => setCustomStartLocal(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-gray-600">
              End
              <input
                type="datetime-local"
                step="1"
                className="p-2 border border-gray-300 rounded-md text-gray-700 text-sm"
                value={customEndLocal}
                onChange={(e) => setCustomEndLocal(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              onClick={() => fetchLogs()}
              disabled={loading || (directSearch && (!customStartLocal || !customEndLocal))}
            >
              {directSearch ? "Search logs" : "Apply range"}
            </button>
            {!directSearch && (
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50"
                onClick={handleUseDefaultAsBase}
                disabled={!data?.timeWindow?.defaultStartTimeIst}
              >
                Fill auto window
              </button>
            )}
            {!directSearch && (
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50"
                onClick={handleResetWindow}
                disabled={loading || !hasCustomWindow}
              >
                Reset to auto
              </button>
            )}
          </div>
        </div>

        {!!data?.filterPattern && (
          <p className="mt-2 text-[11px] text-gray-500 break-all">
            <b>Filter Pattern:</b> {toText(data.filterPattern)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <select
          className="p-2 border border-gray-300 rounded-md text-gray-700"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>

        <select
          className="p-2 border border-gray-300 rounded-md text-gray-700 max-w-[220px]"
          value={operationFilter}
          onChange={(e) => setOperationFilter(e.target.value)}
        >
          <option value="all">All Operations</option>
          {operations.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="p-2 border border-gray-300 rounded-md flex-1 min-w-[200px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search anything in the log entry..."
        />

        <span className="text-gray-500">
          Showing {filteredLogs.length} of {logs.length}
        </span>
      </div>

      {loading && (
        <p className="mt-3 text-gray-500">Loading CloudWatch logs...</p>
      )}

      {!loading && error && <p className="mt-3 text-red-500">{error}</p>}

      {!loading && !error && filteredLogs.length === 0 && (
        <p className="mt-3 text-gray-500 italic text-center py-4 bg-white rounded border border-dashed border-gray-300">
          No CloudWatch logs found for this booking.
        </p>
      )}

      {!loading && !error && filteredLogs.length > 0 && viewMode === "json" && (
        <pre className="mt-3 p-3 bg-gray-900 text-green-200 rounded-lg text-[11px] max-h-[70vh] overflow-auto whitespace-pre-wrap break-all">
          {jsonText}
        </pre>
      )}

      {!loading &&
        !error &&
        filteredLogs.length > 0 &&
        viewMode === "timeline" && (
          <div className="mt-3 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filteredLogs.map((item, index) => {
              const isExpanded = !!expandedRows[index];
              const operation = toText(item.operation);
              const fileName = toText(item.fileName);
              const correlationId = toText(item.correlationId);
              const message = toText(item.message);
              return (
                <div
                  key={`${toText(item.timestamp)}-${index}`}
                  className="bg-white rounded-lg border border-gray-200 shadow-xs"
                >
                  <button
                    className="w-full text-left p-2.5"
                    onClick={() => toggleRow(index)}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${getLevelStyle(item.level)}`}
                      >
                        {toText(item.level) || "log"}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        {toText(item.timestampIst) || "N/A"}
                      </span>
                      {operation && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                          {operation}
                        </span>
                      )}
                      {fileName && (
                        <span className="text-gray-400 text-[10px]">
                          {fileName}
                        </span>
                      )}
                      {correlationId && (
                        <span className="text-gray-400 text-[10px]">
                          corr: {correlationId}
                        </span>
                      )}
                      <span className="ml-auto text-gray-400 text-[10px]">
                        {isExpanded ? "▲ Hide JSON" : "▼ Show JSON"}
                      </span>
                    </div>
                    <p className="text-gray-700 break-words">{message || "-"}</p>
                  </button>

                  {isExpanded && (
                    <pre className="mx-2.5 mb-2.5 p-2 bg-gray-900 text-green-200 rounded text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                      {toPrettyJson(item.log ?? item)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

export default CloudwatchLogs;
