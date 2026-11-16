import { useEffect, useState, type RefObject } from "react";
import type { MapBasemap } from "./mapViewport";

type MapZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onToggleFullscreen?: () => void;
  fullscreenActive?: boolean;
  className?: string;
};

export const useMapFullscreen = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  const toggle = () => {
    const element = ref.current;
    if (!element) return;
    if (document.fullscreenElement === element) {
      void document.exitFullscreen();
      return;
    }
    void element.requestFullscreen();
  };

  return { active, toggle };
};

const buttonClass =
  "flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300";

const BASEMAPS: MapBasemap[] = ["terrain", "plain"];

export const MapBasemapToggle = ({
  basemap,
  onChange,
  className = "",
}: {
  basemap: MapBasemap;
  onChange: (basemap: MapBasemap) => void;
  className?: string;
}) => (
  <div
    role="group"
    aria-label="Map style"
    className={`flex overflow-hidden rounded-lg border border-slate-200 bg-white/95 text-[11px] font-semibold shadow-md ${className}`}
  >
    {BASEMAPS.map((option) => {
      const active = basemap === option;
      return (
        <button
          key={option}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option)}
          className={`px-2.5 py-1.5 capitalize ${
            active ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {option}
        </button>
      );
    })}
  </div>
);

export const MapZoomControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
  onToggleFullscreen,
  fullscreenActive = false,
  className = "",
}: MapZoomControlsProps) => (
  <div
    role="group"
    aria-label="Map zoom"
    className={`flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-md ${className}`}
  >
    <button
      type="button"
      aria-label="Zoom in"
      title="Zoom in"
      onClick={onZoomIn}
      disabled={!canZoomIn}
      className={`${buttonClass} border-b border-slate-200 text-lg font-semibold leading-none`}
    >
      +
    </button>
    <button
      type="button"
      aria-label="Zoom out"
      title="Zoom out"
      onClick={onZoomOut}
      disabled={!canZoomOut}
      className={`${buttonClass} border-b border-slate-200 text-lg font-semibold leading-none`}
    >
      −
    </button>
    <button
      type="button"
      aria-label="Reset map view"
      title="Reset view"
      onClick={onReset}
      className={`${buttonClass} ${onToggleFullscreen ? "border-b border-slate-200" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 5a7 7 0 1 1-6.3 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5 4.5V9h4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
    {onToggleFullscreen ? (
      <button
        type="button"
        aria-label={fullscreenActive ? "Exit full screen" : "Full screen"}
        title={fullscreenActive ? "Exit full screen" : "Full screen"}
        onClick={onToggleFullscreen}
        className={buttonClass}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          {fullscreenActive ? (
            <path
              d="M9 4H5v4M15 4h4v4M9 20H5v-4M15 20h4v-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    ) : null}
  </div>
);
