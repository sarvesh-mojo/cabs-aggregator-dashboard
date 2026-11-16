import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GET_HOURLY_THRESHOLD_STATUS,
  HourlyThresholdStatusRow,
} from "../../../config/customerCare/operationsApicall";

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function padHour(hour: number) {
  return String(hour).padStart(2, "0");
}

function windowLabel(fromHour: number, toHour: number) {
  return `${padHour(fromHour)}:00–${padHour(toHour)}:59`;
}

function quotaState(row: HourlyThresholdStatusRow) {
  if (!row.isEnabled) {
    return { label: "Off", className: "bg-gray-100 text-gray-600" };
  }
  if (Number(row.thresholds?.window) <= 0) {
    return { label: "Hidden", className: "bg-gray-100 text-gray-700" };
  }
  if (!row.bookingAllowed) {
    return { label: "Full", className: "bg-red-50 text-red-700" };
  }
  return { label: "Open", className: "bg-green-50 text-green-700" };
}

function countLabel(used: number, cap: number) {
  if (cap <= 0) return "—";
  return `${used} / ${cap}`;
}

function leftLabel(left: number | null, cap: number) {
  if (cap <= 0 || left == null) return "—";
  return String(left);
}

const HourlyQuotaBoard = ({ partner }: { partner: string }) => {
  const [date, setDate] = useState(todayInIndia);
  const [city, setCity] = useState("");
  const [rows, setRows] = useState<HourlyThresholdStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!partner || !date) return;
    setLoading(true);
    setError("");
    try {
      const result = await GET_HOURLY_THRESHOLD_STATUS(partner, {
        date,
        refreshCache: true,
      });
      setRows(result.rows);
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || "Could not load quota");
    } finally {
      setLoading(false);
    }
  }, [partner, date]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const cityFilter = city.trim().toUpperCase();
    return [...rows]
      .filter((row) => !cityFilter || String(row.city || "").toUpperCase().includes(cityFilter))
      .sort((a, b) =>
        [a.city, a.partnerName, a.vehicleType, a.fromHour, a.travelType]
          .join("|")
          .localeCompare(
            [b.city, b.partnerName, b.vehicleType, b.fromHour, b.travelType].join("|"),
          ),
      );
  }, [rows, city]);

  const openCount = visibleRows.filter((row) => quotaState(row).label === "Open").length;
  const fullCount = visibleRows.filter((row) => quotaState(row).label === "Full").length;
  const hiddenCount = visibleRows.filter((row) => quotaState(row).label === "Hidden").length;

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4 max-w-3xl">
        Each row is one configured window. Cap is the booking total for that
        window. Booked is how many confirmed rides already sit inside it. Left
        is the quota still available. A cap of 0 hides that partner for the
        window.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pickup date
          </label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            type="text"
            placeholder="DEL"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
            value={city}
            onChange={(event) => setCity(event.target.value.toUpperCase())}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={load}
            disabled={loading || !partner}
            className={`w-full p-2 rounded-lg text-white font-medium shadow h-[42px] ${
              loading || !partner
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {!error && visibleRows.length > 0 && (
        <p className="text-sm text-gray-600 mb-3">
          {openCount} open, {fullCount} full, {hiddenCount} hidden
        </p>
      )}

      {loading && visibleRows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          Loading quota…
        </div>
      ) : visibleRows.length === 0 && !error ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          {city.trim() && rows.length > 0
            ? "No booking caps for that city on this date."
            : "No booking caps for this date."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "City",
                  "Travel",
                  "Partner",
                  "Vehicle",
                  "Window",
                  "Cap vs booked",
                  "Left",
                  "Daily cap vs booked",
                  "Daily left",
                  "Status",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const state = quotaState(row);
                const windowCap = Number(row.thresholds?.window || 0);
                const dailyCap = Number(row.thresholds?.daily || 0);
                const used = Number(row.counters?.window || 0);
                const fill =
                  windowCap > 0 ? Math.min(100, Math.round((used / windowCap) * 100)) : 0;
                return (
                  <tr
                    key={`${row.configId}-${row.date}-${row.city}-${row.partnerName}-${row.vehicleType}-${row.fromHour}-${row.toHour}`}
                    className="border-t border-gray-100"
                  >
                    <td className="px-4 py-3 text-sm text-gray-800">{row.city}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.travelType}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.partnerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.vehicleType}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {windowLabel(Number(row.fromHour), Number(row.toHour))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                      <div>{countLabel(used, windowCap)}</div>
                      {windowCap > 0 && (
                        <div className="mt-1 h-1.5 w-24 bg-gray-100 rounded">
                          <div
                            className={`h-1.5 rounded ${fill >= 100 ? "bg-red-500" : "bg-blue-600"}`}
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {leftLabel(row.remaining?.window, windowCap)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {countLabel(Number(row.counters?.daily || 0), dailyCap)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {leftLabel(row.remaining?.daily, dailyCap)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${state.className}`}>
                        {state.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HourlyQuotaBoard;
