import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSelector } from "react-redux";
import PageMeta from "../../../components/common/PageMeta";
import { PartnerTab } from "../../../components/common/PartnerTab";
import IbcRunbook from "./IbcRunbook";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_UPDATE,
} from "../../../config/customerCare/operationsApicall";

const TABLE_NAME = "app_config";
const REFRESH_MS = 30000;
const DAILY_REMAINING_FLOOR = 2000;

const KEYS = {
  burnEnable: "IBC_BURN_ENABLE",
  tierConfigEnabled: "IBC_TIER_CONFIG_ENABLED",
  loyaltyMultiplier: "LOYALTY_POINTS_MULTIPLIER",
  overallCap: "IBC_OVERALL_BURN_CAP",
  overallCapLegacy: "Overall Cap on Total Burn Amount",
  burnStart: "IBC_BURN_START_AT",
  totalRedeemed: "total_ibc_redeemed",
  conversionA: "IBC_CONVERSION_RATE_A",
  conversionB: "IBC_CONVERSION_RATE_B",
} as const;

const TIERS = [
  { id: "gold", tab: "BLU 1 / Gold", heading: "BLU 1 / Gold Configuration" },
  { id: "silver", tab: "BLU 2 / Silver", heading: "BLU 2 / Silver Configuration" },
  { id: "base", tab: "BLU 3 / Base", heading: "BLU 3 / Base Configuration" },
] as const;

type TierId = (typeof TIERS)[number]["id"];

function tierKeys(tierId: TierId) {
  const prefix = `IBC_TIER_${tierId.toUpperCase()}`;
  return {
    earnPercent: `${prefix}_EARN_PERCENT`,
    redemptionRate: `${prefix}_REDEMPTION_RATE`,
    conversionA: `${prefix}_CONVERSION_RATE_A`,
    conversionB: `${prefix}_CONVERSION_RATE_B`,
  };
}

function managedConfigKeys(): string[] {
  const tierKeyList = TIERS.flatMap((tier) => Object.values(tierKeys(tier.id)));
  return [
    ...Object.values(KEYS),
    "TOTAL_IBC_REDEEMED",
    "Total IBC Redeemed",
    ...tierKeyList,
  ];
}

const GLOBAL_ROWS = [
  { id: "loyaltyMultiplier", label: "LOYALTY_POINTS_MULTIPLIER" },
  { id: "burnEnable", label: "IBC_BURN_ENABLE" },
  { id: "tierConfigEnabled", label: "IBC_TIER_CONFIG_ENABLED" },
  { id: "overallCap", label: "Overall Cap on Total Burn Amount" },
  { id: "burnStart", label: "Burn cap start" },
  { id: "conversion", label: "Conversion Rate Config (Main)" },
] as const;

const TIER_ROWS = [
  { id: "earnPercent", label: "Tier control (Earn %)" },
  { id: "redemptionRate", label: "IBC Redemption Fees" },
  { id: "conversion", label: "Conversion Rate Config" },
] as const;

type AppConfigRow = Record<string, any>;
type EditTarget =
  | {
      kind: "single";
      row: AppConfigRow;
      label: string;
      numeric?: boolean;
      suffix?: string;
      expectedKey?: string;
    }
  | {
      kind: "conversion";
      rowA?: AppConfigRow;
      rowB?: AppConfigRow;
      label: string;
      allowZero?: boolean;
      expectedKeyA?: string;
      expectedKeyB?: string;
    };

function getConfigKey(row: AppConfigRow | undefined): string {
  return String(row?.config_key ?? row?.key ?? row?.name ?? "").trim();
}

function rowMatchesKey(row: AppConfigRow | undefined, expectedKey?: string): boolean {
  if (!expectedKey || !row) return true;
  return getConfigKey(row).toLowerCase() === expectedKey.toLowerCase();
}

function getConfigValue(row: AppConfigRow | undefined): string {
  const raw = row?.value ?? row?.config_value ?? "";
  return raw === null || raw === undefined ? "" : String(raw);
}

function parseMoney(value: unknown): number {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatPoints(amount: number): string {
  return amount.toLocaleString("en-IN");
}

function toDatetimeLocal(value: string): string {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : "";
}

function fromDatetimeLocal(value: string): string {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}:00` : "";
}

function nowIstInputValue(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

function isTruthyConfig(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function renderOnOff(on: boolean) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-6 w-11 items-center rounded-full px-0.5 transition ${
          on ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-sm font-medium text-gray-700">
        {on ? "true" : "false"}
      </span>
    </div>
  );
}

function valueFieldName(row: AppConfigRow): string {
  if (row.config_value !== undefined) return "config_value";
  if (row.value !== undefined) return "value";
  return "config_value";
}

const IbcManagement = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const SelectedPartner =
    OperationstoreData?.ReportSelectedPartner ||
    OperationstoreData?.selectedPartner ||
    "indigo";

  const [rows, setRows] = useState<AppConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTier, setActiveTier] = useState<TierId>("gold");
  const [pageView, setPageView] = useState<"settings" | "runbook">("settings");

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editValueB, setEditValueB] = useState("");

  const fetchConfig = useCallback(async () => {
    if (!SelectedPartner) return;
    setLoading(true);
    setError(null);
    try {
      const readRows = (res: any): AppConfigRow[] => {
        if (res?.code === 200 && Array.isArray(res.data)) return res.data;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res)) return res;
        return [];
      };
      const loadPage = (filters: Record<string, unknown>) =>
        CUSTOM_GENERIC_TABLE(SelectedPartner, {
          table: TABLE_NAME,
          limit: 500,
          page: 1,
          filters,
        });

      let dataArray: AppConfigRow[] = [];
      try {
        dataArray = readRows(
          await loadPage({ config_key: { in: managedConfigKeys() } }),
        );
      } catch (filterError) {
        console.error(filterError);
      }
      if (!dataArray.length) {
        dataArray = readRows(await loadPage({}));
      }

      setRows(dataArray);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load app_config");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [SelectedPartner]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchConfig();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [fetchConfig]);

  const findRowByKey = useCallback(
    (...keyNames: string[]) =>
      rows.find((r) =>
        keyNames.some(
          (keyName) => getConfigKey(r).toLowerCase() === keyName.toLowerCase(),
        ),
      ),
    [rows],
  );

  const burnEnableRow = findRowByKey(KEYS.burnEnable);
  const tierConfigRow = findRowByKey(KEYS.tierConfigEnabled);
  const multiplierRow = findRowByKey(KEYS.loyaltyMultiplier);
  const capRow = findRowByKey(KEYS.overallCap, KEYS.overallCapLegacy);
  const burnStartRow = findRowByKey(KEYS.burnStart);
  const conversionARow = findRowByKey(KEYS.conversionA);
  const conversionBRow = findRowByKey(KEYS.conversionB);
  const totalRedeemedRow = findRowByKey(
    KEYS.totalRedeemed,
    "TOTAL_IBC_REDEEMED",
    "Total IBC Redeemed",
  );

  const totalRedeemed = useMemo(() => {
    if (totalRedeemedRow) return parseMoney(getConfigValue(totalRedeemedRow));
    for (const r of rows) {
      if (r?.total_ibc_redeemed != null) {
        return parseMoney(r.total_ibc_redeemed);
      }
    }
    return 0;
  }, [rows, totalRedeemedRow]);

  const capValue = capRow ? parseMoney(getConfigValue(capRow)) : null;
  const remainingCap = capValue == null ? 0 : Math.max(0, capValue - totalRedeemed);
  const capKeepsBurnOff = capValue != null && capValue < DAILY_REMAINING_FLOOR;
  const belowDailyFloor =
    capValue != null &&
    capValue >= DAILY_REMAINING_FLOOR &&
    remainingCap < DAILY_REMAINING_FLOOR;
  const capBlocksBurn = capKeepsBurnOff || belowDailyFloor;
  const conversionA = conversionARow ? parseMoney(getConfigValue(conversionARow)) : 0;
  const conversionB = conversionBRow ? parseMoney(getConfigValue(conversionBRow)) : 0;
  const conversionTotal = conversionA + conversionB;

  const currentTierKeys = tierKeys(activeTier);
  const earnRow = findRowByKey(currentTierKeys.earnPercent);
  const redemptionRow = findRowByKey(currentTierKeys.redemptionRate);
  const tierConversionARow = findRowByKey(currentTierKeys.conversionA);
  const tierConversionBRow = findRowByKey(currentTierKeys.conversionB);
  const tierConversionA = tierConversionARow
    ? parseMoney(getConfigValue(tierConversionARow))
    : 0;
  const tierConversionB = tierConversionBRow
    ? parseMoney(getConfigValue(tierConversionBRow))
    : 0;
  const tierConversionTotal = tierConversionA + tierConversionB;
  const tierRowClash = (() => {
    const owner = new Map<string, string>();
    for (const tier of TIERS) {
      for (const keyName of Object.values(tierKeys(tier.id))) {
        const row = rows.find(
          (item) => getConfigKey(item).toLowerCase() === keyName.toLowerCase(),
        );
        if (row?.id == null) continue;
        const id = String(row.id);
        const previous = owner.get(id);
        if (previous && previous !== keyName) {
          return `${previous} and ${keyName} point at the same app_config row.`;
        }
        owner.set(id, keyName);
      }
    }
    return "";
  })();

  const openSingleEdit = (
    row: AppConfigRow | undefined,
    label: string,
    options: { numeric?: boolean; suffix?: string; expectedKey?: string } = {},
  ) => {
    if (!row) return;
    if (!rowMatchesKey(row, options.expectedKey)) return;
    setEditTarget({
      kind: "single",
      row,
      label,
      numeric: options.numeric,
      suffix: options.suffix,
      expectedKey: options.expectedKey,
    });
    setEditValue(getConfigValue(row));
    setEditValueB("");
    setEditOpen(true);
  };

  const openConversionEdit = (
    rowA: AppConfigRow | undefined,
    rowB: AppConfigRow | undefined,
    label: string,
    allowZero = false,
    expectedKeyA?: string,
    expectedKeyB?: string,
  ) => {
    if (!rowA && !rowB) return;
    if (!rowMatchesKey(rowA, expectedKeyA) || !rowMatchesKey(rowB, expectedKeyB)) {
      return;
    }
    setEditTarget({
      kind: "conversion",
      rowA,
      rowB,
      label,
      allowZero,
      expectedKeyA,
      expectedKeyB,
    });
    setEditValue(getConfigValue(rowA));
    setEditValueB(getConfigValue(rowB));
    setEditOpen(true);
  };

  const updateRowValue = async (row: AppConfigRow, nextValue: string) => {
    await CUSTOM_GENERIC_UPDATE(SelectedPartner, {
      table: TABLE_NAME,
      id: row.id,
      data: {
        [valueFieldName(row)]: nextValue,
      },
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    if (tierRowClash) {
      setError(tierRowClash);
      return;
    }

    if (editTarget.kind === "conversion") {
      if (
        !rowMatchesKey(editTarget.rowA, editTarget.expectedKeyA) ||
        !rowMatchesKey(editTarget.rowB, editTarget.expectedKeyB)
      ) {
        setError("This edit does not match the selected tier. Refresh and try again.");
        return;
      }
      const a = Number(editValue);
      const b = Number(editValueB);
      if (!Number.isFinite(a) || a < 0 || !Number.isFinite(b) || b < 0) {
        setError("Conversion rates A and B must be valid non-negative numbers");
        return;
      }
      if (!editTarget.allowZero && a === 0 && b === 0) {
        setError("At least one of A or B must be greater than 0");
        return;
      }
      if (!editTarget.rowA?.id && !editTarget.rowB?.id) {
        setError("Cannot update: missing conversion rate rows");
        return;
      }

      setSaving(true);
      setError(null);
      try {
        if (editTarget.rowA?.id) await updateRowValue(editTarget.rowA, String(a));
        if (editTarget.rowB?.id) await updateRowValue(editTarget.rowB, String(b));
        setEditOpen(false);
        setEditTarget(null);
        await fetchConfig();
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Update failed");
      } finally {
        setSaving(false);
      }
      return;
    }

    const keyName = getConfigKey(editTarget.row);
    if (!rowMatchesKey(editTarget.row, editTarget.expectedKey)) {
      setError("This edit does not match the selected tier. Refresh and try again.");
      return;
    }
    let nextValue = editValue;

    if (keyName === KEYS.overallCap || keyName === KEYS.overallCapLegacy) {
      const amount = parseMoney(nextValue);
      if (amount < 0 || Number.isNaN(amount)) {
        setError("Cap amount must be a valid non-negative number of IBC points");
        return;
      }
      nextValue = String(amount);
    }

    if (editTarget.numeric) {
      const n = Number(nextValue);
      if (!Number.isFinite(n) || n < 0) {
        setError("Value must be a valid non-negative number");
        return;
      }
      nextValue = String(n);
    }

    if (keyName === KEYS.burnEnable || keyName === KEYS.tierConfigEnabled) {
      nextValue = isTruthyConfig(nextValue) ? "true" : "false";
    }

    if (keyName === KEYS.burnStart) {
      if (!editValue.trim()) {
        nextValue = "";
      } else {
        nextValue = fromDatetimeLocal(editValue);
        if (!nextValue) {
          setError("Start time must be a valid date and time");
          return;
        }
      }
    }

    if (!editTarget.row?.id) {
      setError("Cannot update: missing row id");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateRowValue(editTarget.row, nextValue);
      setEditOpen(false);
      setEditTarget(null);
      await fetchConfig();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const missing = (label = "Not found in app_config") => (
    <span className="text-gray-400 text-sm">{label}</span>
  );

  const renderGlobalValue = (rowId: (typeof GLOBAL_ROWS)[number]["id"]) => {
    if (rowId === "burnEnable") {
      if (!burnEnableRow) return missing();
      return renderOnOff(isTruthyConfig(getConfigValue(burnEnableRow)));
    }

    if (rowId === "tierConfigEnabled") {
      if (!tierConfigRow) return missing();
      return renderOnOff(isTruthyConfig(getConfigValue(tierConfigRow)));
    }

    if (rowId === "loyaltyMultiplier") {
      if (!multiplierRow) return missing();
      return (
        <span className="text-sm font-medium text-gray-800">
          {getConfigValue(multiplierRow) || "-"}
        </span>
      );
    }

    if (rowId === "overallCap") {
      if (!capRow) return missing();
      return (
        <span className="text-sm font-medium text-gray-800">
          {formatPoints(parseMoney(getConfigValue(capRow)))}
        </span>
      );
    }

    if (rowId === "burnStart") {
      if (!burnStartRow) return missing();
      const value = getConfigValue(burnStartRow).trim();
      return (
        <span className="text-sm font-medium text-gray-800">
          {value || "Not set"}
        </span>
      );
    }

    if (!conversionARow && !conversionBRow) return missing();
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-800">
        <span>A = {conversionA}</span>
        <span>+</span>
        <span>B = {conversionB}</span>
        <span>=</span>
        <span>Total = {conversionTotal}</span>
      </div>
    );
  };

  const renderGlobalDetails = (rowId: (typeof GLOBAL_ROWS)[number]["id"]) => {
    if (rowId === "burnEnable") {
      const on = burnEnableRow
        ? isTruthyConfig(getConfigValue(burnEnableRow))
        : false;
      return (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            capKeepsBurnOff
              ? "border-red-200 bg-red-50 text-red-800"
              : on
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          {capKeepsBurnOff
            ? on
              ? "The switch is ON, but the overall cap is below 2,000, so burn is blocked. A cap of 0 leaves 0 points. The next fare search turns this switch OFF, and 00:00 IST does not turn it back on."
              : "IBC burning is DISABLED because the overall cap is below 2,000. A cap of 0 leaves 0 points. It stays off at 00:00 IST until the cap is at least 2,000."
            : on
              ? "IBC burning is currently ENABLED. It turns OFF automatically when today's remaining cap falls below 2,000, and turns back ON at 00:00 IST when the overall cap still allows it."
              : belowDailyFloor
                ? "IBC burning is currently DISABLED because today's remaining cap is below 2,000. It turns back ON at 00:00 IST. The configured cap is kept."
                : "IBC burning is currently DISABLED. At 00:00 IST it turns back ON when the overall cap still allows it."}
        </div>
      );
    }

    if (rowId === "tierConfigEnabled") {
      if (!tierConfigRow) {
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            This switch is not in app_config yet. Until the seed is applied,
            production keeps tier overrides off and other environments keep
            them on.
          </div>
        );
      }
      const on = isTruthyConfig(getConfigValue(tierConfigRow));
      return (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            on
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          {on
            ? "Tier overrides are ON. A mapped BLU tier uses that tier's earn %, redemption fee, and conversion A/B."
            : "Tier overrides are OFF. Everyone uses the global rows. The tier values below stay stored and are not read."}
        </div>
      );
    }

    if (rowId === "loyaltyMultiplier") {
      const mult = multiplierRow ? getConfigValue(multiplierRow) : "—";
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Global earn rate is {mult}% of qualifying fare. A mapped BLU tier
          uses that tier's Earn % when IBC_TIER_CONFIG_ENABLED is true.
        </div>
      );
    }

    if (rowId === "overallCap") {
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 space-y-1">
          <div>
            Current Total IBC Redeemed:{" "}
            <strong>{formatPoints(totalRedeemed)} points</strong>
          </div>
          <div
            className={`font-medium ${
              capBlocksBurn ? "text-red-700" : "text-green-700"
            }`}
          >
            Remaining Cap: {formatPoints(remainingCap)} points
          </div>
          <div className="text-xs text-blue-700">
            Redeemed total counts confirmed bookings only. It is read-only from{" "}
            <code>total_ibc_redeemed</code> and resets to 0 at 00:00 IST. The
            cap is in IBC points and stays until you change it. 0 blocks burn.
            A cap below 2,000 keeps the switch off through midnight.
          </div>
          {capKeepsBurnOff && (
            <div className="text-xs text-red-700">
              Overall cap is below 2,000, so burn stays off. Midnight does not
              turn it back on.
            </div>
          )}
          {belowDailyFloor && (
            <div className="text-xs text-red-700">
              Remaining cap is below 2,000, so burn stays off for the rest of
              today.
            </div>
          )}
        </div>
      );
    }

    if (rowId === "burnStart") {
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Asia/Kolkata time. Saving a new time releases open PREBOOK holds
          created before it and rebuilds the pending total from holds created
          after it. Confirmed redemptions stay. Use the current time to reset
          abandoned prebooks. Leave it blank to count every open hold.
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        Global A and B are used as <code>rpm = A + (B × score)</code> unless
        IBC_TIER_CONFIG_ENABLED is true and the user's tier has its own
        conversion rates (A + B greater than 0).
      </div>
    );
  };

  const canEditGlobal = (rowId: (typeof GLOBAL_ROWS)[number]["id"]) => {
    if (rowId === "burnEnable") return Boolean(burnEnableRow);
    if (rowId === "tierConfigEnabled") return Boolean(tierConfigRow);
    if (rowId === "loyaltyMultiplier") return Boolean(multiplierRow);
    if (rowId === "overallCap") return Boolean(capRow);
    if (rowId === "burnStart") return Boolean(burnStartRow);
    return Boolean(conversionARow || conversionBRow);
  };

  const onEditGlobal = (rowId: (typeof GLOBAL_ROWS)[number]["id"]) => {
    if (rowId === "burnEnable") {
      return openSingleEdit(burnEnableRow, "IBC_BURN_ENABLE", {
        expectedKey: KEYS.burnEnable,
      });
    }
    if (rowId === "tierConfigEnabled") {
      return openSingleEdit(tierConfigRow, "IBC_TIER_CONFIG_ENABLED", {
        expectedKey: KEYS.tierConfigEnabled,
      });
    }
    if (rowId === "loyaltyMultiplier") {
      return openSingleEdit(multiplierRow, "LOYALTY_POINTS_MULTIPLIER", {
        numeric: true,
        expectedKey: KEYS.loyaltyMultiplier,
      });
    }
    if (rowId === "overallCap") {
      return openSingleEdit(capRow, "Overall Cap on Total Burn Amount", {
        numeric: true,
        expectedKey: getConfigKey(capRow),
      });
    }
    if (rowId === "burnStart") {
      if (!burnStartRow) return;
      setEditTarget({
        kind: "single",
        row: burnStartRow,
        label: "Burn cap start",
        expectedKey: KEYS.burnStart,
      });
      setEditValue(toDatetimeLocal(getConfigValue(burnStartRow)));
      setEditValueB("");
      setEditOpen(true);
      return;
    }
    return openConversionEdit(
      conversionARow,
      conversionBRow,
      "Conversion Rate Config (Main)",
      false,
      KEYS.conversionA,
      KEYS.conversionB,
    );
  };

  const renderTierValue = (rowId: (typeof TIER_ROWS)[number]["id"]) => {
    if (rowId === "earnPercent") {
      if (!earnRow) return missing();
      return (
        <span className="text-sm font-medium text-gray-800">
          {getConfigValue(earnRow)} %
          <span className="block text-xs font-normal text-gray-400 mt-1">
            {currentTierKeys.earnPercent}
          </span>
        </span>
      );
    }
    if (rowId === "redemptionRate") {
      if (!redemptionRow) return missing();
      return (
        <span className="text-sm font-medium text-gray-800">
          {getConfigValue(redemptionRow)}
          <span className="block text-xs font-normal text-gray-400 mt-1">
            {currentTierKeys.redemptionRate}
          </span>
        </span>
      );
    }
    if (!tierConversionARow && !tierConversionBRow) return missing();
    return (
      <div className="text-sm font-medium text-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <span>A = {tierConversionA}</span>
          <span>+</span>
          <span>B = {tierConversionB}</span>
          <span>=</span>
          <span>Total = {tierConversionTotal}</span>
        </div>
        <span className="block text-xs font-normal text-gray-400 mt-1">
          {currentTierKeys.conversionA} / {currentTierKeys.conversionB}
        </span>
      </div>
    );
  };

  const renderTierDetails = (rowId: (typeof TIER_ROWS)[number]["id"]) => {
    if (rowId === "earnPercent") {
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Earn percentage for this tier. Overrides{" "}
          <code>LOYALTY_POINTS_MULTIPLIER</code> for mapped users.
        </div>
      );
    }
    if (rowId === "redemptionRate") {
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Redemption rate for this tier. 0 means no redemption fee. Overrides
          the global fee for mapped users.
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        {tierConversionTotal > 0
          ? "This tier's A and B replace the global conversion rates for mapped users."
          : "A + B is 0, so mapped users still use Conversion Rate Config (Main)."}
      </div>
    );
  };

  const canEditTier = (rowId: (typeof TIER_ROWS)[number]["id"]) => {
    if (rowId === "earnPercent") return Boolean(earnRow);
    if (rowId === "redemptionRate") return Boolean(redemptionRow);
    return Boolean(tierConversionARow || tierConversionBRow);
  };

  const onEditTier = (rowId: (typeof TIER_ROWS)[number]["id"]) => {
    if (rowId === "earnPercent") {
      return openSingleEdit(earnRow, "Tier control (Earn %)", {
        numeric: true,
        suffix: "%",
        expectedKey: currentTierKeys.earnPercent,
      });
    }
    if (rowId === "redemptionRate") {
      return openSingleEdit(redemptionRow, "IBC Redemption Fees", {
        numeric: true,
        expectedKey: currentTierKeys.redemptionRate,
      });
    }
    return openConversionEdit(
      tierConversionARow,
      tierConversionBRow,
      `${TIERS.find((t) => t.id === activeTier)?.tab} Conversion Rate Config`,
      true,
      currentTierKeys.conversionA,
      currentTierKeys.conversionB,
    );
  };

  const renderConfigTable = (
    tableRows: ReadonlyArray<{ id: string; label: string }>,
    renderValue: (id: any) => ReactNode,
    renderDetails: (id: any) => ReactNode,
    canEdit: (id: any) => boolean,
    onEdit: (id: any) => void,
  ) => (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="min-w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-12">
              #
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600">
              Key / Configuration
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600">
              Value
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600">
              Additional Details
            </th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-28">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, index) => (
            <tr key={row.id} className="border-b border-gray-100 align-top">
              <td className="px-4 py-4 text-sm text-gray-500">{index + 1}</td>
              <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                {row.label}
              </td>
              <td className="px-4 py-4">{renderValue(row.id)}</td>
              <td className="px-4 py-4 min-w-[280px]">
                {renderDetails(row.id)}
              </td>
              <td className="px-4 py-4">
                <button
                  type="button"
                  disabled={!canEdit(row.id)}
                  onClick={() => onEdit(row.id)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-400 text-gray-900 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const editTitle = editTarget?.label || "";

  return (
    <div>
      <PageMeta
        title="IBC Management"
        description="Manage global and tier-specific IBC configurations"
      />

      <div className="bg-white p-6 mx-auto max-w-full rounded-xl shadow-lg mt-0">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">IBC Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage global and tier-specific IBC configurations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setPageView("settings")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${
              pageView === "settings"
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setPageView("runbook")}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${
              pageView === "runbook"
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Runbook
          </button>
        </div>

        {pageView === "runbook" ? (
          <IbcRunbook />
        ) : (
          <>
        <PartnerTab />

        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Global Configurations
          </h3>
          {renderConfigTable(
            GLOBAL_ROWS,
            renderGlobalValue,
            renderGlobalDetails,
            canEditGlobal,
            onEditGlobal,
          )}
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Tier-Based Configurations
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Base, Silver, and Gold each store their own earn %, redemption
            fee, and conversion rates. Saving one tier writes only that tier's
            keys and leaves the other two unchanged. These values replace the
            matching global settings for a mapped BLU tier only while
            IBC_TIER_CONFIG_ENABLED is true.
          </p>
          {tierRowClash && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {tierRowClash} Refresh after the duplicate row is removed. Saving
              is blocked while two tiers share one row.
            </div>
          )}
          {tierConfigRow && !isTruthyConfig(getConfigValue(tierConfigRow)) && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              IBC_TIER_CONFIG_ENABLED is false, so these tier rows are stored
              and not used. Mapped users keep the global settings.
            </div>
          )}

          <div className="flex flex-wrap gap-1 mb-0">
            {TIERS.map((tier) => {
              const selected = activeTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setActiveTier(tier.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg border ${
                    selected
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {tier.tab}
                </button>
              );
            })}
          </div>

          <div className="border border-gray-200 rounded-b-xl rounded-tr-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {TIERS.find((t) => t.id === activeTier)?.heading}
            </h4>
            {renderConfigTable(
              TIER_ROWS,
              renderTierValue,
              renderTierDetails,
              canEditTier,
              onEditTier,
            )}
          </div>
        </section>

        {!loading && rows.length === 0 && !error && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No app_config rows returned. Check partner / API access.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <h3 className="font-semibold mb-2">How it works</h3>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                Global settings apply to every user unless that user has a
                mapped BLU tier.
              </li>
              <li>
                BLU 1 is Gold, BLU 2 is Silver, BLU 3 is Base. When{" "}
                <code>IBC_TIER_CONFIG_ENABLED</code> is true, a mapped tier's
                Earn %, redemption rate, and conversion A/B replace the global
                values. When it is false, everyone uses the global rows.
              </li>
              <li>
                Remaining = Cap − confirmed redeemed, in IBC points. The day
                runs 00:00–23:59 IST.
              </li>
              <li>
                When remaining falls below 2,000,{" "}
                <code>IBC_BURN_ENABLE</code> turns false for the rest of that
                day. Exactly 2,000 stays on.
              </li>
              <li>
                At 00:00 IST the redeemed total resets to 0 and the cap is kept.
                Burn turns back on only when that cap is at least 2,000. A cap
                of 0 stays off.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <h3 className="font-semibold mb-2">Example Scenario</h3>
            <div className="space-y-1">
              <div>
                Configured Cap:{" "}
                {capValue == null ? "Not set" : `${formatPoints(capValue)} points`}
              </div>
              <div>Redeemed: {formatPoints(totalRedeemed)} points</div>
              <div>Remaining: {formatPoints(remainingCap)} points</div>
            </div>
          </div>

          <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-pink-900">
            <h3 className="font-semibold mb-2">
              When remaining cap falls below 2,000
            </h3>
            <p>
              The booking API sets <code>IBC_BURN_ENABLE</code> to{" "}
              <strong>false</strong> once today's confirmed remaining cap is
              below 2,000. Burn stays off for the rest of that day. At 00:00 IST
              the redeemed total resets and the switch turns on again, using the
              same overall cap unless you change it.
            </p>
          </div>
        </div>
          </>
        )}
      </div>

      {editOpen && editTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-[420px] max-w-[95vw]">
            <h3 className="text-lg font-bold mb-1">Update Config</h3>
            <p className="text-sm text-gray-500 mb-4">{editTitle}</p>

            {editTarget.kind === "conversion" ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">A</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="w-full p-2 border rounded-lg"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">B</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="w-full p-2 border rounded-lg"
                    value={editValueB}
                    onChange={(e) => setEditValueB(e.target.value)}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Total = {parseMoney(editValue) + parseMoney(editValueB)}
                </p>
              </div>
            ) : getConfigKey(editTarget.row) === KEYS.burnEnable ||
              getConfigKey(editTarget.row) === KEYS.tierConfigEnabled ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Value</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={isTruthyConfig(editValue) ? "true" : "false"}
                  onChange={(e) => setEditValue(e.target.value)}
                >
                  <option value="true">true (On)</option>
                  <option value="false">false (Off)</option>
                </select>
              </div>
            ) : getConfigKey(editTarget.row) === KEYS.burnStart ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Start time (IST)
                </label>
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded-lg"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-800"
                    onClick={() => setEditValue(nowIstInputValue())}
                  >
                    Use current time
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-800"
                    onClick={() => setEditValue("")}
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Open PREBOOK holds created before this time are released.
                  Confirmed burn stays.
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {getConfigKey(editTarget.row) === KEYS.overallCap ||
                  getConfigKey(editTarget.row) === KEYS.overallCapLegacy
                    ? "Amount (IBC points)"
                    : editTarget.suffix
                      ? `Value (${editTarget.suffix})`
                      : "Value"}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="w-full p-2 border rounded-lg"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
                {(getConfigKey(editTarget.row) === KEYS.overallCap ||
                  getConfigKey(editTarget.row) === KEYS.overallCapLegacy) && (
                  <p className="mt-2 text-xs text-gray-500">
                    Current total_ibc_redeemed is {formatPoints(totalRedeemed)}{" "}
                    points and cannot be edited here. 0 blocks burn. Set at
                    least 2,000 points to allow it.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IbcManagement;
