import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, volumeColor, volumeOpacity } from "./MapPin";
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

export type DensityPoint = {
  id: string;
  label: string;
  pin: string;
  searches: number;
  searchesPerDay: number;
  avgKm: number | null;
  avgFare: number | null;
  lat: number;
  lng: number;
  pins?: string[];
};

type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const MIN_ZOOM = 4;
const MAX_ZOOM = 15;

const inr = new Intl.NumberFormat("en-IN");

const formatFare = (fare: number | null) =>
  fare == null ? "—" : `₹${inr.format(Math.round(fare))}`;

const boundsOf = (points: DensityPoint[]): Bounds => {
  if (!points.length) {
    return { minLat: 18.4, maxLat: 19.4, minLng: 72.6, maxLng: 73.2 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  points.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latSpan = Math.max(maxLat - minLat, 0.36);
  const lngSpan = Math.max(maxLng - minLng, 0.36);
  return {
    minLat: midLat - latSpan / 2 - latSpan * 0.12,
    maxLat: midLat + latSpan / 2 + latSpan * 0.12,
    minLng: midLng - lngSpan / 2 - lngSpan * 0.12,
    maxLng: midLng + lngSpan / 2 + lngSpan * 0.12,
  };
};

const zoomToFit = (bounds: Bounds, width: number, height: number) => {
  const pad = 48;
  for (let zoom = 13; zoom >= 5; zoom -= 1) {
    const nw = mercator(bounds.maxLat, bounds.minLng, zoom);
    const se = mercator(bounds.minLat, bounds.maxLng, zoom);
    if (se.x - nw.x <= width - pad * 2 && se.y - nw.y <= height - pad * 2) return zoom;
  }
  return 5;
};

export const PinDensityMap = ({
  title,
  subtitle,
  points,
  fill = false,
  selectedId: selectedIdProp,
  onSelect,
}: {
  title: string;
  subtitle: string;
  points: DensityPoint[];
  fill?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const fullscreen = useMapFullscreen(shellRef);
  const [size, setSize] = useState({ w: 760, h: 640 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { basemap, selectBasemap } = useMapBasemap();
  const [innerId, setInnerId] = useState<string | null>(null);
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : innerId;
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const choose = (id: string | null) => {
    onSelect?.(id);
    if (selectedIdProp === undefined) setInnerId(id);
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () =>
      setSize({
        w: Math.max(frame.clientWidth, 320),
        h: Math.max(frame.clientHeight, 320),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => boundsOf(points), [points]);
  const fitZoom = useMemo(() => zoomToFit(bounds, size.w, size.h), [bounds, size.w, size.h]);
  const fitCenter = useMemo(
    () => visualCenter(bounds.maxLat, bounds.minLng, bounds.minLat, bounds.maxLng, fitZoom),
    [bounds, fitZoom],
  );
  const resetKey = `${bounds.minLat.toFixed(3)}|${bounds.maxLat.toFixed(3)}|${bounds.minLng.toFixed(3)}|${bounds.maxLng.toFixed(3)}`;
  const map = useMapViewport({
    width: size.w,
    height: size.h,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    fitZoom,
    fitCenter,
    resetKey,
    basemap,
  });

  const previousSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      if (previousSelection.current) map.reset();
      previousSelection.current = null;
      return;
    }
    previousSelection.current = selectedId;
    const point = pointsRef.current.find((item) => item.id === selectedId);
    if (!point) return;
    map.focusBounds([{ lat: point.lat, lng: point.lng }], { minSpan: 0.16, pad: 100 });
  }, [selectedId, size.w, size.h, map.focusBounds, map.reset]);

  const view = useMemo(() => {
    const maxSearches = points.reduce((max, point) => Math.max(max, point.searches), 1);
    const drawn = points
      .map((point) => {
        const [x, y] = map.project(point.lat, point.lng);
        const ratio = point.searches / maxSearches;
        return {
          point,
          x,
          y,
          ratio,
          color: volumeColor(ratio),
          opacity: volumeOpacity(ratio),
          scale: 0.78 + Math.sqrt(ratio) * 0.42,
        };
      })
      .sort((a, b) => a.point.searches - b.point.searches);

    const labels: typeof drawn = [];
    [...drawn]
      .sort((a, b) => b.point.searches - a.point.searches)
      .forEach((item) => {
        if (labels.length >= 20) return;
        const crowded = labels.some(
          (placed) => Math.hypot(placed.x - item.x, placed.y - item.y) < 22,
        );
        if (!crowded) labels.push(item);
      });

    return { drawn, labels, maxSearches };
  }, [map.project, points]);

  const hovered = view.drawn.find((item) => item.point.id === hoveredId) ?? null;
  const resetView = () => {
    choose(null);
    map.reset();
  };

  return (
    <div
      ref={shellRef}
      className={`flex flex-col overflow-hidden rounded-2xl border ${basemapShellClass(basemap)} ${
        fullscreen.active ? "h-screen w-screen" : fill ? "h-full min-h-0" : ""
      }`}
    >
      {!fullscreen.active && (
        <div className="shrink-0 border-b border-[#c5d5e4] bg-white px-4 py-2">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <div className="text-[11px] text-slate-500">{subtitle}</div>
        </div>
      )}

      <div
        ref={frameRef}
        className={`relative w-full ${fill || fullscreen.active ? "min-h-0 flex-1" : "h-[640px]"}`}
      >
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
            aria-label={title}
          >
            {view.drawn.map((item) => {
              const active = hoveredId === item.point.id || selectedId === item.point.id;
              return (
                <g
                  key={item.point.id}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    if (map.dragging) return;
                    setHoveredId(item.point.id);
                  }}
                  onMouseLeave={() =>
                    setHoveredId((current) => (current === item.point.id ? null : current))
                  }
                  onClick={() => {
                    if (map.ignoreClick()) return;
                    choose(selectedId === item.point.id ? null : item.point.id);
                  }}
                >
                  <circle cx={item.x} cy={item.y - 10} r={14} fill="transparent" />
                  <MapPin
                    x={item.x}
                    y={item.y}
                    color={item.color}
                    opacity={active ? 1 : item.opacity}
                    scale={active ? item.scale + 0.2 : item.scale}
                  />
                </g>
              );
            })}
            {view.labels.map((item) => (
              <text
                key={`${item.point.id}-label`}
                x={item.x}
                y={item.y - 18 * item.scale - 6}
                textAnchor="middle"
                fill="#1f2933"
                fontSize={12}
                fontWeight={700}
                fontFamily="Segoe UI, sans-serif"
                stroke="#ffffff"
                strokeWidth={3}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {item.point.label}
              </text>
            ))}
            {view.drawn
              .filter((item) => item.point.id === selectedId && !view.labels.some((label) => label.point.id === item.point.id))
              .map((item) => (
                <text
                  key={`${item.point.id}-selected`}
                  x={item.x}
                  y={item.y - 18 * item.scale - 6}
                  textAnchor="middle"
                  fill="#1f2933"
                  fontSize={12}
                  fontWeight={700}
                  fontFamily="Segoe UI, sans-serif"
                  stroke="#ffffff"
                  strokeWidth={3}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {item.point.label}
                </text>
              ))}
          </svg>
        </div>

        <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
          <MapZoomControls
            onZoomIn={map.zoomIn}
            onZoomOut={map.zoomOut}
            onReset={resetView}
            canZoomIn={map.canZoomIn}
            canZoomOut={map.canZoomOut}
            onToggleFullscreen={fullscreen.toggle}
            fullscreenActive={fullscreen.active}
          />
          <MapBasemapToggle basemap={basemap} onChange={selectBasemap} />
        </div>

        <div className="absolute bottom-3 left-3 z-10 rounded-xl bg-white/95 px-3 py-2 shadow-md">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Search volume
          </div>
          <div
            className="h-2 w-36 rounded-full"
            style={{
              background: "linear-gradient(90deg, rgb(156,214,146), rgb(232,184,32), rgb(239,125,18), rgb(140,16,22))",
            }}
          />
          <div className="mt-1 flex w-36 justify-between text-[10px] text-slate-500">
            <span>Fewer</span>
            <span>More</span>
          </div>
        </div>

        <div className="absolute bottom-3 right-3 z-10 text-[10px] text-slate-500">{basemapCredit(basemap)}</div>

        {hovered && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[240px] rounded-lg bg-[#16324f] px-3 py-2 text-white shadow-lg">
            <div className="text-sm font-semibold">
              {hovered.point.label} · {hovered.point.pin}
            </div>
            <div className="mt-1 text-xs text-white/80">
              {inr.format(hovered.point.searches)} searches · {hovered.point.searchesPerDay.toFixed(1)}/day
            </div>
            <div className="text-xs text-white/80">
              {hovered.point.avgKm == null ? "—" : `${inr.format(hovered.point.avgKm)} km`} ·{" "}
              {formatFare(hovered.point.avgFare)}
            </div>
            {hovered.point.pins && hovered.point.pins.length > 1 ? (
              <div className="mt-1 text-[11px] leading-snug text-white/70">
                {hovered.point.pins.join(", ")}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
