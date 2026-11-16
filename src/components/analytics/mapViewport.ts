import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export const TILE = 256;

export const mercator = (lat: number, lng: number, zoom: number) => {
  const scale = TILE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const clamped = Math.max(Math.min(lat, 85), -85);
  const rad = (clamped * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale;
  return { x, y };
};

export const unmercator = (x: number, y: number, zoom: number) => {
  const scale = TILE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
};

export const visualCenter = (
  north: number,
  west: number,
  south: number,
  east: number,
  zoom: number,
) => {
  const nw = mercator(north, west, zoom);
  const se = mercator(south, east, zoom);
  return unmercator((nw.x + se.x) / 2, (nw.y + se.y) / 2, zoom);
};

export type MapBasemap = "terrain" | "plain";

export type MapTile = { key: string; href: string; left: number; top: number };

const BASEMAP_KEY = "ops-map-basemap";

const readBasemap = (): MapBasemap => {
  try {
    return localStorage.getItem(BASEMAP_KEY) === "terrain" ? "terrain" : "plain";
  } catch {
    return "plain";
  }
};

let basemapValue: MapBasemap = readBasemap();
const basemapListeners = new Set<(value: MapBasemap) => void>();

export const useMapBasemap = () => {
  const [basemap, setBasemap] = useState(basemapValue);

  useEffect(() => {
    const listener = (value: MapBasemap) => setBasemap(value);
    basemapListeners.add(listener);
    setBasemap(basemapValue);
    return () => {
      basemapListeners.delete(listener);
    };
  }, []);

  const selectBasemap = useCallback((next: MapBasemap) => {
    basemapValue = next;
    try {
      localStorage.setItem(BASEMAP_KEY, next);
    } catch {
      /* private browsing */
    }
    basemapListeners.forEach((listener) => listener(next));
  }, []);

  return { basemap, selectBasemap };
};

const tileHref = (basemap: MapBasemap, zoom: number, x: number, y: number) => {
  if (basemap === "plain") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${zoom}/${y}/${x}`;
  }
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
};

export const basemapCredit = (basemap: MapBasemap) =>
  basemap === "plain" ? "© Esri" : "© OpenStreetMap";

export const basemapShellClass = (basemap: MapBasemap) =>
  basemap === "plain"
    ? "border-[#e4e4e4] bg-[#f3f3f3]"
    : "border-[#c5d5e4] bg-[#d5e4f0]";

export const tilesForView = (
  zoom: number,
  topLeft: { x: number; y: number },
  width: number,
  height: number,
  basemap: MapBasemap = "plain",
) => {
  const maxTile = 2 ** zoom;
  const x0 = Math.floor(topLeft.x / TILE);
  const y0 = Math.floor(topLeft.y / TILE);
  const x1 = Math.floor((topLeft.x + width) / TILE);
  const y1 = Math.floor((topLeft.y + height) / TILE);
  const tiles: MapTile[] = [];
  for (let x = x0; x <= x1; x += 1) {
    const wrapped = ((x % maxTile) + maxTile) % maxTile;
    for (let y = y0; y <= y1; y += 1) {
      if (y < 0 || y >= maxTile) continue;
      tiles.push({
        key: `${basemap}-${zoom}-${x}-${y}`,
        href: tileHref(basemap, zoom, wrapped, y),
        left: x * TILE - topLeft.x,
        top: y * TILE - topLeft.y,
      });
    }
  }
  return tiles;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type LatLng = { lat: number; lng: number };

type ViewState = {
  zoom: number;
  lat: number;
  lng: number;
  topLeftX: number;
  topLeftY: number;
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
};

export const useMapViewport = ({
  width,
  height,
  minZoom,
  maxZoom,
  fitZoom,
  fitCenter,
  resetKey,
  basemap = "plain",
}: {
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
  fitZoom: number;
  fitCenter: LatLng;
  resetKey?: string;
  basemap?: MapBasemap;
}) => {
  const [manual, setManual] = useState<{ zoom: number; lat: number; lng: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    lat: number;
    lng: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const ignoreClickRef = useRef(false);
  const wheelAccumRef = useRef(0);

  useEffect(() => {
    setManual(null);
  }, [resetKey]);

  const zoom = clamp(Math.round(manual?.zoom ?? fitZoom), minZoom, maxZoom);
  const lat = manual?.lat ?? fitCenter.lat;
  const lng = manual?.lng ?? fitCenter.lng;
  const center = mercator(lat, lng, zoom);
  const topLeft = { x: center.x - width / 2, y: center.y - height / 2 };

  const stateRef = useRef<ViewState>({
    zoom,
    lat,
    lng,
    topLeftX: topLeft.x,
    topLeftY: topLeft.y,
    width,
    height,
    minZoom,
    maxZoom,
  });
  stateRef.current = {
    zoom,
    lat,
    lng,
    topLeftX: topLeft.x,
    topLeftY: topLeft.y,
    width,
    height,
    minZoom,
    maxZoom,
  };
  const fitRef = useRef({ zoom, lat: fitCenter.lat, lng: fitCenter.lng, width, height });
  fitRef.current = {
    zoom: clamp(Math.round(fitZoom), minZoom, maxZoom),
    lat: fitCenter.lat,
    lng: fitCenter.lng,
    width,
    height,
  };

  const commitView = useCallback((nextZoom: number, nextLat: number, nextLng: number) => {
    const state = stateRef.current;
    const centerPx = mercator(nextLat, nextLng, nextZoom);
    stateRef.current = {
      ...state,
      zoom: nextZoom,
      lat: nextLat,
      lng: nextLng,
      topLeftX: centerPx.x - state.width / 2,
      topLeftY: centerPx.y - state.height / 2,
    };
    setManual({ zoom: nextZoom, lat: nextLat, lng: nextLng });
  }, []);

  const zoomToward = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const state = stateRef.current;
    const bounded = clamp(nextZoom, state.minZoom, state.maxZoom);
    if (bounded === state.zoom) return;
    const el = surfaceRef.current;
    if (!el) {
      commitView(bounded, state.lat, state.lng);
      return;
    }
    const rect = el.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const under = unmercator(state.topLeftX + localX, state.topLeftY + localY, state.zoom);
    const nextWorld = mercator(under.lat, under.lng, bounded);
    const nextCenter = unmercator(
      nextWorld.x - localX + state.width / 2,
      nextWorld.y - localY + state.height / 2,
      bounded,
    );
    commitView(bounded, nextCenter.lat, nextCenter.lng);
  }, [commitView]);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const state = stateRef.current;
      let steps = 0;
      if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || Math.abs(event.deltaY) >= 40) {
        steps = event.deltaY > 0 ? -1 : 1;
        wheelAccumRef.current = 0;
      } else {
        wheelAccumRef.current += event.deltaY;
        if (Math.abs(wheelAccumRef.current) < 50) return;
        steps = wheelAccumRef.current > 0 ? -1 : 1;
        wheelAccumRef.current = 0;
      }
      const next = state.zoom + steps;
      if (next === state.zoom) return;
      zoomToward(next, event.clientX, event.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomToward, width, height]);

  const zoomBy = useCallback((step: number) => {
    const state = stateRef.current;
    const next = clamp(state.zoom + step, state.minZoom, state.maxZoom);
    if (next === state.zoom) return;
    commitView(next, state.lat, state.lng);
  }, [commitView]);

  const zoomIn = useCallback(() => zoomBy(1), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(-1), [zoomBy]);
  const reset = useCallback(() => {
    const fit = fitRef.current;
    const centerPx = mercator(fit.lat, fit.lng, fit.zoom);
    stateRef.current = {
      ...stateRef.current,
      zoom: fit.zoom,
      lat: fit.lat,
      lng: fit.lng,
      topLeftX: centerPx.x - fit.width / 2,
      topLeftY: centerPx.y - fit.height / 2,
      width: fit.width,
      height: fit.height,
    };
    setManual(null);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const state = stateRef.current;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      lat: state.lat,
      lng: state.lng,
      moved: false,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    const state = stateRef.current;
    const start = mercator(drag.lat, drag.lng, state.zoom);
    const next = unmercator(start.x - dx, start.y - dy, state.zoom);
    commitView(state.zoom, next.lat, next.lng);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) {
      ignoreClickRef.current = true;
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const ignoreClick = () => {
    if (!ignoreClickRef.current) return false;
    ignoreClickRef.current = false;
    return true;
  };

  const focusBounds = useCallback(
    (
      points: { lat: number; lng: number }[],
      options?: { minSpan?: number; pad?: number },
    ) => {
      if (!points.length) return;
      const minSpan = options?.minSpan ?? 0.45;
      const pad = options?.pad ?? 72;
      let north = -Infinity;
      let south = Infinity;
      let east = -Infinity;
      let west = Infinity;
      points.forEach((point) => {
        if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
        north = Math.max(north, point.lat);
        south = Math.min(south, point.lat);
        east = Math.max(east, point.lng);
        west = Math.min(west, point.lng);
      });
      if (!Number.isFinite(north)) return;

      const midLat = (north + south) / 2;
      const midLng = (east + west) / 2;
      const latSpan = Math.max(north - south, minSpan);
      const lngSpan = Math.max(east - west, minSpan);
      const margin = 1.22;
      north = midLat + (latSpan / 2) * margin;
      south = midLat - (latSpan / 2) * margin;
      east = midLng + (lngSpan / 2) * margin;
      west = midLng - (lngSpan / 2) * margin;

      const state = stateRef.current;
      const roomW = Math.max(state.width - pad, 120);
      const roomH = Math.max(state.height - pad, 120);
      let chosen = state.minZoom;
      for (let nextZoom = state.maxZoom; nextZoom >= state.minZoom; nextZoom -= 1) {
        const nw = mercator(north, west, nextZoom);
        const se = mercator(south, east, nextZoom);
        if (se.x - nw.x <= roomW && se.y - nw.y <= roomH) {
          chosen = nextZoom;
          break;
        }
      }
      const center = visualCenter(north, west, south, east, chosen);
      commitView(chosen, center.lat, center.lng);
    },
    [commitView],
  );

  const project = useCallback(
    (pointLat: number, pointLng: number): [number, number] => {
      const point = mercator(pointLat, pointLng, zoom);
      return [point.x - topLeft.x, point.y - topLeft.y];
    },
    [zoom, topLeft.x, topLeft.y],
  );

  return {
    zoom,
    topLeft,
    tiles: tilesForView(zoom, topLeft, width, height, basemap),
    project,
    zoomIn,
    zoomOut,
    reset,
    focusBounds,
    canZoomIn: zoom < maxZoom,
    canZoomOut: zoom > minZoom,
    dragging,
    surfaceRef,
    surfaceProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    ignoreClick,
  };
};
