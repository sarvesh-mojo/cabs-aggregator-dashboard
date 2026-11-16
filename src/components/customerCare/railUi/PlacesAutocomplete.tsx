import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { OPS_PLACE_SEARCH } from "../../../config/customerCare/operationsApicall";
import {
  resolvePlaceFromPlaceId,
  type ResolvedPlace,
} from "./prepareFareSearch";

type Prediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type Props = {
  partner: string;
  value: string;
  placeholder?: string;
  icon?: ReactNode;
  sessiontoken: string;
  onInputChange: (value: string) => void;
  onPlaceResolved: (place: ResolvedPlace) => void;
};

export default function PlacesAutocomplete({
  partner,
  value,
  placeholder,
  icon,
  sessiontoken,
  onInputChange,
  onPlaceResolved,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [hint, setHint] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHint("");
    const seq = ++requestSeq.current;
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await OPS_PLACE_SEARCH(partner, {
          input: query,
          sessiontoken,
        });
        if (seq !== requestSeq.current) return;
        if (res?.status === "failure" || res?.status === "error") {
          setSuggestions([]);
          setOpen(false);
          setHint(res?.message || "Place search failed.");
          return;
        }
        const predictions: Prediction[] = res?.data?.predictions || [];
        setSuggestions(predictions);
        setOpen(predictions.length > 0);
        setActiveIndex(-1);
        setHint(predictions.length ? "" : "No matching places.");
      } catch (err: any) {
        if (seq !== requestSeq.current) return;
        setSuggestions([]);
        setOpen(false);
        const status = err?.response?.status;
        const message =
          err?.response?.data?.message || err?.message || "Place search failed.";
        setHint(
          status === 403
            ? `${message}. If on localhost, restart npm run dev (maps proxy) or use mojo-fe-testing.bookairportcab.com.`
            : message
        );
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, partner, sessiontoken]);

  const pick = async (prediction: Prediction) => {
    setOpen(false);
    setSuggestions([]);
    setResolving(true);
    onInputChange(prediction.description);
    try {
      const place = await resolvePlaceFromPlaceId(
        partner,
        prediction.place_id,
        sessiontoken,
        prediction.description
      );
      onPlaceResolved(place);
    } catch {
      /* parent keeps typed text; search will try resolve again */
    } finally {
      setResolving(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void pick(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <input
          className="w-full text-sm font-medium text-slate-800 outline-none"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {(loading || resolving) && (
          <span className="shrink-0 text-[10px] font-medium text-slate-400">
            {resolving ? "…" : "…"}
          </span>
        )}
      </div>

      {hint && !open && (
        <p className="mt-1 text-[10px] text-amber-600">{hint}</p>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((prediction, index) => {
            const main =
              prediction.structured_formatting?.main_text ||
              prediction.description;
            const secondary = prediction.structured_formatting?.secondary_text;
            return (
              <li key={prediction.place_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex w-full flex-col px-3 py-2 text-left hover:bg-sky-50 ${
                    index === activeIndex ? "bg-sky-50" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void pick(prediction)}
                >
                  <span className="text-sm font-medium text-slate-800">{main}</span>
                  {secondary && (
                    <span className="text-xs text-slate-500">{secondary}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
