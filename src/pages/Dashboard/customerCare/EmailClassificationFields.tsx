import { useEffect, useState } from "react";
import {
  categoriesFor,
  emailClassGroups,
  encodeEmailClassification,
  parseEmailClassification,
  typesFor,
  type EmailClassKind,
} from "../../../utils/emailComplaintCategories";

const selectClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-400";

type Props = {
  tag: string;
  onChange: (tag: string) => void;
};

export function EmailClassificationFields({ tag, onChange }: Props) {
  const saved = parseEmailClassification(tag);
  const [kind, setKind] = useState<EmailClassKind>(saved?.kind ?? "query");
  const [category, setCategory] = useState(saved?.category ?? "");

  useEffect(() => {
    setKind(saved?.kind ?? "query");
    setCategory(saved?.category ?? "");
  }, [saved?.kind, saved?.category, tag]);

  const categories = categoriesFor(kind);
  const types = category ? typesFor(kind, category) : [];
  const selectedType = saved?.kind === kind && saved.category === category ? saved.type : "";
  const typical = types.find((option) => option.type === selectedType)?.typical;
  const legacyTag = tag.trim() && !saved ? tag.trim() : "";

  return (
    <div className="rounded-xl border border-[#dbe4f5] bg-[#f8fafc] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Classify this email
        </div>
        {tag.trim() ? (
          <button
            type="button"
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
            onClick={() => onChange("")}
          >
            Clear
          </button>
        ) : null}
      </div>
      {legacyTag ? (
        <p className="mb-2 text-xs text-amber-700">
          Earlier tag: {legacyTag}. Choose a query or complaint below to replace it.
        </p>
      ) : null}
      <div className="mb-3 flex gap-2">
        {(
          [
            ["query", "Query"],
            ["complaint", "Complaint"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setKind(value);
              setCategory(saved?.kind === value ? saved.category : "");
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              kind === value
                ? value === "complaint"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-blue-50 text-blue-700"
                : "bg-white text-gray-500 ring-1 ring-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-gray-500">
          Category
          <select
            aria-label="Email category"
            value={categories.includes(category) ? category : ""}
            onChange={(event) => setCategory(event.target.value)}
            className={selectClass}
          >
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-gray-500">
          {kind === "query" ? "Query type" : "Complaint type"}
          <select
            aria-label={kind === "query" ? "Query type" : "Complaint type"}
            value={selectedType}
            disabled={!category}
            onChange={(event) => {
              const type = event.target.value;
              if (!category || !type) return;
              onChange(encodeEmailClassification(kind, category, type));
            }}
            className={selectClass}
          >
            <option value="">Select type</option>
            {types.map((option) => (
              <option key={option.type} value={option.type}>
                {option.type}
              </option>
            ))}
          </select>
        </label>
      </div>
      {typical ? <p className="mt-2 text-xs text-gray-500">{typical}</p> : null}
    </div>
  );
}

export function EmailClassificationSelect({ tag, onChange }: Props) {
  const groups = emailClassGroups();
  const saved = parseEmailClassification(tag);
  const value = saved ? saved.tag : tag;

  return (
    <select
      aria-label="Email classification"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="ml-1 max-w-[16rem] rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 outline-none focus:border-blue-300"
    >
      <option value="">Select query or complaint</option>
      {!saved && tag.trim() ? <option value={tag}>{tag}</option> : null}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.type}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
