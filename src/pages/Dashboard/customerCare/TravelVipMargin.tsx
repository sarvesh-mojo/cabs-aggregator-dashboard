// import React from 'react'

// const TravelVipMargin = () => {
//   return (
//     <div>TravelVipMargin</div>
//   )
// }

// export default TravelVipMargin

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GET_CUSTOM_BOOKING_STATISTICS } from "../../../config/customerCare/operationsApicall";

// Types 

interface VipMarginRecord {
  date: string;
  poweredBy: string;
  totalFare: string;
  originalFare: string;
  marginEarned: string;
  combinedTotal: string;
}

//  Helpers 

const todayStr = () => new Date().toISOString().split("T")[0];
const nDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const toINR = (v: string | number) =>
  `₹${parseFloat(String(v)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

const growthColor = (v: number) =>
  v > 0 ? "#1d7c4f" : v < 0 ? "#c0392b" : "inherit";

const PARTNERS = ["indigo", "ixigo", "all"] as const;
type Partner = (typeof PARTNERS)[number];

// Component

const TravelVipMargin: React.FC = () => {
  const [partner, setPartner] = useState<Partner>("indigo");
  const from = nDaysAgo(7);
  const to = todayStr();
  const [data, setData] = useState<VipMarginRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (p: Partner, f: string, t: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const result = await GET_CUSTOM_BOOKING_STATISTICS(p, {
        reportType: "travel_vip_margin_split",
        from: f,
        to: t,
      });
      setData((result as unknown as VipMarginRecord[]) ?? []);
    } catch (err: any) {
      if (err?.name !== "AbortError") setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(partner, from, to);
    return () => abortRef.current?.abort();
  }, [partner, from, to, fetchData]);

  // Derived: day-over-day growth & margin % 

  const withGrowth = data.map((row, i) => {
    const prev = data[i - 1];
    const growthTotal =
      prev && parseFloat(prev.totalFare) !== 0
        ? ((parseFloat(row.totalFare) - parseFloat(prev.totalFare)) / parseFloat(prev.totalFare)) * 100
        : null;
    const growthOriginal =
      prev && parseFloat(prev.originalFare) !== 0
        ? ((parseFloat(row.originalFare) - parseFloat(prev.originalFare)) / parseFloat(prev.originalFare)) * 100
        : null;
    const marginPct =
      parseFloat(row.totalFare) > 0
        ? (parseFloat(row.marginEarned) / parseFloat(row.totalFare)) * 100
        : 0;
    return { ...row, growthTotal, growthOriginal, marginPct };
  });

  const totals = data.reduce(
    (acc, r) => ({
      totalFare: acc.totalFare + parseFloat(r.totalFare || "0"),
      originalFare: acc.originalFare + parseFloat(r.originalFare || "0"),
      marginEarned: acc.marginEarned + parseFloat(r.marginEarned || "0"),
      combinedTotal: acc.combinedTotal + parseFloat(r.combinedTotal || "0"),
    }),
    { totalFare: 0, originalFare: 0, marginEarned: 0, combinedTotal: 0 }
  );
  const totalMarginPct = totals.totalFare > 0 ? (totals.marginEarned / totals.totalFare) * 100 : 0;

  //  Shared inline styles 

  const thGroup: React.CSSProperties = {
    background: "#f7f8fa",
    color: "#6b7280",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "10px 14px",
    textAlign: "center",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };
//   const thSub: React.CSSProperties = { ...thGroup, fontWeight: 500, textAlign: "right", padding: "8px 14px" };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: 13, color: "#111827", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" };
  const tdR: React.CSSProperties = { ...td, textAlign: "right" };
  const sep: React.CSSProperties = { borderLeft: "1px solid #e5e7eb" };
  const tfTd: React.CSSProperties = { padding: "11px 14px", fontWeight: 600, fontSize: 13, background: "#f7f8fa", borderTop: "2px solid #e5e7eb", color: "#111827", whiteSpace: "nowrap" };
  const tfTdR: React.CSSProperties = { ...tfTd, textAlign: "right" };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 16 }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden" }}>
          {PARTNERS.map((p) => (
            <button
              key={p}
              onClick={() => setPartner(p)}
              style={{
                padding: "6px 16px", fontSize: 13, fontWeight: 600,
                textTransform: "uppercase", cursor: "pointer", border: "none",
                background: partner === p ? "#1a3fa8" : "#fff",
                color: partner === p ? "#fff" : "#6b7280",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* <input
          type="date" value={from} max={to}
          onChange={(e) => setFrom(e.target.value)}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        /> */}
        {/* <span style={{ fontSize: 13, color: "#6b7280" }}>to</span> */}
        {/* <input
          type="date" value={to} min={from} max={todayStr()}
          onChange={(e) => setTo(e.target.value)}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        /> */}
      </div>

      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb", fontSize: 15, fontWeight: 600, color: "#111827" }}>
          Travel VIP Margin Split
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, fontSize: 13, color: "#9ca3af" }}>
            Loading...
          </div>
        )}
        {!loading && error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, fontSize: 13, color: "#ef4444" }}>
            {error}
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, fontSize: 13, color: "#9ca3af" }}>
            No records found for the selected range.
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                {/* Group row */}
                <tr>
                  <th rowSpan={2} style={{ ...thGroup, textAlign: "left" }}>Date</th>
                  <th rowSpan={2} style={{ ...thGroup, textAlign: "left" }}>Powered By</th>
                  <th colSpan={2} style={{ ...thGroup, ...sep }}>Total Fare</th>
                  <th colSpan={2} style={{ ...thGroup, ...sep }}>Original Fare</th>
                  <th colSpan={2} style={{ ...thGroup, ...sep }}>Margin Earned</th>
                  <th rowSpan={2} style={{ ...thGroup, ...sep, textAlign: "right" }}>Combined Total</th>
                </tr>
                {/* Sub-header row */}
                {/* <tr>
                  <th style={{ ...thSub, ...sep }}>Actual Value</th>
                  <th style={thSub}>vs Prev Day</th>
                  <th style={{ ...thSub, ...sep }}>Actual Value</th>
                  <th style={thSub}>vs Prev Day</th>
                  <th style={{ ...thSub, ...sep }}>Actual Value</th>
                  <th style={thSub}>Margin %</th>
                </tr> */}
              </thead>

              <tbody>
                {withGrowth.map((row, idx) => (
                  <tr key={`${row.date}-${idx}`}>
                    <td style={td}>{row.date}</td>
                    <td style={td}>
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, background: "#e6eeff", color: "#1a3fa8" }}>
                        {row.poweredBy}
                      </span>
                    </td>
                    <td style={{ ...tdR, ...sep }}>{toINR(row.totalFare)}</td>
                    <td style={{ ...tdR, color: row.growthTotal != null ? growthColor(row.growthTotal) : "#9ca3af" }}>
                      {/* {row.growthTotal != null ? pct(row.growthTotal) : "—"} */}
                    </td>
                    <td style={{ ...tdR, ...sep }}>{toINR(row.originalFare)}</td>
                    <td style={{ ...tdR, color: row.growthOriginal != null ? growthColor(row.growthOriginal) : "#9ca3af" }}>
                      {/* {row.growthOriginal != null ? pct(row.growthOriginal) : "—"} */}
                    </td>
                    <td style={{ ...tdR, ...sep, color: "#1d7c4f", fontWeight: 500 }}>{toINR(row.marginEarned)}</td>
                    <td style={{ ...tdR, color: row.marginPct >= 0 ? "#1d7c4f" : "#c0392b", fontWeight: 500 }}>
                      {/* {row.marginPct.toFixed(2)}% */}
                    </td>
                    <td style={{ ...tdR, ...sep }}>{toINR(row.combinedTotal)}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={2} style={tfTd}>Total ({data.length} records)</td>
                  <td style={{ ...tfTdR, ...sep }}>{toINR(totals.totalFare)}</td>
                  <td style={tfTdR} />
                  <td style={{ ...tfTdR, ...sep }}>{toINR(totals.originalFare)}</td>
                  <td style={tfTdR} />
                  <td style={{ ...tfTdR, ...sep, color: "#1d7c4f" }}>{toINR(totals.marginEarned)}</td>
                  <td style={{ ...tfTdR, color: "#1d7c4f" }}>{totalMarginPct.toFixed(2)}%</td>
                  <td style={{ ...tfTdR, ...sep }}>{toINR(totals.combinedTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && data.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, padding: "10px 16px", borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#6b7280" }}>
            <span>Total {data.length} records</span>
            <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 15 }}>‹</button>
            <button style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#1a3fa8", color: "#fff", cursor: "pointer", fontWeight: 600 }}>1</button>
            <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 15 }}>›</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelVipMargin;