import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "./MapPin";
import { MapBasemapToggle, MapZoomControls, useMapFullscreen } from "./MapZoomControls";
import {
  TILE,
  basemapCredit,
  basemapShellClass,
  mercator,
  useMapBasemap,
  useMapViewport,
  visualCenter,
} from "./mapViewport";

export type MetroRoute = {
  city: string;
  route: string;
  searches: number;
  searchesPerDay: number;
  avgKm: number;
  minFare: number | null;
  /** minFare ÷ avgKm; null when either side is missing */
  perKmRate: number | null;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
};

const METRO_ORDER = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Pune",
  "Chennai",
  "Hyderabad",
  "Ahmedabad",
  "Chandigarh",
  "Kochi",
  "Lucknow",
  "Kolkata",
] as const;

const METRO_COLORS: Record<string, string> = {
  Delhi: "#e23d3d",
  Mumbai: "#2f6bff",
  Bengaluru: "#1f9d57",
  Pune: "#f08a12",
  Chennai: "#e6a317",
  Hyderabad: "#149a9a",
  Ahmedabad: "#7a3ff2",
  Chandigarh: "#6d4c2d",
  Kochi: "#20c0d4",
  Lucknow: "#e84393",
  Kolkata: "#1d4e89",
};

const INDIA = { minLat: 6.4, maxLat: 36.6, minLng: 68.2, maxLng: 97.2 };
const MIN_ZOOM = 4;
const MAX_ZOOM = 13;

const METRO_LABEL: Record<
  string,
  { dx: number; dy: number; anchor: "start" | "end" | "middle" }
> = {
  Delhi: { dx: 12, dy: -6, anchor: "start" },
  Mumbai: { dx: -10, dy: 14, anchor: "end" },
  Bengaluru: { dx: -14, dy: -14, anchor: "end" },
  Pune: { dx: 12, dy: -10, anchor: "start" },
  Chennai: { dx: 12, dy: 2, anchor: "start" },
  Hyderabad: { dx: 12, dy: 14, anchor: "start" },
  Ahmedabad: { dx: -12, dy: -4, anchor: "end" },
  Chandigarh: { dx: 0, dy: 16, anchor: "middle" },
  Kochi: { dx: -12, dy: 14, anchor: "end" },
  Lucknow: { dx: 0, dy: -18, anchor: "middle" },
  Kolkata: { dx: 12, dy: -4, anchor: "start" },
};

const routeKey = (row: MetroRoute) => `${row.city}::${row.route}`;

const inr = new Intl.NumberFormat("en-IN");

const formatFare = (fare: number | null) =>
  fare == null ? "—" : `₹${inr.format(fare)}`;

const formatMinFare = (fare: number | null) =>
  fare == null ? "—" : `from ${formatFare(fare)}`;

const formatPerKm = (rate: number | null) =>
  rate == null ? "—" : `₹${rate.toFixed(1)}/km`;

const formatPerDay = (value: number) => (value > 0 ? value.toFixed(1) : "<0.1");

const perKmOf = (row: MetroRoute): number | null => {
  if (row.perKmRate != null && Number.isFinite(row.perKmRate)) return row.perKmRate;
  if (row.minFare == null || !row.avgKm) return null;
  return Math.round((row.minFare / row.avgKm) * 10) / 10;
};

const zoomToFit = (width: number, height: number) => {
  const pad = 28;
  for (let zoom = 6; zoom >= MIN_ZOOM; zoom -= 1) {
    const nw = mercator(INDIA.maxLat, INDIA.minLng, zoom);
    const se = mercator(INDIA.minLat, INDIA.maxLng, zoom);
    if (se.x - nw.x <= width - pad && se.y - nw.y <= height - pad) return zoom;
  }
  return MIN_ZOOM;
};

const curvePath = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(70, len * 0.18);
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

const lineInk = (hex: string, ratio: number) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const mix = 0.16 + Math.min(1, Math.max(0, ratio)) * 0.84;
  const mixed = channels.map((channel) => Math.round(255 + (channel - 255) * mix));
  return `rgb(${mixed.join(",")})`;
};

type Frame =
  | { kind: "india" }
  | { kind: "city"; city: string }
  | { kind: "route"; key: string; city: string };

type IndiaRouteMapProps = {
  routes: MetroRoute[];
  from: string;
  to: string;
  maxKm: number;
  limit?: number;
  className?: string;
  onCityChange?: (city: string | null) => void;
};

export const IndiaRouteMap = ({
  routes,
  from,
  to,
  maxKm,
  limit = 20,
  className = "",
  onCityChange,
}: IndiaRouteMapProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const fullscreen = useMapFullscreen(shellRef);
  const [size, setSize] = useState({ w: 960, h: 640 });
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [frame, setFrame] = useState<Frame>({ kind: "india" });
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const { basemap, selectBasemap } = useMapBasemap();
  const focusRequest = useRef<{
    points: { lat: number; lng: number }[];
    minSpan: number;
    pad: number;
  } | null>(null);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () =>
      setSize({
        w: Math.max(node.clientWidth, 320),
        h: Math.max(node.clientHeight, 360),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fitZoom = useMemo(() => zoomToFit(size.w, size.h), [size.w, size.h]);
  const fitCenter = useMemo(
    () => visualCenter(INDIA.maxLat, INDIA.minLng, INDIA.minLat, INDIA.maxLng, fitZoom),
    [fitZoom],
  );
  const map = useMapViewport({
    width: size.w,
    height: size.h,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    fitZoom,
    fitCenter,
    basemap,
  });

  const peakByCity = useMemo(() => {
    const peaks = new Map<string, number>();
    routes.forEach((row) => {
      peaks.set(row.city, Math.max(peaks.get(row.city) ?? 0, row.searches));
    });
    return peaks;
  }, [routes]);

  const strengthOf = (row: MetroRoute) => {
    const peak = peakByCity.get(row.city) || 1;
    return peak > 0 ? row.searches / peak : 0;
  };

  const showIndia = () => {
    focusRequest.current = null;
    setSelectedCity(null);
    setFrame({ kind: "india" });
    map.reset();
  };

  const focusCity = (city: string) => {
    const points = routes
      .filter((row) => row.city === city)
      .flatMap((row) => [
        { lat: row.originLat, lng: row.originLng },
        { lat: row.destLat, lng: row.destLng },
      ]);
    const request = { points, minSpan: 0.85, pad: 80 };
    focusRequest.current = request;
    map.focusBounds(points, { minSpan: request.minSpan, pad: request.pad });
  };

  useEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    map.focusBounds(request.points, { minSpan: request.minSpan, pad: request.pad });
  }, [size.w, size.h, map.focusBounds]);

  const openCity = (city: string) => {
    if (frame.kind === "city" && frame.city === city) {
      showIndia();
      return;
    }
    setSelectedCity(city);
    setFrame({ kind: "city", city });
    onCityChange?.(city);
    focusCity(city);
  };

  const openRoute = (row: MetroRoute) => {
    const key = routeKey(row);
    if (frame.kind === "route" && frame.key === key) {
      setSelectedCity(row.city);
      setFrame({ kind: "city", city: row.city });
      focusCity(row.city);
      return;
    }
    setSelectedCity(row.city);
    setFrame({ kind: "route", key, city: row.city });
    onCityChange?.(row.city);
    const request = {
      points: [
        { lat: row.originLat, lng: row.originLng },
        { lat: row.destLat, lng: row.destLng },
      ],
      minSpan: 0.55,
      pad: 96,
    };
    focusRequest.current = request;
    map.focusBounds(request.points, { minSpan: request.minSpan, pad: request.pad });
  };

  const drawn = useMemo(
    () =>
      routes
        .map((row) => {
          const [x1, y1] = map.project(row.originLat, row.originLng);
          const [x2, y2] = map.project(row.destLat, row.destLng);
          return { row, x1, y1, x2, y2, d: curvePath(x1, y1, x2, y2) };
        })
        .filter((item) => Math.hypot(item.x2 - item.x1, item.y2 - item.y1) > 2)
        .sort((a, b) => a.row.searches - b.row.searches),
    [routes, map.project],
  );

  const visibleLabels = useMemo(() => {
    const placed: { x: number; y: number; r: number }[] = [];
    const source = selectedCity ? drawn.filter((item) => item.row.city === selectedCity) : drawn;
    METRO_ORDER.forEach((city) => {
      if (selectedCity && city !== selectedCity) return;
      const origin = routes.find((row) => row.city === city);
      if (!origin) return;
      const [x, y] = map.project(origin.originLat, origin.originLng);
      placed.push({ x, y: y - 12, r: 18 });
    });

    const keep = new Set<string>();
    [...source]
      .sort((a, b) => b.row.searches - a.row.searches)
      .forEach((item) => {
        if (!selectedCity && keep.size >= limit) return;
        const key = routeKey(item.row);
        if (selectedCity) {
          keep.add(key);
          return;
        }
        const dx = item.x2 - item.x1;
        const dy = item.y2 - item.y1;
        const len = Math.hypot(dx, dy) || 1;
        const x = item.x2 + (dx / len) * 14;
        const y = item.y2 + (dy / len) * 8;
        const crowded = placed.some(
          (point) => Math.hypot(point.x - x, point.y - y) < point.r + 12,
        );
        if (!crowded) {
          keep.add(key);
          placed.push({ x, y, r: 14 });
        }
      });
    return keep;
  }, [drawn, limit, map.project, routes, selectedCity]);

  const metrosOnMap = METRO_ORDER.filter((city) =>
    routes.some((row) => row.city === city),
  );
  const panelCity =
    selectedCity ??
    drawn.find((item) => routeKey(item.row) === hoveredKey)?.row.city ??
    null;
  const panelRoutes = (
    panelCity
      ? routes.filter((row) => row.city === panelCity)
      : [...routes].sort((a, b) => b.searches - a.searches).slice(0, limit)
  ).sort((a, b) => b.searches - a.searches);
  const hovered = drawn.find((item) => routeKey(item.row) === hoveredKey) ?? null;
  const focusedKey = frame.kind === "route" ? frame.key : null;

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="mb-2 flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-slate-800">
          Top {limit} searched routes from metro cities
        </h2>
        <p className="text-xs text-slate-500">
          {from} to {to} · up to {maxKm} km · darker, thicker line is more searches · click a city
          or a route to zoom
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1">
        <div
          ref={shellRef}
          className={`relative min-h-0 overflow-hidden rounded-2xl border shadow-sm ${basemapShellClass(basemap)} ${
            fullscreen.active ? "h-screen w-screen" : "h-full"
          }`}
        >
          <div ref={frameRef} className="absolute inset-0">
            <div
              ref={map.surfaceRef}
              className={`absolute inset-0 touch-none select-none overflow-hidden ${
                map.dragging ? "cursor-grabbing [&_*]:!cursor-grabbing" : "cursor-grab"
              }`}
              {...map.surfaceProps}
            >
              {map.tiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.href}
                  alt=""
                  width={TILE}
                  height={TILE}
                  className="pointer-events-none absolute max-w-none"
                  style={{ left: tile.left, top: tile.top }}
                  draggable={false}
                />
              ))}
              <svg
                width={size.w}
                height={size.h}
                className="absolute left-0 top-0"
                role="img"
                aria-label="India map of top searched outstation routes"
              >
                {drawn.map((item) => {
                  const key = routeKey(item.row);
                  const ratio = strengthOf(item.row);
                  const active = hoveredKey === key || focusedKey === key;
                  const dimmed = selectedCity != null && item.row.city !== selectedCity && hoveredKey !== key;
                  const color = lineInk(METRO_COLORS[item.row.city] ?? "#334155", ratio);
                  const width = (active ? 2.4 : 1.15) + Math.pow(ratio, 0.72) * 3.5;
                  return (
                    <g key={key}>
                      <path
                        d={item.d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                        className="cursor-pointer"
                        onMouseEnter={() => {
                          if (map.dragging) return;
                          setHoveredKey(key);
                        }}
                        onMouseLeave={() => setHoveredKey((current) => (current === key ? null : current))}
                        onClick={() => {
                          if (map.ignoreClick()) return;
                          openRoute(item.row);
                        }}
                      />
                      <path
                        d={item.d}
                        fill="none"
                        stroke={color}
                        strokeWidth={width}
                        strokeLinecap="round"
                        opacity={dimmed ? 0.1 : 0.95}
                        pointerEvents="none"
                      />
                    </g>
                  );
                })}

                {drawn.map((item) => {
                  const key = routeKey(item.row);
                  const ratio = strengthOf(item.row);
                  const color = lineInk(METRO_COLORS[item.row.city] ?? "#334155", ratio);
                  const dimmed = selectedCity != null && item.row.city !== selectedCity;
                  const dx = item.x2 - item.x1;
                  const dy = item.y2 - item.y1;
                  const len = Math.hypot(dx, dy) || 1;
                  const labelX = item.x2 + (dx / len) * 14;
                  const labelY = item.y2 + (dy / len) * 8;
                  const showLabel =
                    visibleLabels.has(key) || hoveredKey === key || focusedKey === key;
                  return (
                    <g
                      key={`${key}-pin`}
                      className="cursor-pointer"
                      opacity={dimmed ? 0.2 : 1}
                      onClick={() => {
                        if (map.ignoreClick()) return;
                        openRoute(item.row);
                      }}
                      onMouseEnter={() => {
                        if (map.dragging) return;
                        setHoveredKey(key);
                      }}
                      onMouseLeave={() => setHoveredKey((current) => (current === key ? null : current))}
                    >
                      <circle cx={item.x2} cy={item.y2 - 8} r={12} fill="transparent" />
                      <MapPin x={item.x2} y={item.y2} color={color} scale={0.72 + ratio * 0.38} />
                      {showLabel && (
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor={dx >= 0 ? "start" : "end"}
                          fill={METRO_COLORS[item.row.city] ?? "#334155"}
                          fontSize={11}
                          fontWeight={ratio > 0.55 ? 800 : 700}
                          fontFamily="Segoe UI, sans-serif"
                          stroke="#ffffff"
                          strokeWidth={3}
                          paintOrder="stroke"
                          pointerEvents="none"
                        >
                          {item.row.route}
                        </text>
                      )}
                    </g>
                  );
                })}

                {metrosOnMap.map((city) => {
                  const origin = routes.find((row) => row.city === city);
                  if (!origin) return null;
                  const [x, y] = map.project(origin.originLat, origin.originLng);
                  const label = METRO_LABEL[city] ?? { dx: 12, dy: -6, anchor: "start" as const };
                  const color = METRO_COLORS[city];
                  const selected = selectedCity === city;
                  return (
                    <g
                      key={city}
                      className="cursor-pointer"
                      onClick={() => {
                        if (map.ignoreClick()) return;
                        openCity(city);
                      }}
                    >
                      <circle cx={x} cy={y - 10} r={16} fill="transparent" />
                      <MapPin x={x} y={y} color={color} scale={selected ? 1.25 : 1.05} />
                      <text
                        x={x + label.dx}
                        y={y + label.dy}
                        textAnchor={label.anchor}
                        dominantBaseline="middle"
                        fill="#1f2933"
                        fontSize={13}
                        fontWeight={700}
                        fontFamily="Segoe UI, sans-serif"
                        stroke="#ffffff"
                        strokeWidth={4}
                        paintOrder="stroke"
                        pointerEvents="none"
                      >
                        {city}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
            <MapZoomControls
              onZoomIn={map.zoomIn}
              onZoomOut={map.zoomOut}
              onReset={showIndia}
              canZoomIn={map.canZoomIn}
              canZoomOut={map.canZoomOut}
              onToggleFullscreen={fullscreen.toggle}
              fullscreenActive={fullscreen.active}
            />
            <MapBasemapToggle basemap={basemap} onChange={selectBasemap} />
          </div>

          {selectedCity && (
            <button
              type="button"
              onClick={showIndia}
              className="absolute right-16 top-3 z-30 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-md hover:bg-white"
            >
              All India
            </button>
          )}

          <div className="absolute bottom-3 left-3 z-10 text-[10px] text-slate-500">{basemapCredit(basemap)}</div>

          {hovered && (
            <div className="pointer-events-none absolute bottom-8 left-3 z-20 rounded-lg bg-[#16324f] px-3 py-2 text-white shadow-lg">
              <div className="text-sm font-semibold">
                {hovered.row.city} → {hovered.row.route}
              </div>
              <div className="mt-1 text-xs text-white/80">
                {inr.format(hovered.row.searches)} searches · {formatPerDay(hovered.row.searchesPerDay)}/day
              </div>
              <div className="text-xs text-white/80">
                {inr.format(hovered.row.avgKm)} km · {formatMinFare(hovered.row.minFare)} ·{" "}
                {formatPerKm(perKmOf(hovered.row))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex h-[min(520px,55vh)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full">
          <div className="shrink-0 border-b border-slate-100 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Metro cities
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {METRO_ORDER.map((city) => {
                const present = metrosOnMap.includes(city);
                const active = selectedCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    disabled={!present}
                    onClick={() => openCity(city)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
                      active ? "bg-slate-800 font-semibold text-white" : "bg-slate-50 text-slate-700"
                    } ${present ? "" : "text-slate-300"}`}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: present ? METRO_COLORS[city] : "#d6dde6" }}
                    />
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">
              {panelCity ? `${panelCity} · ${panelRoutes.length} routes` : `Top ${panelRoutes.length} routes`}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {panelCity
                ? "All routes for this city, busiest first. Click one to frame that highway."
                : "Busiest routes across metros. Click a city to see its own top 20."}
            </p>
            <ul className="mt-3 divide-y divide-slate-100">
              {panelRoutes.map((row, index) => {
                const key = routeKey(row);
                const active = hoveredKey === key || focusedKey === key;
                const ratio = strengthOf(row);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={`w-full py-2 text-left ${active ? "bg-slate-50" : ""}`}
                      onMouseEnter={() => setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey((current) => (current === key ? null : current))}
                      onClick={() => openRoute(row)}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">
                            {index + 1}
                          </span>
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              background: lineInk(METRO_COLORS[row.city] ?? "#334155", ratio),
                            }}
                          />
                          {panelCity ? row.route : `${row.city} → ${row.route}`}
                        </span>
                        <span className="text-sm tabular-nums text-slate-700">
                          {formatMinFare(row.minFare)}
                        </span>
                      </div>
                      <div className="mt-0.5 pl-6 text-xs text-slate-500">
                        {inr.format(row.searches)} searches · {formatPerDay(row.searchesPerDay)}/day ·{" "}
                        {inr.format(row.avgKm)} km · {formatPerKm(perKmOf(row))}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
