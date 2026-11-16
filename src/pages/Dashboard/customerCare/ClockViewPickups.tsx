// import React from 'react'

// const ClockViewPickups = () => {
//   return (
//     <div>ClockViewPickups</div>
//   )
// }

// export default ClockViewPickups




import { useEffect, useState, useCallback } from "react";

// import { GET_BOOKING_STATISTICS } from "../../config/customerCare/operationsApicall";

// ─── Types ────────────────────────────────────────────────────────────────────

type AmPm = "AM" | "PM";
type ViewMode = "partner" | "city";

interface Partner {
  id: string;
  label: string;
  color: string; // accent color for center total
}

interface City {
  id: string;
  label: string;
}

interface ClockProps {
  hours24: number[]; // length 24
  label: string;
  sublabel: string;
  accentColor: string;
  range: AmPm;
   partnerHourData?: Record<string, number[]>;
}

// ─── Config (replace / extend as needed) ──────────────────────────────────────

const PARTNERS: Partner[] = [
  { id: "OLA",     label: "Refex",     color: "#16A34A" },
  { id: "UBER",    label: "Alyte",    color: "#1D4ED8" },
  { id: "MERU",    label: "TaxiBazaar",    color: "#D97706" },
  { id: "SAVAARI", label: "carzonrent", color: "#7C3AED" },
  { id: "RAPIDO",  label: "QuickRide",  color: "#DB2777" },
];

const CITIES: City[] = [
  { id: "DEL", label: "Delhi"     },
  { id: "BOM", label: "Mumbai"    },
  { id: "BLR", label: "Bangalore" },
  { id: "HYD", label: "Hyderabad" },
  { id: "CHN", label: "Chennai"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSegmentColor(val: number): string {
  if (val === 0)   return "#E5E7EB"; // gray  — 0 pickups
  if (val >= 10)   return "#EF4444"; // red   — 10+
  if (val >= 3)    return "#FACC15"; // yellow — 3–9
  return "#10B981";                  // green  — 1–2
}

// ─── SVG Donut Clock ──────────────────────────────────────────────────────────

function BookingClock({ hours24, label, sublabel, accentColor, range, partnerHourData  }: ClockProps) {
  const isAM     = range === "AM";
  const slice    = isAM ? hours24.slice(0, 12) : hours24.slice(12, 24);
  const total    = slice.reduce((a, b) => a + b, 0);

   const [tooltip, setTooltip] = useState<{ hour: number; x: number; y: number } | null>(null);

    const handleSegmentClick = (i: number, e: React.MouseEvent<SVGPathElement>) => {
  if (!partnerHourData) return;
  const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
  setTooltip(prev =>
    prev?.hour === (isAM ? i : i + 12) ? null : { hour: isAM ? i : i + 12, x: e.clientX - rect.left, y: e.clientY - rect.top }
  );
};

  const CX = 62, CY = 62;
  const OUTER_R = 52, INNER_R = 30;
  const SEG_DEG = 360 / 12;
  const GAP_DEG = 1.5;
  const ringColor = isAM ? "#FBBF24" : "#6366F1";

  const segments = slice.map((val, i) => {
    const startDeg = i * SEG_DEG - 90;
    const endDeg   = startDeg + SEG_DEG;
    const s = ((startDeg + GAP_DEG) * Math.PI) / 180;
    const e = ((endDeg   - GAP_DEG) * Math.PI) / 180;
    const mid = ((startDeg + endDeg) / 2 * Math.PI) / 180;

    const x1 = CX + OUTER_R * Math.cos(s), y1 = CY + OUTER_R * Math.sin(s);
    const x2 = CX + OUTER_R * Math.cos(e), y2 = CY + OUTER_R * Math.sin(e);
    const x3 = CX + INNER_R * Math.cos(e), y3 = CY + INNER_R * Math.sin(e);
    const x4 = CX + INNER_R * Math.cos(s), y4 = CY + INNER_R * Math.sin(s);

    const labelR  = OUTER_R + 9;
    const lx = CX + labelR * Math.cos(mid);
    const ly = CY + labelR * Math.sin(mid);

    const countR  = (OUTER_R + INNER_R) / 2;
    const cx2 = CX + countR * Math.cos(mid);
    const cy2 = CY + countR * Math.sin(mid);

    const hourNum = isAM ? i : i + 12;

     return { val, fill: getSegmentColor(val), d: `M${x1.toFixed(1)},${y1.toFixed(1)} A${OUTER_R},${OUTER_R} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${INNER_R},${INNER_R} 0 0,0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`, lx, ly, cx2, cy2, hourNum };
  });

   

  return (
    // <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center shadow-sm min-w-[128px] flex-shrink-0"></div>
  <div className="relative  bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center shadow-sm  min-w-[12px] flex-1"  onClick={() => setTooltip(null)}>
      <p className="text-[11px] font-semibold text-gray-800 text-center leading-tight">{label}</p>
      <p className="text-[9px] text-gray-400 text-center mb-2">{sublabel}</p>

      <svg width="180" height="180" viewBox="0 0 124 124">
        {/* Segments */}
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={s.fill}
            className={partnerHourData ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
        onClick={(e) => { e.stopPropagation(); handleSegmentClick(i, e); }}
          />
        ))}

        {/* Hour labels */}
        {segments.map((s, i) => (
          <text key={`lbl-${i}`} x={s.lx.toFixed(1)} y={s.ly.toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#9CA3AF">
            {s.hourNum}
          </text>
        ))}

        {/* Count bubbles */}
        {segments.filter(s => s.val > 0).map((s, i) => (
          <g key={`cnt-${i}`}>
            <circle cx={s.cx2.toFixed(1)} cy={s.cy2.toFixed(1)} r="7" fill="white" />
            <text x={s.cx2.toFixed(1)} y={s.cy2.toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize="6.5" fontWeight="700" fill="#374151">
              {s.val}
            </text>
          </g>
        ))}

        {/* Center ring + totals */}
        <circle cx={CX} cy={CY} r={INNER_R - 1} fill="white" stroke={ringColor} strokeWidth="3" />
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="14" fontWeight="700" fill={accentColor}>{total}</text>
        <text x={CX} y={CY + 7} textAnchor="middle" fontSize="6" fill="#9CA3AF">Total Pickups</text>
      </svg>
        {partnerHourData && (() => {
  const startHour = isAM ? 0 : 12;
  const hours = Array.from({ length: 12 }, (_, i) => startHour + i);

  return (
    <div className="w-full mt-3 max-h-[220px] overflow-y-auto border-t border-gray-100 pt-2">
      {hours.map(h => {
        const rows = PARTNERS
          .map(p => ({ label: p.label, color: p.color, count: partnerHourData[p.id]?.[h] || 0 }))
          .filter(r => r.count > 0)
          .sort((a, b) => b.count - a.count);

        if (rows.length === 0) return null;

        return (
          <div key={h} className="mb-2">
            {/* Time header */}
            <p className="text-[10px] font-semibold text-gray-400 mb-1">
              {String(h).padStart(2,"0")}:00 – {String(h+1).padStart(2,"0")}:00
            </p>
            {/* Partner rows */}
            {rows.map(r => (
              <div key={r.label} className="flex items-center justify-between py-[2px]">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  {r.label}
                </span>
                <span className="text-[11px] font-semibold text-gray-800">{r.count}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
})()}
      
      {tooltip && partnerHourData && (() => {
  const h = tooltip.hour;
  const timeLabel = `${String(h).padStart(2,"0")}:00 – ${String(h+1).padStart(2,"0")}:00`;
  const rows = PARTNERS
    .map(p => ({ label: p.label, color: p.color, count: partnerHourData[p.id]?.[h] || 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[160px]"
      style={{ top: tooltip.y + 8, left: tooltip.x - 80 }}
        onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[11px] font-semibold text-gray-500 mb-2">{timeLabel}</p>
      {rows.length === 0
        ? <p className="text-[11px] text-gray-400">No pickups</p>
        : rows.map(r => (
            <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-[12px] text-gray-700">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.color }} />
                {r.label}
              </span>
              <span className="text-[12px] font-semibold text-gray-800">{r.count}</span>
            </div>
          ))
      }
    </div>
  );
})()}
    </div>
  );
}

// ─── Mock data (remove after API integration) ─────────────────────────────────

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genMockHours(seed: number): number[] {
  const h = Array(24).fill(0);
  const peaks = seed < 3 ? [7, 8, 9, 17, 18, 19] : [0, 1, 13, 14, 22, 23];
  for (let i = 0; i < 24; i++) {
    h[i] = peaks.includes(i) ? randInt(2, 14) : (Math.random() > 0.55 ? randInt(1, 5) : 0);
  }
  return h;
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

// interface BookingClockDashboardProps {
//   dateRange: [string, string];
//   cityCode?: string | null;
//   cabPartner?: string | null;
// }
interface BookingClockDashboardProps {
  dateRange?: [string, string];
  cityCode?: string | null;
  cabPartner?: string | null;
}

export default function BookingClockDashboard({ dateRange, cityCode, cabPartner }: BookingClockDashboardProps) {
  const [view, setView]   = useState<ViewMode>("partner");
  const [range, setRange] = useState<AmPm>("AM");
  const [loading, setLoading] = useState(false);

  // partnerData[partnerId] = number[24]
  const [partnerData, setPartnerData] = useState<Record<string, number[]>>({});
  // cityData[cityId][partnerId] = number[24]   (used to sum per city)
  const [cityData, setCityData] = useState<Record<string, Record<string, number[]>>>({});

  // ── Fetch partner-wise data ──────────────────────────────────────────────────
  const loadPartnerData = useCallback(async () => {
    setLoading(true);
    try {
      /* ── API integration (uncomment & adapt) ───────────────────────────────
      const params = {
        date:    dateRange[0],
        endDate: dateRange[1],
        type:    "hour",
        ...(cityCode    && { cityCode }),
        ...(cabPartner  && { cabPartner }),
      };

      const responses = await Promise.all(
        PARTNERS.map(p => GET_BOOKING_STATISTICS(p.id, params))
      );

      const result: Record<string, number[]> = {};
      PARTNERS.forEach((p, idx) => {
        const hours = Array(24).fill(0);
        const res   = responses[idx];
        if (Array.isArray(res)) {
          res.forEach((d: any) => {
            const h = Number(d.hourOfDay);
            if (h >= 0 && h < 24) hours[h] += Number(d.total_booking_confirmed) || 0;
          });
        }
        result[p.id] = hours;
      });

      setPartnerData(result);
      ─────────────────────────────────────────────────────────────────────── */

      // ── MOCK (remove after API) ──
      const mock: Record<string, number[]> = {};
      PARTNERS.forEach((p, i) => { mock[p.id] = genMockHours(i); });
      setPartnerData(mock);

    } finally {
      setLoading(false);
    }
  }, [dateRange, cityCode, cabPartner]);

  // ── Fetch city-wise data ──────────────────────────────────────────────────────
  const loadCityData = useCallback(async () => {
    setLoading(true);
    try {
      /* ── API integration (uncomment & adapt) ───────────────────────────────
      const result: Record<string, Record<string, number[]>> = {};

      await Promise.all(
        CITIES.map(async (c) => {
          const params = {
            date:    dateRange[0],
            endDate: dateRange[1],
            type:    "hour",
            cityCode: c.id,
          };
          const responses = await Promise.all(
            PARTNERS.map(p => GET_BOOKING_STATISTICS(p.id, params))
          );
          result[c.id] = {};
          PARTNERS.forEach((p, idx) => {
            const hours = Array(24).fill(0);
            const res   = responses[idx];
            if (Array.isArray(res)) {
              res.forEach((d: any) => {
                const h = Number(d.hourOfDay);
                if (h >= 0 && h < 24) hours[h] += Number(d.total_booking_confirmed) || 0;
              });
            }
            result[c.id][p.id] = hours;
          });
        })
      );

      setCityData(result);
      ─────────────────────────────────────────────────────────────────────── */

      // ── MOCK (remove after API) ──
      const mock: Record<string, Record<string, number[]>> = {};
      CITIES.forEach((c, i) => {
        mock[c.id] = {};
        PARTNERS.forEach((p, j) => { mock[c.id][p.id] = genMockHours(i + j); });
      });
      setCityData(mock);

    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (view === "partner") loadPartnerData();
    else                    loadCityData();
  }, [view, loadPartnerData, loadCityData]);

  // ── Derive city combined hours ────────────────────────────────────────────────
  function getCityHours(cityId: string): number[] {
    const partnerMap = cityData[cityId] || {};
    return Array(24).fill(0).map((_, h) =>
      PARTNERS.reduce((sum, p) => sum + (partnerMap[p.id]?.[h] || 0), 0)
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const sublabel = range === "AM" ? "00:00–11:59" : "12:00–23:59";

  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* View toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          {(["partner", "city"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 font-medium transition-colors ${view === v ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}>
              {v === "partner" ? "Partner-wise" : "City-wise"}
            </button>
          ))}
        </div>

        {/* AM / PM toggle */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          <button onClick={() => setRange("AM")}
            className={`px-4 py-1.5 font-medium transition-colors ${range === "AM" ? "bg-yellow-50 text-yellow-800" : "text-gray-500 hover:bg-gray-50"}`}>
            ☀️ AM
          </button>
          <button onClick={() => setRange("PM")}
            className={`px-4 py-1.5 font-medium transition-colors ${range === "PM" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"}`}>
            🌙 PM
          </button>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-500">
          {[["#10B981","1–2"],["#FACC15","3–9"],["#EF4444","10+"],["#E5E7EB","0"]].map(([col, lbl]) => (
            <span key={lbl} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: col }} />
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Section heading */}
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
        {view === "partner" ? "Cab partners — pickup distribution" : "Cities — combined partner pickups"}
      </p>

      {/* Clock row */}
      {loading ? (
        <div className="flex gap-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="w-[128px] h-[164px] bg-gray-100 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      ) : (
     <div className="flex gap-3 w-full">
          {view === "partner"
            ? PARTNERS.map(p => (
                <BookingClock
                  key={p.id}
                  hours24={partnerData[p.id] || Array(24).fill(0)}
                  label={p.label}
                  sublabel={sublabel}
                  accentColor={p.color}
                  range={range}
                />
              ))
            : CITIES.map(c => (
                <BookingClock
                  key={c.id}
                  hours24={getCityHours(c.id)}
                  label={c.label}
                  sublabel={sublabel}
                  accentColor="#1D4ED8"
                  range={range}
                  partnerHourData={cityData[c.id]}
                />
              ))
          }
        </div>
      )}
    </div>
  );
}


// import { useEffect, useState, useCallback, useRef } from "react";
// import {

// GET_BOOKING_DAILY_COUNTS, 
//   GET_LIVE_CITIES_LIST,
// } from "../../../config/customerCare/operationsApicall";
// import { CityListTypes } from "../../../config/types";
// import { AvailablecabPartners} from "../../../config/customerCare/constant";
// import { FaCity, FaTaxi, FaEraser } from "react-icons/fa";
// import { PartnerTab } from "../../../components/common/PartnerTab";
// import { RangerPicker } from "../../../components/common/RangePicker";



// // ─── Types ────────────────────────────────────────────────────────────────────

// type AmPm = "AM" | "PM";
// type ViewMode = "partner" | "city";

// interface Partner {
//   id: string;
//   label: string;
//   color: string;
// }

// interface ClockProps {
//   hours24: number[];
//   label: string;
//   sublabel: string;
//   accentColor: string;
//   range: AmPm;
//   partnerHourData?: Record<string, number[]>;
// }

// // ─── Config ───────────────────────────────────────────────────────────────────

// const partnerOptions: Partner[] = AvailablecabPartners.map(
//   (partnerName: string, index: number) => ({
//     // Kyunki array me direct naam hain, hum id aur label dono me partnerName daalenge
//     id: partnerName, 
//     label: partnerName, 
//     color: [
//       "#16A34A",
//       "#1D4ED8",
//       "#D97706",
//       "#7C3AED",
//       "#DB2777",
//       "#0891B2",
//       "#DC2626",
//       "#059669",
//     ][index % 8],
//   })
// );

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function getSegmentColor(val: number): string {
//   if (val === 0)   return "#E5E7EB"; 
//   if (val >= 10)   return "#EF4444"; 
//   if (val >= 3)    return "#FACC15"; 
//   return "#10B981";                  
// }


// // ─── SVG Donut Clock ──────────────────────────────────────────────────────────

// function BookingClock({ hours24, label, sublabel, accentColor, range, partnerHourData  }: ClockProps) {
//   const isAM     = range === "AM";
//   const slice    = isAM ? hours24.slice(0, 12) : hours24.slice(12, 24);
//   const total    = slice.reduce((a, b) => a + b, 0);

//   const [tooltip, setTooltip] = useState<{ hour: number; x: number; y: number } | null>(null);

//   const handleSegmentClick = (i: number, e: React.MouseEvent<SVGPathElement>) => {
//     if (!partnerHourData) return;
//     const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
//     setTooltip(prev =>
//       prev?.hour === (isAM ? i : i + 12) ? null : { hour: isAM ? i : i + 12, x: e.clientX - rect.left, y: e.clientY - rect.top }
//     );
//   };



//   const CX = 62, CY = 62;
//   const OUTER_R = 52, INNER_R = 30;
//   const SEG_DEG = 360 / 12;
//   const GAP_DEG = 1.5;
//   const ringColor = isAM ? "#FBBF24" : "#6366F1";

//   const segments = slice.map((val, i) => {
//     const startDeg = i * SEG_DEG - 90;
//     const endDeg   = startDeg + SEG_DEG;
//     const s = ((startDeg + GAP_DEG) * Math.PI) / 180;
//     const e = ((endDeg   - GAP_DEG) * Math.PI) / 180;
//     const mid = ((startDeg + endDeg) / 2 * Math.PI) / 180;

//     const x1 = CX + OUTER_R * Math.cos(s), y1 = CY + OUTER_R * Math.sin(s);
//     const x2 = CX + OUTER_R * Math.cos(e), y2 = CY + OUTER_R * Math.sin(e);
//     const x3 = CX + INNER_R * Math.cos(e), y3 = CY + INNER_R * Math.sin(e);
//     const x4 = CX + INNER_R * Math.cos(s), y4 = CY + INNER_R * Math.sin(s);

//     const labelR  = OUTER_R + 9;
//     const lx = CX + labelR * Math.cos(mid);
//     const ly = CY + labelR * Math.sin(mid);

//     const countR  = (OUTER_R + INNER_R) / 2;
//     const cx2 = CX + countR * Math.cos(mid);
//     const cy2 = CY + countR * Math.sin(mid);

//     const hourNum = isAM ? i : i + 12;

//     return { val, fill: getSegmentColor(val), d: `M${x1.toFixed(1)},${y1.toFixed(1)} A${OUTER_R},${OUTER_R} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${INNER_R},${INNER_R} 0 0,0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`, lx, ly, cx2, cy2, hourNum };
//   });

//   return (
    
//     // <div className="relative bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center shadow-sm min-w-[12px] flex-1"
//     <div
//   className="relative bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center shadow-sm min-w-[12px] flex-1"

//      onClick={() => setTooltip(null)}>
//       <p className="text-[11px] font-semibold text-gray-800 text-center leading-tight">{label}</p>
//       <p className="text-[9px] text-gray-400 text-center mb-2">{sublabel}</p>

//       <svg width="180" height="180" viewBox="0 0 124 124">
//         {segments.map((s, i) => (
//           <path key={i} d={s.d} fill={s.fill}
//             className={partnerHourData ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
//             onClick={(e) => { e.stopPropagation(); handleSegmentClick(i, e); }}
//           />
//         ))}

//         {segments.map((s, i) => (
//           <text key={`lbl-${i}`} x={s.lx.toFixed(1)} y={s.ly.toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#9CA3AF">
//             {s.hourNum}
//           </text>
//         ))}

//         {segments.filter(s => s.val > 0).map((s, i) => (
//           <g key={`cnt-${i}`}>
//             <circle cx={s.cx2.toFixed(1)} cy={s.cy2.toFixed(1)} r="7" fill="white" />
//             <text x={s.cx2.toFixed(1)} y={s.cy2.toFixed(1)} textAnchor="middle" dominantBaseline="central" fontSize="6.5" fontWeight="700" fill="#374151">
//               {s.val}
//             </text>
//           </g>
//         ))}

//         <circle cx={CX} cy={CY} r={INNER_R - 1} fill="white" stroke={ringColor} strokeWidth="3" />
//         <text x={CX} y={CY - 6} textAnchor="middle" fontSize="14" fontWeight="700" fill={accentColor}>{total}</text>
//         <text x={CX} y={CY + 7} textAnchor="middle" fontSize="6" fill="#9CA3AF">Total Pickups</text>
//       </svg>
      
//       {partnerHourData && (() => {
//         const startHour = isAM ? 0 : 12;
//         const hours = Array.from({ length: 12 }, (_, i) => startHour + i);

//         return (
//           <div className="w-full mt-3 max-h-[140px] overflow-y-auto border-t border-gray-100 pt-2">
//             {hours.map(h => {
//               const rows = partnerOptions
//                 .map(p => ({ label: p.label, color: p.color, count: partnerHourData[p.id]?.[h] || 0 }))
//                 .filter(r => r.count > 0)
//                 .sort((a, b) => b.count - a.count);

//               if (rows.length === 0) return null;

//               return (
//                 <div key={h} className="mb-2">
//                   <p className="text-[10px] font-semibold text-gray-400 mb-1">
//                     {String(h).padStart(2,"0")}:00 – {String(h+1).padStart(2,"0")}:00
//                   </p>
//                   {rows.map(r => (
//                     <div key={r.label} className="flex items-center justify-between py-[2px]">
//                       <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
//                         <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
//                         {r.label}
//                       </span>
//                       <span className="text-[11px] font-semibold text-gray-800">{r.count}</span>
//                     </div>
//                   ))}
//                 </div>
//               );
//             })}
//           </div>
//         );
//       })()}
      
//       {tooltip && partnerHourData && (() => {
//         const h = tooltip.hour;
//         const timeLabel = `${String(h).padStart(2,"0")}:00 – ${String(h+1).padStart(2,"0")}:00`;
//         const rows = partnerOptions
//           .map(p => ({ label: p.label, color: p.color, count: partnerHourData[p.id]?.[h] || 0 }))
//           .filter(r => r.count > 0)
//           .sort((a, b) => b.count - a.count);

//         return (
//           <div
//             className="absolute z-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[160px]"
//             style={{ top: tooltip.y + 8, left: tooltip.x - 80 }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <p className="text-[11px] font-semibold text-gray-500 mb-2">{timeLabel}</p>
//             {rows.length === 0
//               ? <p className="text-[11px] text-gray-400">No pickups</p>
//               : rows.map(r => (
//                   <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
//                     <span className="flex items-center gap-1.5 text-[12px] text-gray-700">
//                       <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.color }} />
//                       {r.label}
//                     </span>
//                     <span className="text-[12px] font-semibold text-gray-800">{r.count}</span>
//                   </div>
//                 ))
//             }
//           </div>
//         );
//       })()}
//     </div>
//   );
// }

// // ─── Main Dashboard Component ─────────────────────────────────────────────────

// interface BookingClockDashboardProps {
//   dateRange?: [string, string];
//   cityCode?: string | null;
//   cabPartner?: string | null;
// }

// export default function BookingClockDashboard({ cityCode, cabPartner }: BookingClockDashboardProps) {
//     const [dateRange, setDateRange] = useState<[string, string]>(() => {
//     const today = new Date().toLocaleDateString("en-CA");
//     return [today, today];
//   });

//   const handleRangeChange = (range: [string, string]) => {
//     setDateRange(range);
//   };
//   const [view, setView]   = useState<ViewMode>("partner");
//   const [range, setRange] = useState<AmPm>("AM");
//   const [loading, setLoading] = useState(false);

//   // ─── Arrays Arrays (Multi-Select up to 5) ──────────────────────────────────
//   const [cities, setCities] = useState<CityListTypes[]>([]);
//   const [filteredCities, setFilteredCities] = useState<CityListTypes[]>([]);
  
//   const [selectedCities, setSelectedCities] = useState<CityListTypes[]>([]);
//   const [selectedCabPartners, setSelectedCabPartners] = useState<string[]>([]);

//   // ─── Dropdown Toggles State ───
//   const [openCity, setOpenCity] = useState(false);
//   const [openPartner, setOpenPartner] = useState(false);
  
//   const [citySearch, setCitySearch] = useState("");
  
//   const cityDropdownRef = useRef<HTMLDivElement | null>(null);
//   const partnerDropdownRef = useRef<HTMLDivElement | null>(null);

// //   const [partnerData, setPartnerData] = useState<Record<string, number[]>>({});
// //   const [cityData, setCityData] = useState<Record<string, Record<string, number[]>>>({});
// const [analyticsData, setAnalyticsData] = useState<
//   Record<string, Record<string, number[]>>
// >({});

//   // ─── Handle Click Outside ────────────────────────────────────────────────────
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
//         setOpenCity(false);
//       }
//       if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target as Node)) {
//         setOpenPartner(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // ─── Initial Fetching ───────────────────────────────────────────────────────
//   useEffect(() => {
//     if (cabPartner) setSelectedCabPartners([cabPartner]);
//   }, [cabPartner]);

//   useEffect(() => {
//     const fetchCities = async () => {
//       try {
//         const response: CityListTypes[] = await GET_LIVE_CITIES_LIST();
//         const filtered = response.filter(obj => obj.is_departure === 1 || obj.is_arrival === 1);
//         setCities(filtered);
//         setFilteredCities(filtered);
        
//         if (cityCode) {
//       const preSelected = filtered.find(
//         c => c.code === cityCode
//       );

//       if (preSelected) {
//         setSelectedCities([preSelected]);
//       }
//     } else {
//       setSelectedCities(
//         filtered.slice(0, 5)
//       );
//         }
//       } catch (err) {
//         console.log(err);
//       }
//     };
//     fetchCities();
//   }, [cityCode]);

// //   useEffect(() => {
// //   if (
// //     selectedCabPartners.length === 0 &&
// //     partnerOptions.length > 0 &&
// //     !cabPartner
// //   ) {
// //     setSelectedCabPartners(
// //       partnerOptions.slice(0, 5).map((p) => p.id)
// //     );
// //   }
// // }, [partnerOptions]);

// useEffect(() => {
//   if (!cabPartner && selectedCabPartners.length === 0) {
//     setSelectedCabPartners(
//       partnerOptions.slice(0, 5).map((p) => p.id)
//     );
//   }
// }, []);


//   useEffect(() => {
//     const result = cities.filter((city) =>
//       city.name.toLowerCase().includes(citySearch.toLowerCase())
//     );
//     setFilteredCities(result);
//   }, [citySearch, cities]);

//   // ─── Helpers: Top 5 logic ───────────────────────────────────────────────────
//   const displayedPartners =
//   selectedCabPartners.length > 0
//     ? partnerOptions.filter(p =>
//         selectedCabPartners.includes(p.id)
//       )
//     : partnerOptions.slice(0, 5);

//   const displayedCities = selectedCities.length > 0 
//     ? cities.filter(c => selectedCities.some(sc => sc.code === c.code)) 
//     : cities.slice(0, 5);

//   // ─── Multi-Select Handlers ──────────────────────────────────────────────────
//   const toggleCity = (city: CityListTypes) => {
//     setSelectedCities(prev => {
//       const isSelected = prev.find(c => c.code === city.code);
//       if (isSelected) return prev.filter(c => c.code !== city.code); // Deselect
//       if (prev.length >= 5) return prev; // Limit to 5
//       return [...prev, city]; // Select
//     });
//   };

//   const togglePartner = (partnerId: string) => {
//     setSelectedCabPartners(prev => {
//       const isSelected = prev.includes(partnerId);
//       if (isSelected) return prev.filter(p => p !== partnerId); // Deselect
//       if (prev.length >= 5) return prev; // Limit to 5
//       return [...prev, partnerId]; // Select
//     });
//   };

//   const loadAnalyticsData = useCallback(async () => {
//   setLoading(true);

//   try {
//     const response: any = await GET_BOOKING_DAILY_COUNTS("indigo", {
//       date: dateRange?.[0],
//       endDate: dateRange?.[1],
//       groupByHour: true,
//       groupByCityCode: true,
//       groupByCabPartner: true,
//     });
// //     const response = await GET_BOOKING_DAILY_COUNTS("indigo", {
// //   date: "2026-05-22",
// //   endDate: "2026-05-22",
// //   groupByHour: true,
// //   groupByCityCode: true,
// //   groupByCabPartner: true,
// // });
//     console.log("analytics response", response);
//       const analyticsRows = response?.data || [];

//     const transformed: Record<
//       string,
//       Record<string, number[]>
//     > = {};

//     // response.forEach((row: any) => {
  

// analyticsRows.forEach((row: any) => {
//       const city = row.cityCode;
//       const partner = row.cabPartner;
//       const hour = Number(row.hour);

//       if (!transformed[city]) {
//         transformed[city] = {};
//       }

//       if (!transformed[city][partner]) {
//         transformed[city][partner] = Array(24).fill(0);
//       }

//       transformed[city][partner][hour] =
//         Number(row.total_rides || 0);
//     });

//     console.log("transformed", transformed);
//     setAnalyticsData(transformed);
//     console.log("API Partners",
//   [...new Set(analyticsRows.map((x:any) => x.cabPartner))]
// );

// console.log(
//   "Dropdown Partners",
//   partnerOptions.map(p => p.id)
// );
//   } catch (error) {
//     console.error(error);
//   } finally {
//     setLoading(false);
//   }
// }, [dateRange]);

//   // ── UseEffect for Fetching Data ──────────────────────────────────────────────
// // useEffect(() => {
// //   loadAnalyticsData();
// // }, [loadAnalyticsData]);

// useEffect(() => {
//   if (!dateRange?.[0] || !dateRange?.[1]) return;

//   loadAnalyticsData();
// }, [loadAnalyticsData, dateRange]);


// function getPartnerHours(
//   partnerId: string
// ): number[] {
//     console.log("Checking partner:", partnerId);


//       const sampleCity = displayedCities[0]?.code;

//        console.log(
//     "Data exists?",
//     analyticsData?.[sampleCity]?.[partnerId]
//   );
//   const hours = Array(24).fill(0);
//   console.log("partnerId", partnerId);

//   const citiesToUse =
//     displayedCities.length > 0
//       ? displayedCities
//       : cities.slice(0, 5);
      

//   citiesToUse.forEach((city) => {
//     console.log("city", city.code);
//     for (let h = 0; h < 24; h++) {
//       hours[h] +=
//         analyticsData?.[city.code]?.[partnerId]?.[h] || 0;
//         console.log(
//   analyticsData?.[city.code]?.[partnerId]
// );
//     }
//   });
  

//   return hours;
// }

//   // ── Derive city combined hours ────────────────────────────────────────────────
//   function getCityHours(
//   cityCodeArg: string
// ): number[] {
//   const hours = Array(24).fill(0);

//   displayedPartners.forEach((partner) => {
//     for (let h = 0; h < 24; h++) {
//       hours[h] +=
//         analyticsData?.[cityCodeArg]?.[partner.id]?.[h] || 0;
//     }
//   });

//   return hours;
// }

//   const sublabel = range === "AM" ? "00:00–11:59" : "12:00–23:59";

//   return (
//     <div className="w-full">
//         {/* <div className="flex flex-wrap items-center justify-between px-1 pt-2 gap-0 mb-4 relative z-20"> */}
//         <div className="relative z-[200]">
//         <PartnerTab propsData={{ isall: false }} />
//       {/* <div className="min-w-[280px]"> */}
//       <div className="relative z-[200] min-w-[320px]">
//           <RangerPicker 
//               updateDate={dateRange} 
//               selectedRange={handleRangeChange} 
//             />
//             </div>
//             </div>
//       {/* ── NEW CUSTOM FILTERS BAR ── */}
//       {/* <div className="relative z-50 flex flex-col sm:flex-row items-start gap-3 sm:gap-5 p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 mb-4"> */}

//       <div className="relative z-50 flex flex-col sm:flex-row items-start gap-3 sm:gap-5 p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 mb-4">
        
//         {/* View Toggle */}
//         <div className="flex flex-col">
//           <p className="text-xs mb-1.5 text-gray-600 font-medium">View By</p>
//           <div className="flex border border-gray-200 rounded-xl overflow-hidden h-10 text-sm">
//             {(["partner", "city"] as ViewMode[]).map(v => (
//               <button key={v} onClick={() => setView(v)}
//                 className={`px-4 font-medium transition-colors ${view === v ? "bg-blue-50 text-blue-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"}`}>
//                 {v === "partner" ? "Partner" : "City"}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Multi-Select City Dropdown */}
//         <div ref={cityDropdownRef} className="relative w-full sm:w-64">
//           <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
//             <FaCity className="text-emerald-500" />
//             City (Max 5)
//           </p>
//           <div
//             className="rounded-xl px-3 py-2 text-sm cursor-pointer bg-gray-50/80 border border-gray-200/80 min-h-[40px] flex justify-between items-center hover:border-gray-300 transition-colors"
//             onClick={() => setOpenCity((p) => !p)}
//           >
//             {/* <span className="truncate text-gray-700 flex-1 mr-2 leading-tight"> */}
//             {/* <span className="text-gray-700">
//               {selectedCities.length === 0 
//                 ? "Select up to 5 cities" 
//                 : selectedCities.map(c => c.name).join(", ")}
//             </span> */}
//             <span className="text-gray-700 truncate flex-1">
//   {selectedCities.length === 0
//     ? "Select up to 5 cities"
//     : `${selectedCities.length} Cities Selected`}
// </span>
//             <span className="text-gray-400 text-xs">▼</span>
//           </div>
//           {openCity && (
//             <div className="absolute z-[100] w-full bg-white border border-gray-200 mt-1.5 rounded-xl shadow-xl overflow-hidden">
//               <input
//                 type="text"
//                 placeholder="Search city..."
//                 className="w-full px-3 py-2.5 text-sm border-b border-gray-100 outline-none focus:ring-1 ring-blue-200 rounded-t-xl"
//                 value={citySearch}
//                 onChange={(e) => setCitySearch(e.target.value)}
//               />
//               <ul className="max-h-52 overflow-auto bg-white">
//                 {filteredCities.length === 0 && (
//                   <li className="px-3 py-2.5 text-sm text-gray-400">
//                     No city found
//                   </li>
//                 )}
//                 {filteredCities.map((city) => {
//                   const isChecked = selectedCities.some(sc => sc.code === city.code);
//                   const isMaxed = selectedCities.length >= 5 && !isChecked;

//                   return (
//                     <li
//                       key={city.id}
//                       className={`px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2 text-gray-700
//                         ${isMaxed ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50"}
//                       `}
//                       onClick={() => !isMaxed && toggleCity(city)}
//                     >
//                       <input type="checkbox" checked={isChecked} readOnly className="pointer-events-none" />
//                       {city.name}
//                     </li>
//                   );
//                 })}
//               </ul>
//             </div>
//           )}
//         </div>

//         {/* Multi-Select Cab Partner Dropdown */}
//         <div ref={partnerDropdownRef} className="relative w-full sm:w-60">
//           <p className="text-xs mb-1.5 text-gray-600 flex items-center gap-1.5 font-medium">
//             <FaTaxi className="text-amber-500" />
//             Cab Partner (Max 5)
//           </p>
//           <div
//             className="rounded-xl px-3 py-2 text-sm cursor-pointer bg-gray-50/80 border border-gray-200/80 min-h-[40px] flex justify-between items-center hover:border-gray-300 transition-colors"
//             onClick={() => setOpenPartner((p) => !p)}
//           >
//             {/* <span className="truncate text-gray-700 flex-1 mr-2 leading-tight"> */}
//             {/* <span className="text-gray-700">
//               {selectedCabPartners.length === 0 
//                 ? "Select up to 5 partners" 
//                 : partnerOptions.filter(p => selectedCabPartners.includes(p.id)).map(p => p.label).join(", ")}
//             </span> */}
//             <span className="text-gray-700 truncate flex-1">
//   {selectedCabPartners.length === 0
//     ? "Select up to 5 partners"
//     : `${selectedCabPartners.length} Partners Selected`}
// </span>
//             <span className="text-gray-400 text-xs">▼</span>
//           </div>
//           {openPartner && (
//             <div className="absolute z-[100] w-full bg-white border border-gray-200 mt-1.5 rounded-xl shadow-xl overflow-hidden">
//               <ul className="max-h-52 overflow-auto bg-white">
//                 {partnerOptions.map((p) =>  {
//                   const isChecked = selectedCabPartners.includes(p.id);
//                   const isMaxed = selectedCabPartners.length >= 5 && !isChecked;

//                   return (
//                     <li
//                       key={p.id}
//                       className={`px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2 text-gray-700
//                         ${isMaxed ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-50"}
//                       `}
//                       onClick={() => !isMaxed && togglePartner(p.id)}
//                     >
//                       <input type="checkbox" checked={isChecked} readOnly className="pointer-events-none" />
//                       {p.label}
//                     </li>
//                   );
//                 })}
//               </ul>
//             </div>
//           )}
//         </div>

//         {/* Clear Filters Button */}
//         {(selectedCities.length > 0 || selectedCabPartners.length > 0) && (
//           <div className="flex flex-col justify-end h-full mt-[22px]">
//             <button
//               onClick={() => {
//                 // setSelectedCities([]);
//                 // setSelectedCabPartners([]);
//                 setSelectedCities(cities.slice(0, 5));
// setSelectedCabPartners(
//   partnerOptions.slice(0, 5).map(
//     (p) => p.id
//   )
// );
//                 setCitySearch("");
//               }}
//               className="flex items-center gap-1.5 text-xs text-rose-600 font-medium py-2 px-3 rounded-xl hover:bg-rose-50 transition-colors h-10"
//             >
//               <FaEraser />
//               Clear filters
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Clock Controls Bar */}
//       <div className="flex justify-between items-center mb-2 mt-2">
//         <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
//           {view === "partner" ? "Cab partners — pickup distribution" : "Cities — combined partner pickups"}
//         </p>

//         <div className="flex items-center gap-4 relative z-10">
//           <div className="flex items-center gap-3 text-[11px] text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
//             {[["#10B981","1–2"],["#FACC15","3–9"],["#EF4444","10+"],["#E5E7EB","0"]].map(([col, lbl]) => (
//               <span key={lbl} className="flex items-center gap-1 font-medium">
//                 <span className="w-2 h-2 rounded-full inline-block" style={{ background: col }} />
//                 {lbl}
//               </span>
//             ))}
//           </div>

//           <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm bg-white shadow-sm">
//             <button onClick={() => setRange("AM")}
//               className={`px-3 py-1 font-medium transition-colors ${range === "AM" ? "bg-yellow-50 text-yellow-800" : "text-gray-500 hover:bg-gray-50"}`}>
//               ☀️ AM
//             </button>
//             <button onClick={() => setRange("PM")}
//               className={`px-3 py-1 font-medium transition-colors ${range === "PM" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"}`}>
//               🌙 PM
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Clock row */}
//       {loading ? (
//         <div className="flex gap-3 mt-4 relative z-0">
//           {Array(5).fill(0).map((_, i) => (
//             <div key={i} className="w-[128px] h-[164px] bg-white border border-gray-100 rounded-xl animate-pulse shadow-sm flex-shrink-0" />
//           ))}
//         </div>
//       ) : (
//         // <div className="flex gap-3 w-full flex-wrap mt-4 ">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
//           {view === "partner"
//             ? displayedPartners.map(p => (
//                 <BookingClock
//                   key={p.id}
//                 //   hours24={partnerData[p.id] || Array(24).fill(0)}
//                 hours24={getPartnerHours(p.id)}
//                   label={p.label}
//                   sublabel={sublabel}
//                   accentColor={p.color}
//                   range={range}
//                 />
//               ))
//             : displayedCities.map(c => (
//                 <BookingClock
//                   key={c.code}
//                   hours24={getCityHours(c.code)}
//                   label={c.name}
//                   sublabel={sublabel}
//                   accentColor="#1D4ED8"
//                   range={range}
//                 //   partnerHourData={cityData[c.code]}
//                 partnerHourData={
//   analyticsData[c.code] || {}
// }
//                 />
//               ))
//           }
//         </div>
//       )}
//     </div>
//   );
// }


// import { useEffect, useState, useCallback, useRef } from "react";
// import {
//   GET_BOOKING_DAILY_COUNTS,
//   GET_LIVE_CITIES_LIST,
// } from "../../../config/customerCare/operationsApicall";
// import { CityListTypes } from "../../../config/types";
// import { AvailablecabPartners } from "../../../config/customerCare/constant";
// import { FaCity, FaTaxi, FaEraser, FaSearch } from "react-icons/fa";
// import { RangerPicker } from "../../../components/common/RangePicker";
// import {PartnerTab } from "../../../components/common/PartnerTab";
// import { useSelector } from "react-redux";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type AmPm      = "AM" | "PM";
// type ViewMode  = "partner" | "city";
// // type Platform  = "indigo" | "ixigo" | "bac";

// interface Partner {
//   id: string;
//   label: string;
//   color: string;
// }

// interface ClockProps {
//   hours24: number[];
//   label: string;
//   sublabel: string;
//   accentColor: string;
//   range: AmPm;
//   partnerHourData?: Record<string, number[]>;
// }

// // ─── Partner config ───────────────────────────────────────────────────────────

// const PARTNER_COLORS = [
//   "#16A34A","#1D4ED8","#D97706","#7C3AED",
//   "#DB2777","#0891B2","#DC2626","#059669",
// ];

// const partnerOptions: Partner[] = AvailablecabPartners.map(
//   (name: string, i: number) => ({
//     id: name,
//     label: name,
//     color: PARTNER_COLORS[i % PARTNER_COLORS.length],
//   })
// );

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function pad(n: number) { return String(n).padStart(2, "0"); }

// function getSegmentColor(val: number): string {
//   if (val === 0)  return "#E5E7EB";
//   if (val >= 10)  return "#EF4444";
//   if (val >= 3)   return "#FACC15";
//   return "#10B981";
// }

// // ─── BookingClock ─────────────────────────────────────────────────────────────

// function BookingClock({ hours24, label, sublabel, accentColor, range, partnerHourData }: ClockProps) {
//   const isAM  = range === "AM";
//   const slice = isAM ? hours24.slice(0, 12) : hours24.slice(12, 24);
//   const total = slice.reduce((a, b) => a + b, 0);

//   const [tooltip, setTooltip] = useState<{ hour: number; x: number; y: number } | null>(null);
  

//   useEffect(() => {
//     if (!tooltip) return;
//     const close = () => setTooltip(null);
//     window.addEventListener("click", close);
//     return () => window.removeEventListener("click", close);
//   }, [tooltip]);

//   const handleSegmentClick = (i: number, e: React.MouseEvent<SVGPathElement>) => {
//     if (!partnerHourData) return;
//     e.stopPropagation();
//     const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
//     const hour = isAM ? i : i + 12;
//     setTooltip(prev => prev?.hour === hour ? null : { hour, x: e.clientX - rect.left, y: e.clientY - rect.top });
//   };

//   const CX = 62, CY = 62, OUTER_R = 52, INNER_R = 30;
//   const SEG_DEG = 360 / 12, GAP_DEG = 1.5;
//   const ringColor = isAM ? "#FBBF24" : "#6366F1";

//   const segments = slice.map((val, i) => {
//     const startDeg = i * SEG_DEG - 90;
//     const endDeg   = startDeg + SEG_DEG;
//     const s   = ((startDeg + GAP_DEG) * Math.PI) / 180;
//     const e   = ((endDeg   - GAP_DEG) * Math.PI) / 180;
//     const mid = (((startDeg + endDeg) / 2) * Math.PI) / 180;
//     const x1 = CX + OUTER_R*Math.cos(s), y1 = CY + OUTER_R*Math.sin(s);
//     const x2 = CX + OUTER_R*Math.cos(e), y2 = CY + OUTER_R*Math.sin(e);
//     const x3 = CX + INNER_R*Math.cos(e), y3 = CY + INNER_R*Math.sin(e);
//     const x4 = CX + INNER_R*Math.cos(s), y4 = CY + INNER_R*Math.sin(s);
//     const lx  = CX + (OUTER_R+9)*Math.cos(mid), ly  = CY + (OUTER_R+9)*Math.sin(mid);
//     const cx2 = CX + ((OUTER_R+INNER_R)/2)*Math.cos(mid);
//     const cy2 = CY + ((OUTER_R+INNER_R)/2)*Math.sin(mid);
//     return {
//       val, fill: getSegmentColor(val),
//       d: `M${x1.toFixed(1)},${y1.toFixed(1)} A${OUTER_R},${OUTER_R} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${INNER_R},${INNER_R} 0 0,0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`,
//       lx, ly, cx2, cy2, hourNum: isAM ? i : i + 12,
//     };
//   });

//   return (
//     <div className="relative bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center shadow-sm flex-1">
//       <p className="text-[12px] font-semibold text-gray-800 text-center leading-tight">{label}</p>
//       <p className="text-[10px] text-gray-400 text-center mb-2">{sublabel}</p>

//       <svg width="180" height="180" viewBox="0 0 124 124">
//         {segments.map((s, i) => (
//           <path key={i} d={s.d} fill={s.fill}
//             className={partnerHourData ? "cursor-pointer hover:opacity-75 transition-opacity" : ""}
//             onClick={(e) => handleSegmentClick(i, e)} />
//         ))}
//         {segments.map((s, i) => (
//           <text key={`l${i}`} x={s.lx.toFixed(1)} y={s.ly.toFixed(1)}
//             textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#9CA3AF">
//             {s.hourNum}
//           </text>
//         ))}
//         {segments.filter(s => s.val > 0).map((s, i) => (
//           <g key={`c${i}`}>
//             <circle cx={s.cx2.toFixed(1)} cy={s.cy2.toFixed(1)} r="7" fill="white" />
//             <text x={s.cx2.toFixed(1)} y={s.cy2.toFixed(1)}
//               textAnchor="middle" dominantBaseline="central" fontSize="6.5" fontWeight="700" fill="#374151">
//               {s.val}
//             </text>
//           </g>
//         ))}
//         <circle cx={CX} cy={CY} r={INNER_R-1} fill="white" stroke={ringColor} strokeWidth="3" />
//         <text x={CX} y={CY-6} textAnchor="middle" fontSize="14" fontWeight="700" fill={accentColor}>{total}</text>
//         <text x={CX} y={CY+7} textAnchor="middle" fontSize="6" fill="#9CA3AF">Total Pickups</text>
//       </svg>

//       {/* Persistent breakdown — city-wise only */}
//       {partnerHourData && (
//         <div className="w-full mt-3 border-t border-gray-100 pt-2 max-h-[180px] overflow-y-auto">
//           {Array.from({ length: 12 }, (_, i) => isAM ? i : i + 12).map(h => {
//             const rows = partnerOptions
//               .map(p => ({ label: p.label, color: p.color, count: partnerHourData[p.id]?.[h] || 0 }))
//               .filter(r => r.count > 0)
//               .sort((a, b) => b.count - a.count);
//             if (!rows.length) return null;
//             return (
//               <div key={h} className="mb-2">
//                 <p className="text-[10px] font-semibold text-gray-400 mb-1">
//                   {pad(h)}:00 – {pad(h+1)}:00
//                 </p>
//                 {rows.map(r => (
//                   <div key={r.label} className="flex items-center justify-between py-[2px]">
//                     <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
//                       <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
//                       {r.label}
//                     </span>
//                     <span className="text-[11px] font-semibold text-gray-800">{r.count}</span>
//                   </div>
//                 ))}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Click tooltip */}
//       {tooltip && partnerHourData && (() => {
//         const h = tooltip.hour;
//         const rows = partnerOptions
//           .map(p => ({ label: p.label, color: p.color, count: partnerHourData[p.id]?.[h] || 0 }))
//           .filter(r => r.count > 0)
//           .sort((a, b) => b.count - a.count);
//         return (
//           <div
//             className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[160px]"
//             style={{ top: tooltip.y + 8, left: Math.max(8, tooltip.x - 80) }}
//             onClick={e => e.stopPropagation()}
//           >
//             <p className="text-[11px] font-semibold text-gray-500 mb-2">{pad(h)}:00 – {pad(h+1)}:00</p>
//             {rows.length === 0
//               ? <p className="text-[11px] text-gray-400">No pickups</p>
//               : rows.map(r => (
//                   <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
//                     <span className="flex items-center gap-1.5 text-[12px] text-gray-700">
//                       <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
//                       {r.label}
//                     </span>
//                     <span className="text-[12px] font-semibold text-gray-800">{r.count}</span>
//                   </div>
//                 ))
//             }
//           </div>
//         );
//       })()}
//     </div>
//   );
// }

// // ─── analyticsData shape: { cityCode → { cabPartner → number[24] } } ──────────
// type AnalyticsMap = Record<string, Record<string, number[]>>;

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function ClockViewPickups() {
// //   const today = new Date().toLocaleDateString("en-CA");
//   const today =  new Date().toISOString().split("T")[0];

//   // ── Platform tab ────────────────────────────────────────────────────────────
// //   const [platform, setPlatform] = useState<Platform>("indigo");

//   // ── Date range ──────────────────────────────────────────────────────────────
//   const [dateRange, setDateRange] = useState<[string, string]>([today, today]);

//   // ── View & AM/PM ────────────────────────────────────────────────────────────
//   const [view,  setView]  = useState<ViewMode>("partner");
//   const [range, setRange] = useState<AmPm>("AM");

//   // ── Cities list (from API) ──────────────────────────────────────────────────
//   const [cities,         setCities]         = useState<CityListTypes[]>([]);
//   const [filteredCities, setFilteredCities] = useState<CityListTypes[]>([]);
//   const [citySearch,     setCitySearch]     = useState("");

//   // ── Pending filter selections (not yet applied) ─────────────────────────────
//   const [pendingCities,   setPendingCities]   = useState<CityListTypes[]>([]);
//   const [pendingPartners, setPendingPartners] = useState<string[]>([]);

//   // ── Applied filters (what the last API call used) ───────────────────────────
//   const [appliedCities,   setAppliedCities]   = useState<CityListTypes[]>([]);
//   const [appliedPartners, setAppliedPartners] = useState<string[]>([]);

//   // ── Dropdown open state ─────────────────────────────────────────────────────
//   const [openCity,    setOpenCity]    = useState(false);
//   const [openPartner, setOpenPartner] = useState(false);
//   const cityRef    = useRef<HTMLDivElement>(null);
//   const partnerRef = useRef<HTMLDivElement>(null);
//   const [cityPos,    setCityPos]    = useState({ top: 0, left: 0, width: 0 });
// const [partnerPos, setPartnerPos] = useState({ top: 0, left: 0, width: 0 });

//   // ── Data & loading ──────────────────────────────────────────────────────────
//   const [analyticsData, setAnalyticsData] = useState<AnalyticsMap>({});
//   const [loading,       setLoading]       = useState(false);
//   const [error,         setError]         = useState<string | null>(null);

//   const OperationstoreData = useSelector(
//   (state: any) => state.operationStore
// );

// const selectedPartner =
//   OperationstoreData?.ReportSelectedPartner;

//   // ── Close dropdowns on outside click ───────────────────────────────────────
//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (cityRef.current    && !cityRef.current.contains(e.target as Node))    setOpenCity(false);
//       if (partnerRef.current && !partnerRef.current.contains(e.target as Node)) setOpenPartner(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   // ── City search filter ──────────────────────────────────────────────────────
//   useEffect(() => {
//     setFilteredCities(
//       cities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()))
//     );
//   }, [citySearch, cities]);

//   // ── Fetch city list once ────────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchCities = async () => {
//       try {
//         const res: CityListTypes[] = await GET_LIVE_CITIES_LIST();
//         const active = res.filter(c => c.is_departure === 1 || c.is_arrival === 1);
//         setCities(active);
//         setFilteredCities(active);
//         const initial = active.slice(0, 5);
//         setPendingCities(initial);
//         setAppliedCities(initial);
//       } catch {
//         // silently fail — cities will be empty
//       }
//     };
//     fetchCities();
//   }, []);

//   // ── Set default partners once ───────────────────────────────────────────────
//   useEffect(() => {
//     const initial = partnerOptions.slice(0, 5).map(p => p.id);
//     setPendingPartners(initial);
//     setAppliedPartners(initial);
//   }, []);

//   // ── Core API call ───────────────────────────────────────────────────────────
// //   const fetchData = useCallback(async (
// //     plt: Platform,
// //     dates: [string, string],
// // const fetchData = useCallback(async (
// //   plt: string,
// //   dates: [string, string],
// //   ) => {
// const fetchData = useCallback(async (
//   plt: string,
//   dates: [string, string]
// ) => {
//   if (!plt) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const response: any = await GET_BOOKING_DAILY_COUNTS(plt, {
//         date: dates[0],
//         endDate: dates[1],
//         groupByHour:        true,
//         groupByCityCode:    true,
//         groupByCabPartner:  true,
//       });

//     //   const rows: any[] = response?.data || [];
//     const rows = Array.isArray(response)
//      ? response
//      : response?.data || [];

//     console.log("Analytics Rows Count:", rows.length);

//       // Build: analyticsData[cityCode][cabPartner][hour] = total_rides
//       const transformed: AnalyticsMap = {};
//       rows.forEach((row: any) => {
//         const city    = row.cityCode;
//         const partner = row.cabPartner;
//         const hour    = Number(row.hour);
//         if (!city || !partner || isNaN(hour)) return;

//         transformed[city]          ??= {};
//         transformed[city][partner] ??= Array(24).fill(0);
//         transformed[city][partner][hour] += Number(row.total_rides) || 0;
//       });
//      console.log("TRANSFORMED DATA", transformed);
//       setAnalyticsData(transformed);
//     } catch {
//       setError("Failed to load data. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   // ── Initial load ────────────────────────────────────────────────────────────
// //   useEffect(() => {
// //     fetchData(platform, dateRange);
// //   // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, []); // only on mount

// // useEffect(() => {
// //   fetchData(
// //     selectedPartner(),
// //     dateRange
// //   );
// // }, []);

// useEffect(() => {
//   if (!selectedPartner) return;

//   fetchData(selectedPartner, dateRange);
// }, [selectedPartner,dateRange, fetchData]);

//   // ── Platform tab change → immediate API call ────────────────────────────────
// //   const handlePlatformChange = (plt: Platform) => {
// //     setPlatform(plt);
// //     fetchData(plt, dateRange);
// //   };

//   // ── Apply filters button ────────────────────────────────────────────────────
//   const handleApply = () => {
//     setAppliedCities(pendingCities);
//     setAppliedPartners(pendingPartners);
//     setOpenCity(false);
//     setOpenPartner(false);
//     // fetchData(platform, dateRange);
// //     fetchData(
// //   selectedPartner(),
// //   dateRange
// // );
// if (selectedPartner) {
//   fetchData(selectedPartner, dateRange);
// }
//   };

//   // ── Toggle helpers ──────────────────────────────────────────────────────────
//   const toggleCity = (city: CityListTypes) => {
//     setPendingCities(prev => {
//       const exists = prev.some(c => c.code === city.code);
//       if (exists) return prev.filter(c => c.code !== city.code);
//       if (prev.length >= 5) return prev;
//       return [...prev, city];
//     });
//   };

//   const togglePartner = (id: string) => {
//     setPendingPartners(prev => {
//       if (prev.includes(id)) return prev.filter(p => p !== id);
//       if (prev.length >= 5)  return prev;
//       return [...prev, id];
//     });
//   };

//   const handleClear = () => {
//     const defaultCities   = cities.slice(0, 5);
//     const defaultPartners = partnerOptions.slice(0, 5).map(p => p.id);
//     setPendingCities(defaultCities);
//     setPendingPartners(defaultPartners);
//     setAppliedCities(defaultCities);
//     setAppliedPartners(defaultPartners);
//     setCitySearch("");
//     // fetchData(platform, dateRange);
// //     fetchData(
// //   selectedPartner(),
// //   dateRange
// // );
// if (selectedPartner) {
//   fetchData(selectedPartner, dateRange);
// }
//   };

//   // ── Derived display lists (use APPLIED filters) ─────────────────────────────
//   const displayedPartners = appliedPartners.length > 0
//     ? partnerOptions.filter(p => appliedPartners.includes(p.id))
//     : partnerOptions.slice(0, 5);

//   const displayedCities = appliedCities.length > 0
//     ? appliedCities
//     : cities.slice(0, 5);

//   // ── Partner-wise: sum ALL cities in API response for this partner ───────────
//   // (don't filter by displayedCities — shows combined across all returned cities)
// //   function getPartnerHours(partnerId: string): number[] {
// //     const hours = Array(24).fill(0);
// //     Object.values(analyticsData).forEach(cityMap => {
// //       const partnerHours = cityMap[partnerId];
// //       if (partnerHours) {
// //         for (let h = 0; h < 24; h++) hours[h] += partnerHours[h] || 0;
// //       }
// //     });
// //     return hours;
// //   }
// function getPartnerHours(partnerId: string): number[] {
//   const hours = Array(24).fill(0);

//   Object.values(analyticsData).forEach((cityMap) => {
//     const partnerHours = cityMap[partnerId];

//     if (!partnerHours) return;

//     for (let h = 0; h < 24; h++) {
//       hours[h] += Number(partnerHours[h] || 0);
//     }
//   });
  
// // console.log(
// //     "PARTNER:",
// //     partnerId,
// //     "TOTAL:",
// //     hours.reduce((a, b) => a + b, 0)
// //   );

//   return hours;
// }

//   // ── City-wise: sum selected partners for this city ──────────────────────────
//   function getCityHours(cityCode: string): number[] {
//     const hours   = Array(24).fill(0);
//     const cityMap = analyticsData[cityCode] || {};
//     displayedPartners.forEach(p => {
//       const ph = cityMap[p.id];
//       if (ph) for (let h = 0; h < 24; h++) hours[h] += ph[h] || 0;
//     });
//     return hours;
//   }

//   const sublabel = range === "AM" ? "00:00–11:59" : "12:00–23:59";

//   // ─────────────────────────────────────────────────────────────────────────────

//   return (
//     <div className="w-full p-4 space-y-4">

//       {/* ── Platform tabs ─────────────────────────────────────────────────── */}
//       {/* <div className="flex gap-2">
//         {(["indigo", "ixigo", "bac"] as Platform[]).map(plt => (
//           <button
//             key={plt}
//             onClick={() => handlePlatformChange(plt)}
//             className={`px-5 py-1.5 rounded-lg text-sm font-semibold uppercase transition-colors border
//               ${platform === plt
//                 ? "bg-orange-500 text-white border-orange-500"
//                 : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
//               }`}
//           >
//             {plt}
//           </button>
//         ))}
//       </div> */}
//       <PartnerTab propsData={{ isall: false }} />

//       {/* ── Date range ────────────────────────────────────────────────────── */}
//       <div className="w-fit">
//         <RangerPicker
//           updateDate={dateRange}
//         //   selectedRange={(r: [string, string]) => setDateRange(r)}
//         // selectedRange={(r: [string, string]) => { setDateRange(r); fetchData(platform, r); }}
// //         selectedRange={(r) => {
// //   setDateRange(r);

// //   fetchData(
// //     selectedPartner(),
// //     r
// //   );
// // }}
// selectedRange={(r) => {
//   setDateRange(r);

//   if (selectedPartner) {
//     fetchData(selectedPartner, r);
//   }
// }}
//         />
//       </div>

//       {/* ── Filter bar ────────────────────────────────────────────────────── */}
//       {/* <div className="flex flex-wrap items-end gap-4 p-4 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100"> */}
//       {/* <div className="relative z-10 flex flex-wrap items-end gap-4 p-4 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100"> */}
//       <div className="flex flex-wrap items-end gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">


//         {/* View toggle */}
//         <div className="flex flex-col">
//           <p className="text-xs mb-1.5 text-gray-600 font-medium">View By</p>
//           <div className="flex border border-gray-200 rounded-xl overflow-hidden h-10 text-sm">
//             {(["partner", "city"] as ViewMode[]).map(v => (
//               <button key={v} onClick={() => setView(v)}
//                 className={`px-4 font-medium transition-colors ${
//                   view === v ? "bg-blue-50 text-blue-700" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
//                 }`}>
//                 {v === "partner" ? "Partner" : "City"}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* City multi-select */}
//         <div ref={cityRef} className="relative w-72 flex flex-col">
//           <p className="text-xs mb-1.5 text-gray-600 font-medium flex items-center gap-1.5">
//             <FaCity className="text-emerald-500" /> City (Max 5)
//           </p>
//           <div
//             // onClick={() => setOpenCity(p => !p)}
//             onClick={() => {
//   if (cityRef.current) {
//     const r = cityRef.current.getBoundingClientRect();
//     // setCityPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
//     setCityPos({ top: r.bottom, left: r.left, width: r.width });
//   }
//   setOpenCity(p => !p);
// }}
//             className="h-10 rounded-xl px-3 text-sm cursor-pointer bg-gray-50 border border-gray-200 flex justify-between items-center hover:border-gray-300 transition-colors"
//           >
//             <span className="text-gray-700 truncate flex-1">
//               {pendingCities.length === 0 ? "Select cities" : `${pendingCities.length} Selected`}
//             </span>
//             <span className="text-gray-400 text-xs ml-2">▼</span>
//           </div>
//           {openCity && (
//             // <div className="absolute top-full left-0 z-[1000] w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-xl overflow-hidden">
//             // <div className="absolute top-full left-0 z-[1000] min-w-[280px] bg-white border border-gray-200 mt-1 rounded-xl shadow-xl overflow-hidden">
//             <div
//   className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
//   style={{ top: cityPos.top + 4, left: cityPos.left, width: Math.max(cityPos.width, 280) }}
// >
//               <input
//                 autoFocus
//                 type="text"
//                 placeholder="Search city..."
//                 className="w-full px-3 py-2.5 text-sm border-b border-gray-100 outline-none"
//                 value={citySearch}
//                 onChange={e => setCitySearch(e.target.value)}
//               />
//               <ul className="max-h-52 overflow-auto">
//                 {filteredCities.length === 0
//                   ? <li className="px-3 py-2.5 text-sm text-gray-400">No city found</li>
//                   : filteredCities.map(city => {
//                       const checked = pendingCities.some(c => c.code === city.code);
//                       const maxed   = pendingCities.length >= 5 && !checked;
//                       return (
//                         <li
//                           key={city.id}
//                           onClick={() => !maxed && toggleCity(city)}
//                           className={`px-3 py-2.5 text-sm flex items-center gap-2 text-gray-700
//                             ${maxed ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-blue-50"}`}
//                         >
//                           <input type="checkbox" checked={checked} readOnly className="pointer-events-none" />
//                           {city.name}
//                         </li>
//                       );
//                     })
//                 }
//               </ul>
//             </div>
//           )}
//         </div>

//         {/* Partner multi-select */}
//         <div ref={partnerRef} className="relative w-56 flex flex-col">
//           <p className="text-xs mb-1.5 text-gray-600 font-medium flex items-center gap-1.5">
//             <FaTaxi className="text-amber-500" /> Cab Partner (Max 5)
//           </p>
//           <div
//             // onClick={() => setOpenPartner(p => !p)}
//             onClick={() => {
//   if (partnerRef.current) {
//     const r = partnerRef.current.getBoundingClientRect();
//     // setPartnerPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
//     setPartnerPos({ top: r.bottom, left: r.left, width: r.width });
//   }
//   setOpenPartner(p => !p);
// }}
            
//             className="h-10 rounded-xl px-3 text-sm cursor-pointer bg-gray-50 border border-gray-200 flex justify-between items-center hover:border-gray-300 transition-colors"
//           >
//             <span className="text-gray-700 truncate flex-1">
//               {pendingPartners.length === 0 ? "Select partners" : `${pendingPartners.length} Selected`}
//             </span>
//             <span className="text-gray-400 text-xs ml-2">▼</span>
//           </div>
//           {openPartner && (
//             // <div className="absolute top-full left-0 z-[1000] min-w-[240px] bg-white border border-gray-200 mt-1 rounded-xl shadow-xl overflow-hidden">
//             <div
//   className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
//   style={{ top: partnerPos.top + 4, left: partnerPos.left, width: Math.max(partnerPos.width, 240) }}
// >
//               <ul className="max-h-52 overflow-auto">
//                 {partnerOptions.map(p => {
//                   const checked = pendingPartners.includes(p.id);
//                   const maxed   = pendingPartners.length >= 5 && !checked;
//                   return (
//                     <li
//                       key={p.id}
//                       onClick={() => !maxed && togglePartner(p.id)}
//                       className={`px-3 py-2.5 text-sm flex items-center gap-2 text-gray-700
//                         ${maxed ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-amber-50"}`}
//                     >
//                       <input type="checkbox" checked={checked} readOnly className="pointer-events-none" />
//                       <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
//                       {p.label}
//                     </li>
//                   );
//                 })}
//               </ul>
//             </div>
//           )}
//         </div>

//         {/* ── Apply button ── */}
//         <button
//           onClick={handleApply}
//           disabled={loading}
//           className="h-10 px-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
//         >
//           <FaSearch className="text-xs" />
//           {loading ? "Loading…" : "Apply"}
//         </button>

//         {/* Clear */}
//         <button
//           onClick={handleClear}
//           className="h-10 px-4 flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 text-sm font-medium rounded-xl transition-colors border border-rose-100"
//         >
//           <FaEraser className="text-xs" /> Clear
//         </button>
//       </div>

//       {/* ── Error ─────────────────────────────────────────────────────────── */}
//       {error && (
//         <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
//       )}

//       {/* ── Controls bar ──────────────────────────────────────────────────── */}
//       <div className="flex justify-between items-center">
//         <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
//           {view === "partner" ? "Cab partners — pickup distribution" : "Cities — combined partner pickups"}
//         </p>
//         <div className="flex items-center gap-3">
//           <div className="flex items-center gap-3 text-[11px] text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
//             {[["#10B981","1–2"],["#FACC15","3–9"],["#EF4444","10+"],["#E5E7EB","0"]].map(([col,lbl]) => (
//               <span key={lbl} className="flex items-center gap-1 font-medium">
//                 <span className="w-2 h-2 rounded-full" style={{ background: col }} />{lbl}
//               </span>
//             ))}
//           </div>
//           <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm bg-white shadow-sm">
//             <button onClick={() => setRange("AM")}
//               className={`px-3 py-1 font-medium transition-colors ${range==="AM" ? "bg-yellow-50 text-yellow-800" : "text-gray-500 hover:bg-gray-50"}`}>
//               ☀️ AM
//             </button>
//             <button onClick={() => setRange("PM")}
//               className={`px-3 py-1 font-medium transition-colors ${range==="PM" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"}`}>
//               🌙 PM
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* ── Clock row ─────────────────────────────────────────────────────── */}
//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
//           {Array(5).fill(0).map((_, i) => (
//             <div key={i} className="h-[220px] bg-white border border-gray-100 rounded-xl animate-pulse shadow-sm" />
//           ))}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-start">
//           {view === "partner"
//             ? displayedPartners.map(p => (
//                 <BookingClock
//                   key={p.id}
                  
//                   hours24={getPartnerHours(p.id)}
//                   label={p.label}
//                   sublabel={sublabel}
//                   accentColor={p.color}
//                   range={range}
//                 />
//               ))
           
 
//             : displayedCities.map(c => (
//                 <BookingClock
//                   key={c.code}
//                   hours24={getCityHours(c.code)}
//                   label={c.name}
//                   sublabel={sublabel}
//                   accentColor="#1D4ED8"
//                   range={range}
//                   partnerHourData={analyticsData[c.code] || {}}
//                 />
//               ))
//           }
//         </div>
//       )}
//     </div>
//   );
// }