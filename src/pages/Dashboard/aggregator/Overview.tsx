import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../Redux/store";
import { fetchSummary } from "../../../config/aggregator/api";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function Kpi({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-2 text-title-sm font-semibold ${
          warn ? "text-error-500" : "text-gray-800 dark:text-white/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function AggregatorOverview() {
  const token = useSelector((s: RootState) => s.authStore.login_JWT);
  const [brand, setBrand] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await fetchSummary(token, brand || undefined);
        if (!cancelled) {
          setError("");
          setData(summary);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load summary");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, brand]);

  if (error) {
    return (
      <div className="rounded-xl border border-error-500/20 bg-error-50 px-4 py-3 text-error-600 dark:bg-error-500/10">
        {error}
      </div>
    );
  }
  if (!data) {
    return <p className="text-theme-sm text-gray-500">Loading overview…</p>;
  }

  const t = data.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
            Aggregator overview
          </h2>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Net vs marked-up vs brand-reported amounts (cabs-aggregator).
          </p>
        </div>
        <label className="text-theme-sm text-gray-500 dark:text-gray-400">
          Brand
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 block h-10 min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">All</option>
            <option value="indigo">indigo</option>
            <option value="ixigo">ixigo</option>
            <option value="yatra">yatra</option>
            <option value="railyatri">railyatri</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Kpi label="Bookings" value={t.bookings} />
        <Kpi label="Paid" value={t.paid} />
        <Kpi label="Prebook" value={t.prebook} />
        <Kpi label="Cancelled" value={t.cancelled} />
        <Kpi label="Margin" value={inr(t.margin)} />
        <Kpi
          label="Gap alerts"
          value={t.settlement_gap_alerts}
          warn={t.settlement_gap_alerts > 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90">
            Money
          </h3>
          <dl className="space-y-3">
            {[
              ["Net (supply)", inr(t.net_fare)],
              ["Marked-up list", inr(t.marked_up_fare)],
              ["Reported by brand", inr(t.amount_reported)],
              ["Avg margin / booking", inr(t.avg_margin)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800"
              >
                <dt className="text-theme-sm text-gray-500">{label}</dt>
                <dd className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90">
            By brand
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-theme-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800">
                  <th className="pb-3 font-medium">Brand</th>
                  <th className="pb-3 font-medium">Count</th>
                  <th className="pb-3 font-medium">Paid</th>
                  <th className="pb-3 font-medium">Margin</th>
                  <th className="pb-3 font-medium">Reported</th>
                </tr>
              </thead>
              <tbody>
                {(data.byBrand || []).map((b: any) => (
                  <tr
                    key={b.brand}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-3 font-medium text-gray-800 dark:text-white/90">
                      {b.brand}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {b.count}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {b.paid}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {inr(b.margin)}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {inr(b.amount_reported)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
