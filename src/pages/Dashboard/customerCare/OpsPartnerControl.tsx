import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useSelector } from "react-redux";
import PageMeta from "../../../components/common/PageMeta";
import { PartnerTab } from "../../../components/common/PartnerTab";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_CREATE,
  CUSTOM_GENERIC_UPDATE,
  CUSTOM_GENERIC_DELETE,
  GET_HOURLY_THRESHOLD_STATUS,
} from "../../../config/customerCare/operationsApicall";
import HourlyQuotaBoard from "./HourlyQuotaBoard";

/**
 * Ops Partner Control — partner-first hub for the tables Cab Management
 * exposes as flat generic grids: city_cab_status (Live), cab_partner_visibility
 * (Rank), cab_partner_hourly_threshold (Hourly caps), hourly_discount_config
 * (Hourly discount). Built on top of the SAME generic CRUD endpoints
 * (genericSearch/genericCreate/genericUpdate/genericDelete) CabMangement.tsx
 * already uses — no new viaVIP_API routes were required for this MVP.
 *
 * Order of operations (keep this in sync with
 * viaVIP_API `.cursor/plans/yvip_defered_allocation.plan.md` §04/§07 — do not
 * edit that plan file from here):
 *   1. Eligible partners — live (city_cab_status) + rank/enabled
 *      (cab_partner_visibility) + under hourly/daily cap
 *      (cab_partner_hourly_threshold).
 *   2. Pick R1 (cheapest eligible, fulfilment) / R2 (next eligible, customer
 *      sell) — happens inside viaVIP_API fare ranking, gated by the
 *      `R1R2_SELL_ENABLE` config flag (default OFF today).
 *   3. Sell at R2.
 *   4. Apply hourly discount (hourly_discount_config) to the customer-facing
 *      payable/strike fare.
 *   5. Park markup against the advance collected (parkedMarkup ≤
 *      customerAdvance) — Product/Finance owns the exact formula.
 * Hourly discount must never change which partner is picked as R1.
 */

type FieldType = "text" | "number" | "select";

type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  numeric?: boolean; // force Number() even for select/text (e.g. "1"/"0" flags)
};

type TableKey =
  | "city_cab_status"
  | "cab_partner_visibility"
  | "cab_partner_hourly_threshold"
  | "hourly_discount_config";

const TRAVEL_TYPES = ["Arrival", "Departure"];
const VEHICLE_TYPES = ["HATCHBACK", "SEDAN", "SUV"];
const AUDIENCES = ["REGULAR", "EMP"];
const FLAG_OPTIONS = ["1", "0"];

function toUpperTrim(value: string) {
  return String(value || "").trim().toUpperCase();
}

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function padHour(hour: number) {
  return String(hour).padStart(2, "0");
}

function windowLabel(fromHour: number, toHour: number) {
  if (Number.isNaN(fromHour) || Number.isNaN(toHour)) return "—";
  return `${padHour(fromHour)}:00–${padHour(toHour)}:59`;
}

function hourInWindow(hour: number, fromHour: number, toHour: number) {
  if (Number.isNaN(fromHour) || Number.isNaN(toHour)) return false;
  return fromHour <= toHour
    ? hour >= fromHour && hour <= toHour
    : hour >= fromHour || hour <= toHour; // wraps past midnight
}

const CITY_CAB_STATUS_FIELDS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "code", label: "City code", type: "text" },
  { key: "isArrival", label: "Arrival enabled", type: "select", options: FLAG_OPTIONS, numeric: true },
  { key: "isDeparture", label: "Departure enabled", type: "select", options: FLAG_OPTIONS, numeric: true },
  { key: "arrivalPartner", label: "Arrival partners (CSV)", type: "text" },
  { key: "departurePartner", label: "Departure partners (CSV)", type: "text" },
  { key: "rental", label: "Rental partners (CSV)", type: "text" },
  { key: "outstation", label: "Outstation partners (CSV)", type: "text" },
  { key: "status", label: "Active", type: "select", options: FLAG_OPTIONS, numeric: true },
  { key: "tag", label: "Tag", type: "text" },
  { key: "vehicleType", label: "Vehicle type", type: "text" },
  { key: "desiredCount", label: "Desired count (balance logic)", type: "number" },
  { key: "fareTierEnabled", label: "Fare tier enabled", type: "select", options: FLAG_OPTIONS, numeric: true },
  { key: "fareTierPercent", label: "Fare tier %", type: "number" },
  { key: "lowestFareCount", label: "Lowest fare count", type: "number" },
  { key: "nextTierFareCount", label: "Next tier fare count", type: "number" },
];

const CAB_PARTNER_VISIBILITY_FIELDS: FieldSpec[] = [
  { key: "city", label: "City", type: "text" },
  { key: "travelType", label: "Travel type", type: "select", options: TRAVEL_TYPES },
  { key: "vehicleType", label: "Vehicle type", type: "select", options: VEHICLE_TYPES },
  { key: "partnerName", label: "Partner", type: "text" },
  { key: "ranks", label: "Rank", type: "number" },
  { key: "isEnabled", label: "Enabled", type: "select", options: FLAG_OPTIONS, numeric: true },
  { key: "dailyThreshold", label: "Daily cap (0 = no limit)", type: "number" },
  { key: "hourlyThreshold", label: "Hourly cap", type: "number" },
  { key: "allocationPercent", label: "Allocation % target", type: "number" },
];

const CAB_PARTNER_HOURLY_THRESHOLD_FIELDS: FieldSpec[] = [
  { key: "city", label: "City", type: "text" },
  { key: "travelType", label: "Travel type", type: "select", options: TRAVEL_TYPES },
  { key: "cabPartnerName", label: "Partner", type: "text" },
  { key: "vehicleType", label: "Vehicle type", type: "select", options: VEHICLE_TYPES },
  { key: "hourSlot", label: "Hour slot (0–23)", type: "number" },
  { key: "hourlyThreshold", label: "Hourly cap", type: "number" },
  { key: "dailyThreshold", label: "Daily cap", type: "number" },
  { key: "ranks", label: "Rank", type: "number" },
  { key: "isEnabled", label: "Enabled", type: "select", options: FLAG_OPTIONS, numeric: true },
];

const HOURLY_DISCOUNT_FIELDS: FieldSpec[] = [
  { key: "city_code", label: "City code", type: "text" },
  { key: "fromHour", label: "From hour (0–23)", type: "number" },
  { key: "toHour", label: "To hour (0–23, inclusive)", type: "number" },
  { key: "pct", label: "Discount % of base fare", type: "number" },
  { key: "upto", label: "Cap ₹ (0 = no cap)", type: "number" },
  { key: "audience", label: "Audience", type: "select", options: AUDIENCES },
  { key: "status", label: "Active", type: "select", options: FLAG_OPTIONS, numeric: true },
];

const TABLE_META: Record<
  TableKey,
  {
    label: string;
    fields: FieldSpec[];
    partnerField?: string;
    cityField: string;
    listColumns: string[];
    identityFields: string[]; // excluded from bulk "set this field" editor
  }
> = {
  city_cab_status: {
    label: "Live (city_cab_status)",
    fields: CITY_CAB_STATUS_FIELDS,
    cityField: "code",
    listColumns: ["id", "code", "name", "status", "arrivalPartner", "departurePartner"],
    identityFields: ["name", "code"],
  },
  cab_partner_visibility: {
    label: "Rank (cab_partner_visibility)",
    fields: CAB_PARTNER_VISIBILITY_FIELDS,
    partnerField: "partnerName",
    cityField: "city",
    listColumns: [
      "id",
      "city",
      "travelType",
      "vehicleType",
      "partnerName",
      "ranks",
      "isEnabled",
      "dailyThreshold",
      "hourlyThreshold",
    ],
    identityFields: ["city", "travelType", "vehicleType", "partnerName"],
  },
  cab_partner_hourly_threshold: {
    label: "Hourly threshold (cab_partner_hourly_threshold)",
    fields: CAB_PARTNER_HOURLY_THRESHOLD_FIELDS,
    partnerField: "cabPartnerName",
    cityField: "city",
    listColumns: [
      "id",
      "city",
      "travelType",
      "vehicleType",
      "cabPartnerName",
      "hourSlot",
      "hourlyThreshold",
      "dailyThreshold",
      "isEnabled",
    ],
    identityFields: ["city", "travelType", "vehicleType", "cabPartnerName", "hourSlot"],
  },
  hourly_discount_config: {
    label: "Hourly discount (hourly_discount_config)",
    fields: HOURLY_DISCOUNT_FIELDS,
    cityField: "city_code",
    listColumns: ["id", "city_code", "fromHour", "toHour", "pct", "upto", "audience", "status"],
    identityFields: ["city_code"],
  },
};

function rowLabel(table: TableKey, row: any): string {
  switch (table) {
    case "cab_partner_visibility":
      return `${row.city} · ${row.travelType} · ${row.vehicleType} · ${row.partnerName}`;
    case "cab_partner_hourly_threshold":
      return `${row.city} · ${row.travelType} · ${row.vehicleType} · ${row.cabPartnerName} · hr${row.hourSlot}`;
    case "city_cab_status":
      return `${row.code} (${row.name})`;
    case "hourly_discount_config":
      return `${row.city_code} · ${windowLabel(Number(row.fromHour), Number(row.toHour))} · ${row.audience}`;
    default:
      return `#${row.id}`;
  }
}

async function loadTableRows(
  partner: string,
  table: string,
  filters: Record<string, any>,
  limit = 200,
): Promise<any[]> {
  const res = await CUSTOM_GENERIC_TABLE(partner, { table, page: 1, limit, filters });
  return Array.isArray(res?.data) ? res.data : [];
}

/** Shared create/edit modal for every table on this page — reuses genericCreate/genericUpdate. */
function RowFormModal({
  title,
  fields,
  initialValues,
  submitLabel = "Save",
  onClose,
  onSubmit,
}: {
  title: string;
  fields: FieldSpec[];
  initialValues: Record<string, any>;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, any> = {};
      fields.forEach((field) => {
        const raw = values[field.key];
        if (raw === undefined || raw === "") return;
        payload[field.key] = field.type === "number" || field.numeric ? Number(raw) : raw;
      });
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-[560px] max-h-[85vh] overflow-auto">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {fields.map((field) => (
          <div key={field.key} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            {field.type === "select" ? (
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              >
                <option value="">-- select --</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                className="w-full p-2 border border-gray-300 rounded"
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm border border-red-200">{error}</div>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type ViewKey = "portfolio" | "discount" | "quota" | "simulate" | "bulk";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "portfolio", label: "Partner portfolio" },
  { key: "discount", label: "Hourly discount" },
  { key: "quota", label: "Hourly quota" },
  { key: "simulate", label: "R1/R2 simulate" },
  { key: "bulk", label: "Apply template / Bulk" },
];

const OrderOfOperationsPanel = () => (
  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900">
    <span className="font-semibold">Order of operations: </span>
    Eligible (Live + Rank + Hourly cap) → pick R1 (fulfill) / R2 (sell) → sell at R2 → apply{" "}
    <span className="font-semibold">hourly discount</span> to customer payable → park markup ≤ advance collected.
    Hourly discount never changes which partner is picked as R1.
  </div>
);

const OpsPartnerControl = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const [activeView, setActiveView] = useState<ViewKey>("portfolio");
  const [SelectedPartner, setSelectedPartner] = useState<string>(
    OperationstoreData?.ReportSelectedPartner,
  );

  useEffect(() => {
    setSelectedPartner(OperationstoreData?.ReportSelectedPartner);
  }, [OperationstoreData?.ReportSelectedPartner]);

  // Shared create/edit modal state — used by Partner portfolio, Hourly discount, and Bulk tabs.
  const [editModal, setEditModal] = useState<{
    table: TableKey;
    mode: "create" | "edit";
    row: Record<string, any>;
  } | null>(null);

  // ---------------------------------------------------------------------
  // Partner portfolio
  // ---------------------------------------------------------------------
  const [portfolioCity, setPortfolioCity] = useState("");
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [portfolioData, setPortfolioData] = useState<Record<string, any[]>>({
    city_cab_status: [],
    cab_partner_visibility: [],
    cab_partner_hourly_threshold: [],
  });

  const loadPortfolio = useCallback(async () => {
    if (!SelectedPartner) {
      setPortfolioError("Pick a partner tab above first.");
      return;
    }
    setPortfolioLoading(true);
    setPortfolioError("");
    try {
      const partnerUpper = toUpperTrim(SelectedPartner);
      const cityUpper = portfolioCity.trim().toUpperCase();

      const [liveRows, rankRows, thresholdRows] = await Promise.all([
        loadTableRows(SelectedPartner, "city_cab_status", cityUpper ? { code: `%${cityUpper}%` } : {}),
        loadTableRows(SelectedPartner, "cab_partner_visibility", {
          partnerName: `%${partnerUpper}%`,
          ...(cityUpper ? { city: `%${cityUpper}%` } : {}),
        }),
        loadTableRows(SelectedPartner, "cab_partner_hourly_threshold", {
          cabPartnerName: `%${partnerUpper}%`,
          ...(cityUpper ? { city: `%${cityUpper}%` } : {}),
        }),
      ]);

      // city_cab_status has no single partner column — it stores CSV partner
      // lists per travel type, so the partner match has to happen client-side.
      const liveFiltered = liveRows.filter((row: any) =>
        ["arrivalPartner", "departurePartner", "rental", "outstation"].some((col) =>
          String(row[col] || "").toUpperCase().includes(partnerUpper),
        ),
      );

      setPortfolioData({
        city_cab_status: liveFiltered,
        cab_partner_visibility: rankRows,
        cab_partner_hourly_threshold: thresholdRows,
      });
    } catch (err: any) {
      setPortfolioError(err?.response?.data?.message || err?.message || "Failed to load portfolio");
    } finally {
      setPortfolioLoading(false);
    }
  }, [SelectedPartner, portfolioCity]);

  useEffect(() => {
    if (activeView === "portfolio" && SelectedPartner) {
      loadPortfolio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, SelectedPartner]);

  // ---------------------------------------------------------------------
  // Hourly discount
  // ---------------------------------------------------------------------
  const [discountCity, setDiscountCity] = useState("");
  const [discountAudience, setDiscountAudience] = useState("");
  const [discountRows, setDiscountRows] = useState<any[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");

  const loadDiscountRows = useCallback(async () => {
    if (!SelectedPartner) {
      setDiscountError("Pick a partner tab above first.");
      return;
    }
    setDiscountLoading(true);
    setDiscountError("");
    try {
      const cityUpper = discountCity.trim().toUpperCase();
      const rows = await loadTableRows(
        SelectedPartner,
        "hourly_discount_config",
        {
          ...(cityUpper ? { city_code: `%${cityUpper}%` } : {}),
          ...(discountAudience ? { audience: discountAudience } : {}),
        },
        200,
      );
      setDiscountRows(rows);
    } catch (err: any) {
      setDiscountError(err?.response?.data?.message || err?.message || "Failed to load hourly discounts");
    } finally {
      setDiscountLoading(false);
    }
  }, [SelectedPartner, discountCity, discountAudience]);

  useEffect(() => {
    if (activeView === "discount" && SelectedPartner) {
      loadDiscountRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, SelectedPartner]);

  const deleteRow = async (table: TableKey, id: number, refresh: () => void) => {
    if (!window.confirm(`Delete row #${id} from ${table}? This cannot be undone.`)) return;
    try {
      await CUSTOM_GENERIC_DELETE(SelectedPartner, { table, id });
      refresh();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || err?.message || "Delete failed");
    }
  };

  // ---------------------------------------------------------------------
  // R1/R2 simulate — honest stub. Real R1/R2 picking lives in viaVIP_API
  // (utils/r1r2FareRank.js) behind the R1R2_SELL_ENABLE flag and needs a
  // live fare quote, which this ops page does not call. This tab only
  // shows the *eligibility* pool (live + rank + hourly cap) and any active
  // hourly discount for that city/hour, using the already-wired
  // hourlyThresholdStatus API.
  // ---------------------------------------------------------------------
  const [simCity, setSimCity] = useState("");
  const [simHour, setSimHour] = useState<string>(String(new Date().getHours()));
  const [simTravelType, setSimTravelType] = useState("");
  const [simVehicleType, setSimVehicleType] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [simRan, setSimRan] = useState(false);
  const [simRows, setSimRows] = useState<any[]>([]);
  const [simDiscount, setSimDiscount] = useState<any | null>(null);

  const runSimulate = async () => {
    if (!SelectedPartner) {
      setSimError("Pick a partner tab above first.");
      return;
    }
    if (!simCity.trim()) {
      setSimError("City code is required.");
      return;
    }
    setSimLoading(true);
    setSimError("");
    setSimRan(false);
    try {
      const hour = Number(simHour);
      const cityUpper = simCity.trim().toUpperCase();

      const result = await GET_HOURLY_THRESHOLD_STATUS(SelectedPartner, {
        date: todayInIndia(),
        city: cityUpper,
        refreshCache: false,
      });

      const rows = (result.rows || []).filter((row: any) => {
        const matchesTravel =
          !simTravelType || String(row.travelType || "").toUpperCase() === simTravelType.toUpperCase();
        const matchesVehicle =
          !simVehicleType || String(row.vehicleType || "").toUpperCase() === simVehicleType.toUpperCase();
        const from = Number(row.fromHour ?? row.hourSlot ?? NaN);
        const to = Number(row.toHour ?? row.hourSlot ?? NaN);
        const matchesHour = Number.isNaN(from) || Number.isNaN(to) ? true : hourInWindow(hour, from, to);
        return matchesTravel && matchesVehicle && matchesHour;
      });
      rows.sort((a: any, b: any) => Number(a.ranks ?? 999) - Number(b.ranks ?? 999));
      setSimRows(rows);

      const discountCandidates = await loadTableRows(
        SelectedPartner,
        "hourly_discount_config",
        { city_code: cityUpper, status: 1 },
        50,
      );
      const activeDiscount = discountCandidates.find((row: any) =>
        hourInWindow(hour, Number(row.fromHour), Number(row.toHour)),
      );
      setSimDiscount(activeDiscount || null);
      setSimRan(true);
    } catch (err: any) {
      setSimError(err?.response?.data?.message || err?.message || "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Apply template / Bulk — guided multi-select + dry-run + progress.
  // Loops the SAME genericUpdate endpoint CabMangement.tsx uses (no new
  // viaVIP_API batch route was added — see response notes on why).
  // ---------------------------------------------------------------------
  const [bulkTable, setBulkTable] = useState<TableKey>("cab_partner_visibility");
  const [bulkCity, setBulkCity] = useState("");
  const [bulkPartner, setBulkPartner] = useState("");
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkFieldEnabled, setBulkFieldEnabled] = useState<Record<string, boolean>>({});
  const [bulkFieldValue, setBulkFieldValue] = useState<Record<string, string>>({});
  const [bulkPreview, setBulkPreview] = useState<{ id: number; label: string; changes: Record<string, any> }[] | null>(
    null,
  );
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{ id: number; label: string; ok: boolean; error?: string }[] | null>(
    null,
  );

  const bulkMeta = TABLE_META[bulkTable];
  const bulkEditableFields = useMemo(
    () => bulkMeta.fields.filter((field) => !bulkMeta.identityFields.includes(field.key)),
    [bulkMeta],
  );

  useEffect(() => {
    setBulkRows([]);
    setBulkSelected(new Set());
    setBulkFieldEnabled({});
    setBulkFieldValue({});
    setBulkPreview(null);
    setBulkResults(null);
    setBulkError("");
  }, [bulkTable]);

  const loadBulkRows = useCallback(async () => {
    if (!SelectedPartner) {
      setBulkError("Pick a partner tab above first.");
      return;
    }
    setBulkLoading(true);
    setBulkError("");
    setBulkPreview(null);
    setBulkResults(null);
    try {
      const filters: Record<string, any> = {};
      const cityUpper = bulkCity.trim().toUpperCase();
      if (cityUpper) filters[bulkMeta.cityField] = `%${cityUpper}%`;
      if (bulkMeta.partnerField && bulkPartner.trim()) {
        filters[bulkMeta.partnerField] = `%${toUpperTrim(bulkPartner)}%`;
      }
      const rows = await loadTableRows(SelectedPartner, bulkTable, filters, 300);
      setBulkRows(rows);
      setBulkSelected(new Set());
    } catch (err: any) {
      setBulkError(err?.response?.data?.message || err?.message || "Failed to load rows");
    } finally {
      setBulkLoading(false);
    }
  }, [SelectedPartner, bulkTable, bulkCity, bulkPartner, bulkMeta]);

  const toggleBulkRow = (id: number) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllBulkRows = () => {
    setBulkSelected((prev) =>
      prev.size === bulkRows.length ? new Set() : new Set(bulkRows.map((row) => row.id)),
    );
  };

  const buildBulkPreview = () => {
    const activeFields = bulkEditableFields.filter(
      (field) => bulkFieldEnabled[field.key] && bulkFieldValue[field.key] !== undefined && bulkFieldValue[field.key] !== "",
    );
    if (!activeFields.length) {
      setBulkError("Pick at least one field (and value) to bulk-set.");
      return;
    }
    if (!bulkSelected.size) {
      setBulkError("Select at least one row.");
      return;
    }
    setBulkError("");
    const changes: Record<string, any> = {};
    activeFields.forEach((field) => {
      changes[field.key] = field.type === "number" || field.numeric ? Number(bulkFieldValue[field.key]) : bulkFieldValue[field.key];
    });
    const preview = bulkRows
      .filter((row) => bulkSelected.has(row.id))
      .map((row) => ({ id: row.id, label: rowLabel(bulkTable, row), changes }));
    setBulkPreview(preview);
    setBulkResults(null);
  };

  const applyBulkPreview = async () => {
    if (!bulkPreview?.length) return;
    setBulkApplying(true);
    setBulkProgress({ done: 0, total: bulkPreview.length });
    const results: { id: number; label: string; ok: boolean; error?: string }[] = [];
    for (const item of bulkPreview) {
      try {
        await CUSTOM_GENERIC_UPDATE(SelectedPartner, { table: bulkTable, id: item.id, data: item.changes });
        results.push({ id: item.id, label: item.label, ok: true });
      } catch (err: any) {
        results.push({
          id: item.id,
          label: item.label,
          ok: false,
          error: err?.response?.data?.message || err?.message || "Failed",
        });
      }
      setBulkProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }
    setBulkResults(results);
    setBulkApplying(false);
    setBulkPreview(null);
    loadBulkRows();
  };

  const refreshAfterSave = (table: TableKey) => {
    if (table === "hourly_discount_config") {
      loadDiscountRows();
    } else if (activeView === "bulk") {
      loadBulkRows();
    } else {
      loadPortfolio();
    }
  };

  return (
    <div>
      <PageMeta
        title="Ops Partner Control"
        description="Partner-first hub for Live, Rank, Hourly thresholds, and Hourly discount"
      />

      <div className="bg-white p-6 mx-auto max-w-full rounded-xl shadow-lg mt-0">
        <h2 className="text-2xl font-bold mb-1 text-gray-800">Ops Partner Control</h2>
        <p className="text-sm text-gray-500 mb-4">
          Partner-first view over city_cab_status / cab_partner_visibility / cab_partner_hourly_threshold /
          hourly_discount_config. Debug a single row?{" "}
          <Link to="/dashboard/customerCare/CabManagement" target="_blank" className="text-blue-600 underline">
            Open Cab Management
          </Link>
          .
        </p>

        <OrderOfOperationsPanel />

        <PartnerTab />

        <div className="flex flex-wrap gap-2 mb-6">
          {VIEWS.map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => setActiveView(view.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                activeView === view.key
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* ---------------- Partner portfolio ---------------- */}
        {activeView === "portfolio" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City filter (optional)</label>
                <input
                  type="text"
                  placeholder="DEL"
                  className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                  value={portfolioCity}
                  onChange={(e) => setPortfolioCity(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={loadPortfolio}
                  disabled={portfolioLoading || !SelectedPartner}
                  className={`w-full p-2 rounded-lg text-white font-medium shadow h-[42px] ${
                    portfolioLoading || !SelectedPartner ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {portfolioLoading ? "Loading..." : "Load portfolio"}
                </button>
              </div>
            </div>

            {portfolioError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                {portfolioError}
              </div>
            )}

            {(["city_cab_status", "cab_partner_visibility", "cab_partner_hourly_threshold"] as TableKey[]).map(
              (table) => {
                const meta = TABLE_META[table];
                const rows = portfolioData[table] || [];
                return (
                  <div key={table} className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm uppercase font-bold text-gray-500 tracking-wider">{meta.label}</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setEditModal({
                            table,
                            mode: "create",
                            row:
                              table === "city_cab_status"
                                ? { code: portfolioCity }
                                : table === "cab_partner_visibility"
                                  ? { city: portfolioCity, partnerName: toUpperTrim(SelectedPartner || "") }
                                  : { city: portfolioCity, cabPartnerName: toUpperTrim(SelectedPartner || "") },
                          })
                        }
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
                      >
                        + Add
                      </button>
                    </div>
                    {rows.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-sm">
                        No rows yet for this partner{portfolioCity ? ` in ${portfolioCity}` : ""}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                                Action
                              </th>
                              {meta.listColumns.map((col) => (
                                <th key={col} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map((row: any) => (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <button
                                    onClick={() => setEditModal({ table, mode: "edit", row })}
                                    className="px-2 py-1 bg-yellow-500 text-white rounded text-xs mr-1"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteRow(table, row.id, loadPortfolio)}
                                    className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                  >
                                    Del
                                  </button>
                                </td>
                                {meta.listColumns.map((col) => (
                                  <td key={col} className="px-3 py-2 whitespace-nowrap text-gray-700">
                                    {String(row[col] ?? "—")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* ---------------- Hourly discount ---------------- */}
        {activeView === "discount" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City code (optional)</label>
                <input
                  type="text"
                  placeholder="DEL"
                  className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                  value={discountCity}
                  onChange={(e) => setDiscountCity(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={discountAudience}
                  onChange={(e) => setDiscountAudience(e.target.value)}
                >
                  <option value="">All</option>
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={loadDiscountRows}
                  disabled={discountLoading || !SelectedPartner}
                  className={`w-full p-2 rounded-lg text-white font-medium shadow h-[42px] ${
                    discountLoading || !SelectedPartner ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {discountLoading ? "Loading..." : "Search"}
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setEditModal({
                      table: "hourly_discount_config",
                      mode: "create",
                      row: { city_code: discountCity, upto: "0", audience: "REGULAR", status: "1" },
                    })
                  }
                  className="w-full p-2 rounded-lg text-white font-medium shadow h-[42px] bg-green-600 hover:bg-green-700"
                >
                  + Add window
                </button>
              </div>
            </div>

            {discountError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                {discountError}
              </div>
            )}

            {discountRows.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                No hourly discount windows match this search.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Action", "City", "Window", "Discount %", "Cap ₹", "Audience", "Active"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {discountRows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => setEditModal({ table: "hourly_discount_config", mode: "edit", row })}
                            className="px-2 py-1 bg-yellow-500 text-white rounded text-xs mr-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRow("hourly_discount_config", row.id, loadDiscountRows)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                          >
                            Del
                          </button>
                        </td>
                        <td className="px-3 py-2">{row.city_code}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {windowLabel(Number(row.fromHour), Number(row.toHour))}
                        </td>
                        <td className="px-3 py-2">{row.pct}%</td>
                        <td className="px-3 py-2">{Number(row.upto) > 0 ? `₹${row.upto}` : "no cap"}</td>
                        <td className="px-3 py-2">{row.audience}</td>
                        <td className="px-3 py-2">{Number(row.status) === 1 ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Hourly quota (existing board, embedded) ---------------- */}
        {activeView === "quota" && <HourlyQuotaBoard partner={SelectedPartner} />}

        {/* ---------------- R1/R2 simulate (honest stub) ---------------- */}
        {activeView === "simulate" && (
          <div>
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <strong>This is an eligibility check, not a live R1/R2 preview.</strong> Actual sell-at-R2 /
              fulfill-at-R1 ranking runs inside viaVIP_API (<code>utils/r1r2FareRank.js</code>) behind the{" "}
              <code>R1R2_SELL_ENABLE</code> config flag (default OFF) and needs a real fare-search quote per
              partner. This page does not call fare search, so it cannot show which fare wins R1 vs R2. What it
              <em> can</em> show: which partners are currently eligible (live + rank + under hourly/daily cap) for
              a city/hour, and whether an hourly discount window is active — the two inputs R1/R2 ranking already
              reuses.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City code</label>
                <input
                  type="text"
                  placeholder="DEL"
                  className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                  value={simCity}
                  onChange={(e) => setSimCity(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup hour</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={simHour}
                  onChange={(e) => setSimHour(e.target.value)}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {padHour(h)}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Travel type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={simTravelType}
                  onChange={(e) => setSimTravelType(e.target.value)}
                >
                  <option value="">Any</option>
                  {TRAVEL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={simVehicleType}
                  onChange={(e) => setSimVehicleType(e.target.value)}
                >
                  <option value="">Any</option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={runSimulate}
                  disabled={simLoading || !SelectedPartner}
                  className={`w-full p-2 rounded-lg text-white font-medium shadow h-[42px] ${
                    simLoading || !SelectedPartner ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {simLoading ? "Checking..." : "Check eligibility"}
                </button>
              </div>
            </div>

            {simError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{simError}</div>
            )}

            {simRan && (
              <>
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {simDiscount ? (
                    <span>
                      <strong>Active hourly discount:</strong> {simDiscount.pct}% off
                      {Number(simDiscount.upto) > 0 ? ` (cap ₹${simDiscount.upto})` : " (no cap)"} for{" "}
                      {simDiscount.audience} during{" "}
                      {windowLabel(Number(simDiscount.fromHour), Number(simDiscount.toHour))}.
                    </span>
                  ) : (
                    <span>No active hourly discount for this city/hour.</span>
                  )}
                </div>

                {simRows.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    No hourly-threshold rows matched this city/hour/filter combination.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Rank", "Partner", "Vehicle", "Travel", "Eligible this hour"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {simRows.map((row: any, idx: number) => (
                          <tr key={`${row.partnerName}-${row.vehicleType}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{row.ranks ?? "—"}</td>
                            <td className="px-3 py-2 font-medium">{row.partnerName}</td>
                            <td className="px-3 py-2">{row.vehicleType}</td>
                            <td className="px-3 py-2">{row.travelType}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  row.bookingAllowed ?? row.status?.bookingAllowed
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {row.bookingAllowed ?? row.status?.bookingAllowed ? "Eligible" : "Blocked"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Ordered by configured rank (<code>cab_partner_visibility.ranks</code>) as a proxy — the real R1/R2
                  pick is by net fare, which needs a live search.
                </p>
              </>
            )}
          </div>
        )}

        {/* ---------------- Apply template / Bulk ---------------- */}
        {activeView === "bulk" && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              No dedicated viaVIP_API batch endpoint was added for this MVP (kept the change small and low-risk).
              This loops the existing <code>genericUpdate</code> endpoint per selected row — same one Cab Management
              uses — with a dry-run preview and progress before anything is written.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={bulkTable}
                  onChange={(e) => setBulkTable(e.target.value as TableKey)}
                >
                  {(Object.keys(TABLE_META) as TableKey[]).map((key) => (
                    <option key={key} value={key}>
                      {TABLE_META[key].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City filter (optional)</label>
                <input
                  type="text"
                  placeholder="DEL"
                  className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                  value={bulkCity}
                  onChange={(e) => setBulkCity(e.target.value.toUpperCase())}
                />
              </div>
              {bulkMeta.partnerField && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner filter (optional)</label>
                  <input
                    type="text"
                    placeholder="GOZO"
                    className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                    value={bulkPartner}
                    onChange={(e) => setBulkPartner(e.target.value.toUpperCase())}
                  />
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={loadBulkRows}
                  disabled={bulkLoading || !SelectedPartner}
                  className={`w-full p-2 rounded-lg text-white font-medium shadow h-[42px] ${
                    bulkLoading || !SelectedPartner ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {bulkLoading ? "Loading..." : "Load rows"}
                </button>
              </div>
            </div>

            {bulkError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{bulkError}</div>
            )}

            {bulkRows.length > 0 && (
              <>
                <div className="mb-4 overflow-x-auto border border-gray-200 rounded-lg max-h-72">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={bulkSelected.size === bulkRows.length && bulkRows.length > 0}
                            onChange={toggleAllBulkRows}
                          />
                        </th>
                        {bulkMeta.listColumns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkRows.map((row: any) => (
                        <tr key={row.id} className={bulkSelected.has(row.id) ? "bg-blue-50" : "hover:bg-gray-50"}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={bulkSelected.has(row.id)}
                              onChange={() => toggleBulkRow(row.id)}
                            />
                          </td>
                          {bulkMeta.listColumns.map((col) => (
                            <td key={col} className="px-3 py-2 whitespace-nowrap text-gray-700">
                              {String(row[col] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mb-4 text-xs text-gray-500">{bulkSelected.size} of {bulkRows.length} rows selected.</p>

                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase">Set these fields on every selected row</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {bulkEditableFields.map((field) => (
                      <div key={field.key} className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded">
                        <input
                          type="checkbox"
                          className="mt-2"
                          checked={!!bulkFieldEnabled[field.key]}
                          onChange={(e) =>
                            setBulkFieldEnabled((prev) => ({ ...prev, [field.key]: e.target.checked }))
                          }
                        />
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                          {field.type === "select" ? (
                            <select
                              className="w-full p-1.5 border border-gray-300 rounded text-sm"
                              value={bulkFieldValue[field.key] ?? ""}
                              onChange={(e) => setBulkFieldValue((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            >
                              <option value="">-- value --</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === "number" ? "number" : "text"}
                              className="w-full p-1.5 border border-gray-300 rounded text-sm"
                              value={bulkFieldValue[field.key] ?? ""}
                              onChange={(e) => setBulkFieldValue((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-amber-700">
                    Heads up: bulk-disabling or zeroing caps across many partners for the same city/travel/vehicle
                    can leave zero live partners. Check the preview before applying.
                  </p>
                  <button
                    type="button"
                    onClick={buildBulkPreview}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700"
                  >
                    Preview changes (dry run)
                  </button>
                </div>
              </>
            )}

            {bulkPreview && (
              <div className="mb-4 p-4 bg-white border border-indigo-200 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3">
                  Dry run — {bulkPreview.length} row{bulkPreview.length === 1 ? "" : "s"} will change
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64 mb-3">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">New values</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkPreview.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 whitespace-nowrap">{item.label}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {Object.entries(item.changes)
                              .map(([k, v]) => `${k}=${v}`)
                              .join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkPreview(null)}
                    disabled={bulkApplying}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyBulkPreview}
                    disabled={bulkApplying}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                  >
                    {bulkApplying ? `Applying ${bulkProgress.done}/${bulkProgress.total}...` : `Apply ${bulkPreview.length} changes`}
                  </button>
                </div>
              </div>
            )}

            {bulkResults && (
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3">
                  Applied — {bulkResults.filter((r) => r.ok).length} succeeded, {bulkResults.filter((r) => !r.ok).length}{" "}
                  failed
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkResults.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 whitespace-nowrap">{item.label}</td>
                          <td className="px-3 py-2">
                            {item.ok ? (
                              <span className="text-green-700">✔ saved</span>
                            ) : (
                              <span className="text-red-700">✘ {item.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {editModal && (
          <RowFormModal
            title={`${editModal.mode === "create" ? "Add" : "Edit"} — ${TABLE_META[editModal.table].label}`}
            fields={TABLE_META[editModal.table].fields}
            initialValues={editModal.row}
            submitLabel={editModal.mode === "create" ? "Create" : "Save"}
            onClose={() => setEditModal(null)}
            onSubmit={async (values) => {
              if (editModal.mode === "create") {
                await CUSTOM_GENERIC_CREATE(SelectedPartner, { table: editModal.table, data: values });
              } else {
                await CUSTOM_GENERIC_UPDATE(SelectedPartner, {
                  table: editModal.table,
                  id: editModal.row.id,
                  data: values,
                });
              }
              setEditModal(null);
              refreshAfterSave(editModal.table);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default OpsPartnerControl;
