export type DevicePersonaMetricKey =
  | "website"
  | "desktop"
  | "msite"
  | "app"
  | "sixESkai"
  | "b2cLoyaltyUser"
  | "anonymousUsers";

export type DevicePersonaMetric = {
  key: DevicePersonaMetricKey;
  title: string;
  subtitle: string;
};

const STAT_STYLES = [
  { bg: "bg-blue-50" },
  { bg: "bg-emerald-50" },
  { bg: "bg-amber-50" },
  { bg: "bg-rose-50" },
  { bg: "bg-sky-50" },
  { bg: "bg-violet-50" },
  { bg: "bg-orange-50" },
];

/** Wireframe labels — API values map to these keys later. */
export const DEVICE_PERSONA_METRICS: DevicePersonaMetric[] = [
  {
    key: "website",
    title: "Website - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
  {
    key: "desktop",
    title: "Desktop - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
  {
    key: "msite",
    title: "msite - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
  {
    key: "app",
    title: "App - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
  {
    key: "sixESkai",
    title: "6ESkai - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
  {
    key: "b2cLoyaltyUser",
    title: "B2C loyalty user - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
  {
    key: "anonymousUsers",
    title: "Anonymous users - Net bookings",
    subtitle: "(Confirmed - Cancelled)",
  },
];

export type DevicePersonaPerformanceData = Partial<
  Record<DevicePersonaMetricKey, number | string | null>
>;

type DevicePersonaPerformanceProps = {
  data?: DevicePersonaPerformanceData;
  loading?: boolean;
  visibleMetrics?: DevicePersonaMetricKey[] | null;
};

const formatMetricValue = (
  value: number | string | null | undefined,
  loading?: boolean,
): string | number => {
  if (loading) return "...";
  if (value === null || value === undefined || value === "") return "—";
  return value;
};

export const DevicePersonaPerformance = ({
  data,
  loading = false,
  visibleMetrics = null,
}: DevicePersonaPerformanceProps) => {
  const metrics = visibleMetrics?.length
    ? DEVICE_PERSONA_METRICS.filter((metric) =>
        visibleMetrics.includes(metric.key),
      )
    : DEVICE_PERSONA_METRICS;

  if (!metrics.length) return null;

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-3 mt-3 flex items-center gap-2">
        Device and persona performance:
      </h3>
      <div className="flex flex-wrap gap-2 sm:gap-4">
        {metrics.map((metric, index) => {
          const style = STAT_STYLES[index % STAT_STYLES.length];
          return (
            <div
              key={metric.key}
              className={`flex-1 min-w-[150px] max-w-[220px] rounded-2xl ${style.bg} p-3 shadow-sm border border-white/80 hover:shadow-md transition-shadow`}
            >
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide break-words">
                {metric.title}
              </p>
              <p className="text-[10px] text-gray-500">{metric.subtitle}</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                {formatMetricValue(data?.[metric.key], loading)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
