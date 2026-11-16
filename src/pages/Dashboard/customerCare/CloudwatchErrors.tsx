import { useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import PageMeta from "../../../components/common/PageMeta";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { GET_CLOUDWATCH_ERRORS } from "../../../config/customerCare/operationsApicall";
import { isRequestCanceled } from "../../../config/apiMethods";
import { isCloudWatchLogsPartner } from "../../../utils/partnerAccess";

type CloudwatchLogEntry = Record<string, unknown>;

type TopErrorRow = {
  key: string;
  operation?: string;
  message?: string;
  sampleMessage?: string;
  count?: number;
  firstSeenIst?: string;
  lastSeenIst?: string;
  samples?: CloudwatchLogEntry[];
};

type CloudwatchErrorsResponse = {
  timeWindow?: { startTimeIst?: string; endTimeIst?: string };
  search?: string | null;
  level?: string;
  filterPattern?: string | null;
  scannedEvents?: number;
  matchedEvents?: number;
  truncated?: boolean;
  topErrors?: TopErrorRow[];
  logs?: CloudwatchLogEntry[];
};

const toText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
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

/** IST wall clock → datetime-local value */
const nowLocalValue = (offsetHours = 0): string => {
  const d = new Date(Date.now() + offsetHours * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Display as local browser time; BA typically works in IST machines.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const datetimeLocalToIstApi = (local: string): string => {
  if (!local) return "";
  const normalized = local.length === 16 ? `${local}:00` : local;
  return normalized.replace("T", " ");
};

const LEVEL_STYLES: Record<string, string> = {
  error: "bg-red-100 text-red-700 border-red-300",
  warn: "bg-yellow-100 text-yellow-800 border-yellow-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  info: "bg-green-100 text-green-700 border-green-300",
};

const CloudwatchErrors = () => {
  const operationStore = useSelector((state: any) => state?.operationStore);
  const loginPartners = useSelector(
    (state: any) => state.authStore?.login_partners ?? [],
  );
  const selectedPartner =
    operationStore?.ReportSelectedPartner || loginPartners[0] || "indigo";

  const [startLocal, setStartLocal] = useState(() => nowLocalValue(-6));
  const [endLocal, setEndLocal] = useState(() => nowLocalValue(0));
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<"error" | "warn" | "all">("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CloudwatchErrorsResponse | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  const supported = isCloudWatchLogsPartner(selectedPartner);

  const topErrors = useMemo(
    () => (Array.isArray(data?.topErrors) ? data!.topErrors! : []),
    [data],
  );

  const selectedGroup = useMemo(
    () => topErrors.find((row) => row.key === selectedKey) || null,
    [topErrors, selectedKey],
  );

  const detailLogs = useMemo(() => {
    const samples = selectedGroup?.samples?.length
      ? selectedGroup.samples
      : Array.isArray(data?.logs)
        ? data!.logs!
        : [];
    const needle = logSearch.trim().toLowerCase();
    if (!needle) return samples;
    return samples.filter((item) => toText(item).toLowerCase().includes(needle));
  }, [selectedGroup, data, logSearch]);

  const analyze = async () => {
    if (!supported) {
      setError("CloudWatch Errors is not available for this partner.");
      setData(null);
      return;
    }
    const startTimeIst = datetimeLocalToIstApi(startLocal);
    const endTimeIst = datetimeLocalToIstApi(endLocal);
    if (!startTimeIst || !endTimeIst) {
      setError("Start and end time (IST) are required.");
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedKey(null);
    setExpandedRows({});

    try {
      const result = await GET_CLOUDWATCH_ERRORS(
        selectedPartner,
        {
          search,
          startTimeIst,
          endTimeIst,
          level,
          topN: 10,
          limit: 500,
        },
        abortRef.current.signal,
      );
      setData(result || null);
      const first = result?.topErrors?.[0]?.key;
      if (first) setSelectedKey(first);
    } catch (e) {
      if (isRequestCanceled(e)) return;
      const apiMessage = (
        e as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(apiMessage || "Failed to fetch CloudWatch errors.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="CloudWatch Errors | Mojo Management"
        description="Top CloudWatch application errors for BA analysis"
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              CloudWatch Errors
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Top 10 error signatures in a time window. Search by API path,
              operation, or error text (max 7 days).
            </p>
          </div>
          <PartnerTab propsData={{ isall: false }} />
        </div>

        {!supported && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            CloudWatch is only available for Indigo / Yatra / BAC / RailYatri /
            Stage partners.
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Start (IST)
              <input
                type="datetime-local"
                step="1"
                className="p-2 border border-gray-300 rounded-md text-sm text-gray-800"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              End (IST)
              <input
                type="datetime-local"
                step="1"
                className="p-2 border border-gray-300 rounded-md text-sm text-gray-800"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Level
              <select
                className="p-2 border border-gray-300 rounded-md text-sm text-gray-800"
                value={level}
                onChange={(e) =>
                  setLevel(e.target.value as "error" | "warn" | "all")
                }
              >
                <option value="error">Error</option>
                <option value="warn">Warn + Error</option>
                <option value="all">All levels</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600 flex-1 min-w-[220px]">
              Search
              <input
                type="text"
                className="p-2 border border-gray-300 rounded-md text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. bookingHistory, getTopBookings, createSession, CROSSSLOT"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") analyze();
                }}
              />
            </label>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              onClick={analyze}
              disabled={loading || !supported}
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            Tip: leave search empty for overall top errors. Use a path or
            operation name to focus (e.g. <code>bookingDetails</code>).
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Window: {toText(data.timeWindow?.startTimeIst)} →{" "}
              {toText(data.timeWindow?.endTimeIst)}
            </span>
            <span>Scanned: {toText(data.scannedEvents)}</span>
            <span>Matched: {toText(data.matchedEvents)}</span>
            {data.truncated && (
              <span className="text-orange-600 font-semibold">
                Truncated — narrow the window or add a search term
              </span>
            )}
            {!!data.filterPattern && (
              <span className="break-all">
                Filter: {toText(data.filterPattern)}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 font-medium text-sm text-gray-800">
              Top 10 errors
            </div>
            {!loading && topErrors.length === 0 && (
              <p className="p-4 text-sm text-gray-500 italic">
                {data
                  ? "No matching errors in this window."
                  : "Run Analyze to load top errors."}
              </p>
            )}
            {topErrors.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Count</th>
                      <th className="px-3 py-2 font-medium">Operation</th>
                      <th className="px-3 py-2 font-medium">Message</th>
                      <th className="px-3 py-2 font-medium">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topErrors.map((row, index) => {
                      const active = row.key === selectedKey;
                      return (
                        <tr
                          key={row.key || index}
                          className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${
                            active ? "bg-blue-50" : ""
                          }`}
                          onClick={() => {
                            setSelectedKey(row.key);
                            setLogSearch("");
                            setExpandedRows({});
                          }}
                        >
                          <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                          <td className="px-3 py-2 font-semibold text-red-700">
                            {row.count ?? 0}
                          </td>
                          <td className="px-3 py-2 text-blue-700 max-w-[140px] truncate">
                            {row.operation || "unknown"}
                          </td>
                          <td
                            className="px-3 py-2 text-gray-800 max-w-[280px] truncate"
                            title={row.sampleMessage || row.message}
                          >
                            {row.sampleMessage || row.message || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {row.lastSeenIst || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2 justify-between">
              <div className="font-medium text-sm text-gray-800">
                Sample logs
                {selectedGroup?.operation
                  ? ` — ${selectedGroup.operation}`
                  : ""}
              </div>
              <input
                type="text"
                className="p-1.5 border border-gray-300 rounded-md text-xs min-w-[180px] flex-1 max-w-xs outline-none focus:border-blue-500"
                placeholder="Filter samples…"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>

            {!selectedGroup && (
              <p className="p-4 text-sm text-gray-500 italic">
                Select a top error to inspect samples.
              </p>
            )}

            {selectedGroup && (
              <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2">
                  <p>
                    <b>Count:</b> {selectedGroup.count ?? 0}
                  </p>
                  <p>
                    <b>First:</b> {selectedGroup.firstSeenIst || "-"} ·{" "}
                    <b>Last:</b> {selectedGroup.lastSeenIst || "-"}
                  </p>
                  <p className="break-words mt-1">
                    <b>Fingerprint:</b> {selectedGroup.message}
                  </p>
                </div>

                {detailLogs.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No sample logs for this group.
                  </p>
                )}

                {detailLogs.map((item, index) => {
                  const isExpanded = !!expandedRows[index];
                  const levelValue = toText(item.level).toLowerCase();
                  return (
                    <div
                      key={`${toText(item.timestamp)}-${index}`}
                      className="border border-gray-200 rounded-lg bg-white"
                    >
                      <button
                        type="button"
                        className="w-full text-left p-2.5"
                        onClick={() =>
                          setExpandedRows((prev) => ({
                            ...prev,
                            [index]: !prev[index],
                          }))
                        }
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${
                              LEVEL_STYLES[levelValue] ||
                              "bg-blue-100 text-blue-700 border-blue-300"
                            }`}
                          >
                            {toText(item.level) || "log"}
                          </span>
                          <span className="text-gray-500 text-[11px]">
                            {toText(item.timestampIst) || "N/A"}
                          </span>
                          {!!item.correlationId && (
                            <span className="text-gray-400 text-[10px]">
                              corr: {toText(item.correlationId)}
                            </span>
                          )}
                          <span className="ml-auto text-gray-400 text-[10px]">
                            {isExpanded ? "▲ Hide" : "▼ JSON"}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm break-words">
                          {toText(item.message) || "-"}
                        </p>
                        {!!item.error && (
                          <p className="mt-1 text-xs text-red-600 break-words">
                            {toText(item.error)}
                          </p>
                        )}
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
        </div>
      </div>
    </>
  );
};

export default CloudwatchErrors;
