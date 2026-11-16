import React, { useEffect, useState } from "react";
import { Spin } from "antd";
import { useSelector } from "react-redux";
import { GET_BOOKING_STATISTICS } from "../../config/customerCare/operationsApicall";
// import { useDateRange } from "../../hooks/useDateRange";

interface BookingStatsType {
  [key: string]: any;
}

const BookingStatistics: React.FC = () => {
  const [stats, setStats] = useState<BookingStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false); // collapse toggle

  const selectedPartner = useSelector((state: any) => state.operationStore.selectedPartner);
  const selectedDateRange = useSelector((state: any) => state.operationStore.SelectedDateRange);
  const partnerList = useSelector((state: any) => state.authStore.login_partners || []);
  const normalize = (res: any): BookingStatsType => {
    if (!res) return {};
    if (Array.isArray(res)) return res[0] || {};
    return res;
  };

  const mergeStats = (arr: BookingStatsType[]): BookingStatsType =>
    arr.reduce((acc, curr) => {
      Object.keys(curr).forEach((key) => {
        const a = acc[key];
        const b = curr[key];
        if (!isNaN(Number(a)) && !isNaN(Number(b))) acc[key] = Number(a) + Number(b);
        else acc[key] = a || b;
      });
      return acc;
    }, {});

  const fetchStats = async () => {
    try {
      setLoading(true);
      const DateRange = selectedDateRange;

      if (selectedPartner === "all") {
        const responses: BookingStatsType[] = [];

        for (const p of partnerList) {
          try {
            const res: any = await GET_BOOKING_STATISTICS(p, { date: DateRange[0] , endDate:DateRange[1] });
            responses.push(normalize(res));
          } catch {}
        }

        if (!responses.length) throw new Error("No data");
        setStats(mergeStats(responses));
      } else {
        const res: any = await GET_BOOKING_STATISTICS(selectedPartner, { date: DateRange[0] , endDate:DateRange[1] });
        setStats(normalize(res));
      }

      setError("");
    } catch {
      setError("No statistics data found");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };
  // const DateRange = useDateRange();

  useEffect(() => {
    fetchStats();
  }, [selectedPartner, selectedDateRange]);

  const formatLabel = (txt: string) =>
    txt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  /** 🎨 Light pastel colors for boxes */
  const COLORS = [
    "bg-red-100",
    "bg-orange-100",
    "bg-amber-100",
    "bg-yellow-100",
    "bg-lime-100",
    "bg-green-100",
    "bg-emerald-100",
    "bg-teal-100",
    "bg-cyan-100",
    "bg-blue-100",
    "bg-indigo-100",
    "bg-violet-100",
    "bg-purple-100",
    "bg-fuchsia-100",
    "bg-pink-100",
    "bg-rose-100",
  ];

  const title =
    (selectedPartner === "all" ? "ALL PARTNERS" : selectedPartner.toUpperCase()) +
    ` : Booking Statistics `;

  return (
    <div className="p-5 pb-1 pl-0">
      {/* COLLAPSE HEADER */}
      <div
        className="flex justify-between items-center mb-4 border-t pt-2 cursor-pointer select-none bg-gray-50 p-3 rounded-lg shadow-sm"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <h4 className="text-[17px] font-bold">{title}</h4>

        </div>

        {/* Arrow + text */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {expanded ? "Hide" : "Show"}
          </span>
          <span
            className={`text-[18px] transition-transform ${
              expanded ? "rotate-180" : "rotate-0"
            }`}
          >
            ▼
          </span>
        </div>
      </div>

      {/* COLLAPSE CONTENT */}
      {expanded && (
        <>
          {loading ? (
            <div className="w-full flex justify-center mt-10">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {error && (
                <div className="p-2 bg-red-100 border text-red-600 mb-4 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {stats && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {Object.entries(stats).map(([key, value], i) => {
                    if (key === "created_date") return null;

                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg w-[15%] shadow-sm border ${COLORS[i % COLORS.length]}`}
                      >
                        <p className="text-[12px] font-semibold">
                          {formatLabel(key)}
                        </p>
                        <p className="text-[15px] mt-1 font-bold">{typeof value === "number" ? (value)?.toFixed(1) : value}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BookingStatistics;
