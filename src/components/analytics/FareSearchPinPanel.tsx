import { useMemo } from "react";
import { DensityPoint, PinDensityMap } from "./PinDensityMap";

export type FareSearchPin = {
  pin: string;
  area: string;
  searches: number;
  searchesPerDay: number;
  avgKm: number | null;
  avgFare: number | null;
  lat: number;
  lng: number;
  sampleAddress: string;
  garagePin: string;
  airports: string;
};

export type FareSearchGarage = {
  pin: string;
  label: string;
  pins: string[];
  searches: number;
  searchesPerDay: number;
  avgKm: number | null;
  avgFare: number | null;
  lat: number;
  lng: number;
};

export type FareSearchPinReport = {
  summary: {
    searches: number;
    withPin: number;
    plotted: number;
    truncated: boolean;
    maxKm: number;
    clusterKm: number;
    droppedPins: string[];
    focusPin: string;
  };
  pins: FareSearchPin[];
  garages: FareSearchGarage[];
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNumberOrNull = (value: unknown) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseFareSearchPinReport = (raw: Record<string, unknown>): FareSearchPinReport => {
  const summaryRaw = (raw.summary || {}) as Record<string, unknown>;
  const pins = (Array.isArray(raw.pins) ? raw.pins : []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      pin: String(item.pin || ""),
      area: String(item.area || item.pin || ""),
      searches: toNumber(item.searches),
      searchesPerDay: toNumber(item.searchesPerDay),
      avgKm: toNumberOrNull(item.avgKm),
      avgFare: toNumberOrNull(item.avgFare),
      lat: toNumber(item.lat),
      lng: toNumber(item.lng),
      sampleAddress: String(item.sampleAddress || ""),
      garagePin: String(item.garagePin || item.pin || ""),
      airports: String(item.airports || ""),
    };
  });
  const garages = (Array.isArray(raw.garages) ? raw.garages : []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      pin: String(item.pin || ""),
      label: String(item.label || item.pin || ""),
      pins: Array.isArray(item.pins) ? item.pins.map((pin) => String(pin)) : [],
      searches: toNumber(item.searches),
      searchesPerDay: toNumber(item.searchesPerDay),
      avgKm: toNumberOrNull(item.avgKm),
      avgFare: toNumberOrNull(item.avgFare),
      lat: toNumber(item.lat),
      lng: toNumber(item.lng),
    };
  });
  const dropped = summaryRaw.droppedPins;
  return {
    summary: {
      searches: toNumber(summaryRaw.searches),
      withPin: toNumber(summaryRaw.withPin),
      plotted: toNumber(summaryRaw.plotted),
      truncated: Boolean(summaryRaw.truncated),
      maxKm: toNumber(summaryRaw.maxKm, 80),
      clusterKm: toNumber(summaryRaw.clusterKm, 6),
      droppedPins: Array.isArray(dropped) ? dropped.map((pin) => String(pin)) : [],
      focusPin: String(summaryRaw.focusPin || ""),
    },
    pins: pins.filter((pin) => pin.pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)),
    garages: garages.filter((garage) => garage.pin),
  };
};

export const garagesToPoints = (garages: FareSearchGarage[]): DensityPoint[] =>
  garages
    .filter((garage) => Number.isFinite(garage.lat) && Number.isFinite(garage.lng))
    .map((garage) => ({
      id: garage.pin,
      label: garage.label,
      pin: garage.pin,
      searches: garage.searches,
      searchesPerDay: garage.searchesPerDay,
      avgKm: garage.avgKm,
      avgFare: garage.avgFare,
      lat: garage.lat,
      lng: garage.lng,
      pins: garage.pins,
    }));

const formatCount = (value: number) => value.toLocaleString("en-IN");

const formatFare = (value: number | null) =>
  value == null ? "—" : `₹${Math.round(value).toLocaleString("en-IN")}`;

export const FareSearchPinPanel = ({
  report,
  pinKm,
  onPinKmChange,
  pinQuery,
  onPinQueryChange,
  airportLabel,
}: {
  report: FareSearchPinReport;
  pinKm: number;
  onPinKmChange: (km: number) => void;
  pinQuery: string;
  onPinQueryChange: (pin: string) => void;
  airportLabel: string;
}) => {
  const summary = report.summary;

  const coverage = useMemo(() => {
    if (!summary.searches) return "0%";
    return `${((summary.withPin / summary.searches) * 100).toFixed(0)}%`;
  }, [summary.searches, summary.withPin]);

  const points = useMemo(() => garagesToPoints(report.garages), [report.garages]);

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Pincodes</h2>
          <p className="mt-1 max-w-3xl text-xs text-slate-500">
            The passenger end of the trip, from the PIN in the address. Nearby PINs within{" "}
            {summary.clusterKm} km are one garage. Trips longer than {pinKm} km stay off this table.
            {summary.focusPin
              ? ` A PIN search includes every distance, not only trips within ${pinKm} km.`
              : ""}
            {summary.droppedPins.length
              ? ` Airport PIN ${summary.droppedPins.join(", ")} is left off.`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            PIN
            <input
              value={pinQuery}
              inputMode="numeric"
              maxLength={6}
              placeholder="452009"
              onChange={(event) =>
                onPinQueryChange(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Within
            <select
              value={pinKm}
              onChange={(event) => onPinKmChange(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
            >
              {[40, 80, 120].map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {summary.focusPin
          ? `${summary.focusPin}: ${formatCount(summary.searches)} searches in this date range.`
          : `${formatCount(summary.withPin)} of ${formatCount(summary.searches)} searches have a PIN (${coverage}). ${formatCount(summary.plotted)} are in this table.`}
        {summary.truncated ? " The table keeps the 200 busiest PINs." : ""}
      </p>
      {summary.focusPin && report.pins[0]?.sampleAddress ? (
        <p className="mb-3 text-xs text-slate-500">{report.pins[0].sampleAddress}</p>
      ) : null}
      {points.length > 0 ? (
        <div className="mb-4">
          <PinDensityMap
            title={
              summary.focusPin
                ? `PIN ${summary.focusPin}`
                : `${airportLabel || "Airport"} demand by PIN`
            }
            subtitle={
              summary.focusPin
                ? `${formatCount(summary.searches)} searches in this date range`
                : `${formatCount(summary.plotted)} searches · spots within ${summary.clusterKm} km`
            }
            points={points}
          />
        </div>
      ) : null}
      {report.pins.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {summary.focusPin
            ? `No searches for ${summary.focusPin}${
                airportLabel ? ` at ${airportLabel}` : ""
              } in this date range. Journey type and travel type still apply.${
                airportLabel ? " Clear the airport to search every city." : ""
              }`
            : `No pincodes within ${pinKm} km for this airport.`}
        </p>
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-medium">Garage</th>
                <th className="px-2 py-2 text-right font-medium">Searches</th>
                <th className="px-2 py-2 text-right font-medium">Per day</th>
                <th className="px-2 py-2 text-right font-medium">Avg km</th>
                <th className="px-2 py-2 text-right font-medium">Avg fare</th>
              </tr>
            </thead>
            <tbody>
              {report.garages.map((garage) => (
                <tr key={garage.pin} className="border-b border-slate-100">
                  <td className="px-2 py-2">
                    <div className="font-medium text-slate-800">
                      {garage.label} · {garage.pin}
                    </div>
                    <div className="text-xs text-slate-500">{garage.pins.join(", ")}</div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatCount(garage.searches)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{garage.searchesPerDay.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {garage.avgKm == null ? "—" : formatCount(garage.avgKm)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatFare(garage.avgFare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
