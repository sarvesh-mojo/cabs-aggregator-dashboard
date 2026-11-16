import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../Redux/store";
import { fetchMarkupRules } from "../../../config/aggregator/api";

export default function AggregatorMarkup() {
  const token = useSelector((s: RootState) => s.authStore.login_JWT);
  const [rules, setRules] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMarkupRules(token);
        if (!cancelled) {
          setError("");
          setRules(data || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load markup rules");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
          Markup rules
        </h2>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Commercial percent/flat rules applied at fare search (cabs-aggregator).
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-error-50 px-4 py-3 text-error-600 dark:bg-error-500/10">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <table className="w-full min-w-[900px] text-left text-theme-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
              {[
                "Id",
                "Brand",
                "City",
                "Journey",
                "Vehicle",
                "Partner",
                "%",
                "Flat",
                "Enabled",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr
                key={r.id || `${r.brand}-${r.percent}`}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {r.id || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                  {r.brand}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {r.city_code || "any"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {r.journey_type || "any"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {r.vehicle_type || "any"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {r.underlying_partner || "any"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {r.percent ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {r.flat ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${
                      r.enabled === false
                        ? "bg-gray-100 text-gray-500"
                        : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500"
                    }`}
                  >
                    {r.enabled === false ? "off" : "on"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
