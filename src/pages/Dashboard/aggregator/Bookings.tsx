import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../Redux/store";
import { fetchBookingLinks } from "../../../config/aggregator/api";

function inr(n: number | null | undefined) {
  if (n == null || n === ("" as unknown as number)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function stateClass(state: string) {
  if (state === "PAID_CONFIRMED") {
    return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500";
  }
  if (state === "CANCELLED") {
    return "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500";
  }
  if (state === "PREBOOK") {
    return "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400";
  }
  return "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400";
}

export default function AggregatorBookings() {
  const token = useSelector((s: RootState) => s.authStore.login_JWT);
  const [brand, setBrand] = useState("");
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ total: number; rows: any[] }>({
    total: 0,
    rows: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const result = await fetchBookingLinks(token, {
          brand: brand || undefined,
          state: state || undefined,
          q: q || undefined,
          limit: 200,
        });
        if (!cancelled) {
          setError("");
          setData(result);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load booking links");
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [token, brand, state, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
            Booking links
          </h2>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Live booking rows from the database. Brand booking ↔ VIA booking, net / markup / amount reported.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-theme-sm text-gray-500">
            Brand
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 block h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">All</option>
              <option value="indigo">indigo</option>
              <option value="ixigo">ixigo</option>
              <option value="yatra">yatra</option>
              <option value="railyatri">railyatri</option>
            </select>
          </label>
          <label className="text-theme-sm text-gray-500">
            State
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 block h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">All</option>
              <option value="SEARCHED">SEARCHED</option>
              <option value="PREBOOK">PREBOOK</option>
              <option value="PAID_CONFIRMED">PAID_CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <label className="min-w-[200px] flex-1 text-theme-sm text-gray-500">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="brand / via id / txn"
              className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-error-50 px-4 py-3 text-error-600 dark:bg-error-500/10">
          {error}
        </div>
      ) : null}

      <p className="text-theme-sm text-gray-500">{data.total} links</p>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="w-full min-w-[1100px] text-left text-theme-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
              {[
                "Brand",
                "State",
                "Brand booking",
                "VIA booking",
                "Net",
                "Marked-up",
                "Reported",
                "Margin",
                "Gap",
                "Updated",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r) => (
              <tr
                key={r.id}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                  {r.brand}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${stateClass(r.state)}`}
                  >
                    {r.state}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {r.brand_booking_id || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {r.via_booking_id || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {inr(r.net_fare)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {inr(r.marked_up_fare)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {inr(r.amount_reported_by_brand)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {inr(r.margin)}
                </td>
                <td
                  className={`px-4 py-3 ${
                    Math.abs(r.settlement_gap || 0) > 1
                      ? "font-medium text-error-500"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {r.settlement_gap == null ? "—" : inr(r.settlement_gap)}
                </td>
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-500">
                  {r.updated_at
                    ? new Date(r.updated_at).toLocaleString("en-IN")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
