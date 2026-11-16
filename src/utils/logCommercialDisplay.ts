/**
 * Booking / conversion log commercial columns.
 * IndigoCab sends these fields already resolved (see utils/bookingLogCommercials.js);
 * the fallbacks only cover APIs that do not send them yet.
 */
type LogCommercialFields = {
  persona?: string | null;
  paymentMode?: string | null;
  payType?: string | null;
  bluechip?: number | string | boolean | null;
  loyalty_points_disbursed?: number | string | null;
  ibc_earn?: number | string | null;
  ibc_points_earned?: number | string | null;
  ibc_burn_percent?: string | number | null;
};

function fields(record: object): LogCommercialFields {
  return record as LogCommercialFields;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function paymentModeText(r: LogCommercialFields): string {
  return String(r.paymentMode ?? r.payType ?? "")
    .trim()
    .toLowerCase();
}

function isB2cLoyaltyUser(r: LogCommercialFields): boolean {
  return String(r.persona ?? "").trim().toLowerCase() === "b2c loyalty user";
}

function isIbcPayment(r: LogCommercialFields): boolean {
  return String(r.paymentMode ?? "").trim().toLowerCase().includes("ibc");
}

/** B2C loyalty: 1 unless paid with IBC. Every other persona: 0. */
export function getIbcEarnColumnValue(record: object): number {
  const r = fields(record);
  if (hasValue(r.ibc_earn)) return Number(r.ibc_earn) || 0;
  if (!isB2cLoyaltyUser(r)) return 0;
  return isIbcPayment(r) ? 0 : 1;
}

/** IBC Points Earned keeps the payment-mode rule and does not follow persona. */
export function getIbcPointsEarnedColumnValue(record: object): number {
  const r = fields(record);
  if (hasValue(r.ibc_points_earned)) return Number(r.ibc_points_earned) || 0;
  const mode = paymentModeText(r);
  if (mode.includes("ibc")) return 0;
  if (mode === "partial" || mode === "full") return 1;
  return Number(r.bluechip) || 0;
}

export function getBluechipColumnValue(record: object): number {
  const r = fields(record);
  if (hasValue(r.ibc_earn)) return Number(r.bluechip) || 0;
  if (!isB2cLoyaltyUser(r) || isIbcPayment(r)) return 0;
  return Number(r.bluechip) || 0;
}

export function getLoyaltyPointsColumnValue(record: object): number {
  const r = fields(record);
  if (!hasValue(r.ibc_earn) && isB2cLoyaltyUser(r) && isIbcPayment(r)) return 0;
  return Number(r.loyalty_points_disbursed) || 0;
}

export function getIbcBurnPercentColumnValue(record: object): string {
  const r = fields(record);
  return hasValue(r.ibc_burn_percent) ? String(r.ibc_burn_percent) : "0%";
}

/** Engagement Reserve INR: at most one decimal place. Whole numbers stay whole. */
export function formatEngagementReserveInr(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Show at most 2 decimal places. Whole numbers stay whole. */
export function formatLogAmount(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "string" && value.trim() === "") return "-";
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(value);
  return String(Math.round(n * 100) / 100);
}

function leadingNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const match = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function readIbcDisplay(record: object, key: string): unknown {
  const items = (record as { ibcFareDisplay?: { key?: string; value?: unknown }[] })
    .ibcFareDisplay;
  if (!Array.isArray(items)) return undefined;
  return items.find((item) => item?.key === key)?.value;
}

/** Total fare / (Total IBC Redeemed − redemption fee). Example: 1000 / (4150 − 150) = 0.25. */
export function getConversionRateColumnValue(record: object): string {
  const row = record as {
    totalFare?: unknown;
    totalIbcRedeemed?: unknown;
    ibcRedemptionFee?: unknown;
  };
  const fare = leadingNumber(row.totalFare);
  const redeemed = leadingNumber(
    row.totalIbcRedeemed ?? readIbcDisplay(record, "total_ibc_redeemed"),
  );
  const fee =
    leadingNumber(
      row.ibcRedemptionFee ??
        readIbcDisplay(record, "redemptoon_fee") ??
        readIbcDisplay(record, "redemption_fee"),
    ) ?? 0;
  if (fare == null || redeemed == null || redeemed <= 0) return "-";
  const denominator = redeemed - fee;
  if (!(denominator > 0)) return "-";
  return String(Math.round((fare / denominator) * 100) / 100);
}
