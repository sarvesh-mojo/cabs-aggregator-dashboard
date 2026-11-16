import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { GET_BOOKING_STATISTICS } from "../../config/customerCare/operationsApicall";
import { AnalyticsLoader } from "../../config/customerCare/helper";

export default function BookingCalendar({
  partner,
  cityCode,
  cabPartner,
}: {
  partner: string;
  cityCode: string | null;
  cabPartner: string | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [monthlyTotal, setmonthlyTotal] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setmonthlyTotal(0);
      setData({});
      try {
        setLoading(true);
        const start = currentMonth.startOf("month").format("YYYY-MM-DD");
        const end = currentMonth.endOf("month").format("YYYY-MM-DD");

        const queryParams = {
          date: start,
          endDate: end,
          ...(cityCode && { cityCode }),
          ...(cabPartner && { cabPartner }),
        };

        const partnersToFetch =
          partner.toLowerCase() === "all" ? ["indigo", "ixigo"] : [partner];

        const responses = await Promise.all(
          partnersToFetch.map((p: string) =>
            GET_BOOKING_STATISTICS(p, queryParams, controller.signal),
          ),
        );

        if (controller.signal.aborted) return;

        const mapped: Record<string, number> = {};
        let total = 0;

        responses.forEach((respon: any) => {
          if (!Array.isArray(respon)) return;
          respon.forEach((d: any) => {
            const prev = mapped[d.createdDate] ?? 0;
            const count = Number(d.total_booking_confirmed || 0);
            mapped[d.createdDate] = prev + count;
            total += count;
          });
        });

        setmonthlyTotal(total);
        setData(mapped);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error("BookingCalendar error:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [currentMonth, partner, cityCode, cabPartner]);

  if (loading) {
    return <AnalyticsLoader height="h-[360px]" />;
  }

  const daysInMonth = currentMonth.daysInMonth();
  const startDay = currentMonth.startOf("month").day();

  return (
    <div className="bg-white p-4 rounded-xl shadow w-[300px]">
      <div className="flex justify-between items-center mb-10">
        <button
          onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
        >
          ‹
        </button>
        <h2 className="font-semibold">{currentMonth.format("MMMM YYYY")}</h2>
        <button onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}>
          ›
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-5 text-center">
        Monthly Total Bookings : {monthlyTotal}
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="font-medium text-gray-500">
            {d}
          </div>
        ))}

        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = currentMonth.date(day).format("YYYY-MM-DD");
          const count = data[dateKey] || 0;

          return (
            <div
              key={day}
              className="h-10 flex flex-col items-center justify-center rounded hover:bg-gray-100"
            >
              <span>{day}</span>
              {count > 0 && (
                <span className="text-[10px] text-blue-600 font-semibold">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
