import { useEffect, useMemo, useState } from "react";
import { GET_BOOKING_STATISTICS } from "../../config/customerCare/operationsApicall";

interface ClockViewProps {
  title: string;
  range: "AM" | "PM";
  data: number[];
  total: number;
  loading?: boolean;
}

function splitHourlyData(
  rows: any[],
  range: "AM" | "PM",
): { hours: number[]; total: number } {
  const hours = Array(12).fill(0);
  let total = 0;

  rows.forEach((d: any) => {
    const hour = Number(d.hourOfDay);
    if (Number.isNaN(hour)) return;

    if (
      (range === "AM" && hour < 12) ||
      (range === "PM" && hour >= 12)
    ) {
      const index = range === "AM" ? hour : hour - 12;
      const count = Number(d.total_booking_confirmed) || 0;
      hours[index] += count;
      total += count;
    }
  });

  return { hours, total };
}

function BookingClockView({
  title,
  range,
  data,
  total,
  loading = false,
}: ClockViewProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow w-[420px] h-[420px] animate-pulse" />
    );
  }

  const getColor = (val: number) => {
    if (val === 0) return "#E5E7EB";
    if (val >= 10) return "#EF4444";
    if (val >= 3) return "#FACC15";
    return "#10B981";
  };

  const segments = data.map(getColor);

  const gradient = segments
    .map((c, i) => `${c} ${(i * 360) / 12}deg ${((i + 1) * 360) / 12}deg`)
    .join(", ");

  return (
    <div className="bg-white p-6 rounded-xl shadow w-[420px]">
      <div className="text-center mb-1 font-semibold flex justify-center items-center gap-2">
        Today - {range === "AM" ? "☀️" : "🌙"} {title}
      </div>

      <p className="text-xs text-center text-gray-500 mb-10">
        {range === "AM" ? "00:00 - 11:59" : "12:00 - 23:59"}
      </p>

      <div className="relative w-[300px] h-[300px] mx-auto">
        <div
          className="absolute inset-0 z-[0] rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12 + 15;
          return (
            <div
              key={i}
              className="absolute inset-0 z-[0] flex justify-center top-35"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span
                className="text-sm text-gray-700"
                style={{
                  transform: `translateY(-165px) rotate(-${angle}deg)`,
                }}
              >
                {range === "AM" ? i : i + 12}
              </span>
            </div>
          );
        })}

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          return (
            <div
              key={`divider-${i}`}
              className="absolute inset-0 z-[0] flex justify-center"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <div
                className="w-[2px] h-[60px] bg-white"
                style={{ transform: "translateY(10px)" }}
              />
            </div>
          );
        })}

        {data.map((val, i) => {
          if (!val) return null;
          const angle = (i * 360) / 12 + 15;
          return (
            <div
              key={`count-${i}`}
              className="absolute inset-0 flex justify-center"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <div
                className="w-6 h-6 rounded-full bg-white text-xs font-bold flex items-center justify-center"
                style={{ transform: "translateY(40px)" }}
              >
                {val}
              </div>
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-[170px] h-[170px] rounded-full bg-yellow-50 flex flex-col items-center justify-center border-[6px]
              ${range === "AM" ? "border-yellow-400" : "border-indigo-500"}`}
          >
            <div
              className={`text-3xl font-bold ${
                range === "AM" ? "text-yellow-600" : "text-indigo-600"
              }`}
            >
              {total}
            </div>
            <div className="text-sm text-gray-500">Total Pickups</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  title: string;
  range: "AM" | "PM";
  partners: string[];
  cityCode: string | null;
  cabPartner: string | null;
  dateRange: [string, string];
}

/** Single clock — kept for compatibility. Prefer BookingClocksPair to avoid duplicate getStats. */
export default function BookingClock({
  title,
  range,
  partners,
  cityCode,
  cabPartner,
  dateRange,
}: Props) {
  const [data, setData] = useState<number[]>(Array(12).fill(0));
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const partnersKey = partners.join(",");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        const params = {
          date: dateRange[0],
          endDate: dateRange[1],
          type: "hour",
          ...(cityCode && { cityCode }),
          ...(cabPartner && { cabPartner }),
        };

        const responses: any[] = await Promise.all(
          partners.map((p) => GET_BOOKING_STATISTICS(p, params)),
        );

        if (cancelled) return;

        const rows = responses.flatMap((res) =>
          Array.isArray(res) ? res : [],
        );
        const split = splitHourlyData(rows, range);
        setData(split.hours);
        setTotal(split.total);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [range, partnersKey, cityCode, cabPartner, dateRange[0], dateRange[1]]);

  return (
    <BookingClockView
      title={title}
      range={range}
      data={data}
      total={total}
      loading={loading}
    />
  );
}

interface PairProps {
  partners: string[];
  cityCode: string | null;
  cabPartner: string | null;
  dateRange: [string, string];
}

/** Fetches hourly getStats once and renders AM + PM clocks from the same response. */
export function BookingClocksPair({
  partners,
  cityCode,
  cabPartner,
  dateRange,
}: PairProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const partnersKey = partners.join(",");

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!partners.length) {
        setRows([]);
        return;
      }

      try {
        setLoading(true);
        const params = {
          date: dateRange[0],
          endDate: dateRange[1],
          type: "hour",
          ...(cityCode && { cityCode }),
          ...(cabPartner && { cabPartner }),
        };

        const responses: any[] = await Promise.all(
          partners.map((p) =>
            GET_BOOKING_STATISTICS(p, params, controller.signal),
          ),
        );

        if (controller.signal.aborted) return;

        setRows(responses.flatMap((res) => (Array.isArray(res) ? res : [])));
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error("BookingClocksPair error:", err);
        if (!controller.signal.aborted) setRows([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [partnersKey, cityCode, cabPartner, dateRange[0], dateRange[1]]);

  const am = useMemo(() => splitHourlyData(rows, "AM"), [rows]);
  const pm = useMemo(() => splitHourlyData(rows, "PM"), [rows]);

  return (
    <>
      <BookingClockView
        title="Day Time (AM)"
        range="AM"
        data={am.hours}
        total={am.total}
        loading={loading}
      />
      <BookingClockView
        title="Night Time (PM)"
        range="PM"
        data={pm.hours}
        total={pm.total}
        loading={loading}
      />
    </>
  );
}
