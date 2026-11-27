import { AvailablecabPartners } from "../config/customerCare/constant";

export const SWIGGY_OPS_USERNAME = "swiggy-ops";

/** IndiGo Customer Care login. Sidebar is only Customer Care → Home. */
export const INDIGO_CX_USERNAME = "indigo-cx";

export function isIndigoCxUser(
  username?: string | null,
  userRights?: string | null,
): boolean {
  if (getLoginUsername(username).toLowerCase() === INDIGO_CX_USERNAME) return true;
  const ids = String(userRights ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!ids.length || ids.includes("ALL")) return false;
  return ids.every((id) => id === "4.1" || id === "4.0");
}

/** Platform logins. A name outside this list in `partner` is a cab-partner lock. */
const PLATFORM_LOGIN_PARTNERS = new Set([
  "aggregator",
  "indigo",
  "bac",
  "ixigo",
  "travelvip",
  "yatra",
  "railyatri",
  "ondc",
  "stage",
  "phonepe",
  "oneticket",
  "mojo",
  "all",
  "bac_agent",
  "bac_mb",
  "bac_yatra",
  "bac_corp",
  "bac_swiggy",
  "bac_agentic_chat_dev",
  "bac_agentic_chat",
]);

function canonicalCabPartner(value: string) {
  const trimmed = value.trim();
  return (
    AvailablecabPartners.find(
      (partner) => partner.toLowerCase() === trimmed.toLowerCase(),
    ) || trimmed
  );
}

/** Cab partners this login is allowed to see. Empty means every partner. */
export function resolveLockedCabPartners(
  loginPartners?: string[] | null,
  logsPartner?: string | null,
): string[] {
  const locked: string[] = [];
  const add = (raw?: string | null) => {
    const value = String(raw ?? "").trim();
    if (!value || value.toLowerCase() === "null") return;
    const canonical = canonicalCabPartner(value);
    if (locked.some((partner) => partner.toLowerCase() === canonical.toLowerCase())) {
      return;
    }
    locked.push(canonical);
  };

  add(logsPartner);

  for (const partner of loginPartners || []) {
    const value = String(partner ?? "").trim();
    if (!value || PLATFORM_LOGIN_PARTNERS.has(value.toLowerCase())) continue;
    add(value);
  }

  return locked;
}

/** Railyatri ops login — Revenue Performance hidden on dashboard. */
export const RAILYATRI_OPS_USERNAME = "railyatri-ops";

/** Yatra ops login — BAC restricted to Yatra domain only. */
export const YATRA_OPS_USERNAME = "yatra-ops";
export const YATRA_OPS_BAC_PARTNER = "bac_yatra";
export const YATRA_OPS_BAC_TAB_LABEL = "Yatra";

/** BAC Swiggy/Crew sub-tab — filters by createdBy, not domain. */
export const BAC_SWIGGY_PARTNER = "bac_swiggy";
export const SWIGGY_OPS_CREATED_BY = "swiggy-ops";

/** Trip_Cancel / Cancel Booking: all BAC tabs skip domain and createdBy. */
export function shouldSkipTripCancelDomain(partner?: string | null): boolean {
  const normalized = String(partner ?? "").trim().toLowerCase();
  return normalized === "bac" || normalized.startsWith("bac_");
}

export function isBacSwiggyPartner(partner?: string | null): boolean {
  return String(partner ?? "").trim().toLowerCase() === BAC_SWIGGY_PARTNER;
}

/** Invoice API host — BAC tab bookings use Yatra-prod (Postman: yatra-prodapi). */
export const YATRA_PROD_INVOICE_API_HOST =
  "https://yatra-prodapi.bookairportcab.com";

export function resolveInvoiceApiPartner(partner?: string | null): string {
  const normalized = String(partner ?? "").trim().toLowerCase();
  if (normalized === "bac" || normalized === "bac_yatra") return "yatra";
  return normalized;
}

/** Auth for Yatra-prod invoice when login has no dedicated `yatra` partner entry. */
export function getYatraProdInvoiceAuth(
  partnerWiseData?: Record<string, { auth?: string }> | null,
  loginJwt?: string,
): string {
  const pwd = partnerWiseData ?? {};
  return (
    pwd.yatra?.auth ||
    pwd.bac?.auth ||
    pwd.indigo?.auth ||
    loginJwt ||
    ""
  );
}

export function getBookingCreatedByValue(
  record?: Record<string, unknown> | null,
): string {
  const value = record?.createdBy ?? record?.created_by;
  if (value == null || value === "") return "";
  return String(value).trim().toLowerCase();
}

export function isSwiggyOpsCreatedBooking(
  record?: Record<string, unknown> | null,
): boolean {
  return getBookingCreatedByValue(record) === SWIGGY_OPS_CREATED_BY.toLowerCase();
}

type BookingLogsPage = {
  bookings?: unknown[];
  totalRecords?: number;
  totalPages?: number;
  limit?: number;
  currentPage?: number;
};

/** Backend may ignore createdBy filter — keep only swiggy-ops bookings on bac_swiggy tab. */
export function filterSwiggyOpsBookingLogsPage<T extends BookingLogsPage>(
  data: T,
): T {
  const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
  const filtered = bookings.filter((booking) =>
    isSwiggyOpsCreatedBooking(booking as Record<string, unknown>),
  );
  const limit = Number(data?.limit) || 10;
  const totalRecords = filtered.length;

  return {
    ...data,
    bookings: filtered,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit) || 1),
  };
}

/** Swiggy-ops login uses bac_swiggy with createdBy filter. */
export const SWIGGY_OPS_BAC_PARTNER = BAC_SWIGGY_PARTNER;

/** Display label for BAC sub-tab on swiggy-ops login. */
export const SWIGGY_OPS_BAC_TAB_LABEL = "Swiggy/Crew";

/**
 * Booking / Conversion log columns that only exist on the Indigo API.
 * Hidden for every other partner tab, including All.
 */
export const INDIGO_ONLY_LOG_COLUMN_KEYS = new Set([
  "persona",
  "customerId",
  "bookingConfirmedIstTime",
  "cancelledIstTime",
  "completedIstTime",
  "userAgent",
  "paymentMode",
  "offerCode",
  "promotionDiscountPercent",
  "baseFare",
  "tax",
  "tollCharges",
  "total_ibc_redeemed",
  "ibc_voucher",
  "ibc_voucher_name",
  "ibc_points",
  "redemptoon_fee",
  "loyalty_points_disbursed",
]);

/** Column keys hidden on Booking Logs for swiggy-ops login. */
export const SWIGGY_OPS_HIDDEN_BOOKING_LOG_KEYS = new Set([
  "persona",
  "prebookIstTime",
  "paymentCaptureIstTime",
  "paymentFailedIstTime",
  "bookingConfirmedIstTime",
  "cancelledIstTime",
  "completedIstTime",
  "cabBookingFailedIstTime",
  "deviceType",
  "userAgent",
  "offerCode",
  "promotionDiscountPercent",
  "discountApplied",
  "loyalty_points_disbursed",
  "ibc_burn_percent",
  "tollCharges",
]);

/** Column keys hidden on Conversion Logs for swiggy-ops login. */
export const SWIGGY_OPS_HIDDEN_CONVERSION_LOG_KEYS = new Set([
  "persona",
  "deviceType",
  "userAgent",
  "offerCode",
  "promotionDiscountPercent",
  "discountApplied",
  "indigo_listing_fee_percent",
  "indigo_listing_fee_inr",
  "partner_fee_percent",
  "partner_fee_inr",
  "bluechip",
  "ffn",
  "loyalty_points_disbursed",
  "ibc_burn_percent",
]);

/** Conversion Logs columns hidden for restricted ops logins (swiggy / railyatri / yatra). */
export const RESTRICTED_OPS_HIDDEN_CONVERSION_LOG_KEYS = new Set([
  "indigo_listing_fee_percent",
  "indigo_listing_fee_inr",
  "partner_fee_percent",
  "partner_fee_inr",
  "bluechip",
  "ffn",
  "loyalty_points_disbursed",
  "ibc_burn_percent",
]);

export function isSwiggyOpsUser(username?: string | null): boolean {
  return String(username ?? "").trim().toLowerCase() === SWIGGY_OPS_USERNAME;
}

export function isRailyatriOpsUser(username?: string | null): boolean {
  return (
    String(username ?? "").trim().toLowerCase() === RAILYATRI_OPS_USERNAME
  );
}

/** Login whose only platform partner is RailYatri. */
export function isRailyatriOnlyLogin(
  loginPartners?: string[] | null,
): boolean {
  const platforms = (loginPartners || [])
    .map((partner) => String(partner ?? "").trim().toLowerCase())
    .filter(
      (partner) =>
        partner && PLATFORM_LOGIN_PARTNERS.has(partner) && partner !== "all",
    );
  return platforms.length > 0 && platforms.every((partner) => partner === "railyatri");
}

/** RailYatri logins see NPS Record only, not NPS Partner Day. */
export function shouldHideNpsPartnerDay(
  username?: string | null,
  loginPartners?: string[] | null,
): boolean {
  const login = getLoginUsername(username);
  return isRailyatriOpsUser(login) || isRailyatriOnlyLogin(loginPartners);
}

/** Partners that expose CloudWatch logs on Handle Booking (same API host as ops). */
const CLOUDWATCH_LOG_PARTNERS = new Set([
  "indigo",
  "railyatri",
  "yatra",
  "bac",
  "bac_yatra",
  "stage",
]);

export function isCloudWatchLogsPartner(partner?: string | null): boolean {
  return CLOUDWATCH_LOG_PARTNERS.has(
    String(partner ?? "").trim().toLowerCase(),
  );
}

export function isYatraOpsUser(username?: string | null): boolean {
  return String(username ?? "").trim().toLowerCase() === YATRA_OPS_USERNAME;
}

export function isRestrictedOpsConversionLogUser(
  username?: string | null,
): boolean {
  const login = getLoginUsername(username);
  return (
    isSwiggyOpsUser(login) ||
    isRailyatriOpsUser(login) ||
    isYatraOpsUser(login)
  );
}

export function getLoginUsername(
  reduxUsername?: string | null,
): string {
  return String(reduxUsername ?? sessionStorage.getItem("userName") ?? "").trim();
}

/** Dashboard Revenue Performance hidden for restricted ops logins. */
export function shouldHideDashboardRevenuePerformance(
  username?: string | null,
): boolean {
  const login = getLoginUsername(username);
  return (
    isRailyatriOpsUser(login) ||
    isSwiggyOpsUser(login) ||
    isYatraOpsUser(login)
  );
}

/** Dev ops logins (e.g. operations-dev) route trip event APIs to preprod. */
export function isDevOperationsLogin(username?: string | null): boolean {
  return getLoginUsername(username).toLowerCase().endsWith("-dev");
}

/** "operations dev" and "operations-dev" are the same dev-panel account. */
export function isDevPanelLogin(username?: string | null): boolean {
  const login = getLoginUsername(username).toLowerCase().replace(/\s+/g, "-");
  return login.endsWith("-dev");
}

/**
 * Dev login: a Yatra/BAC booking detail call against the Yatra host returns 403,
 * and that 403 logs the user out. Those bookings already load through BAC.
 * Every other login keeps the partner it already uses.
 */
export function bookingDetailPartner(
  partner: string,
  username?: string | null,
  loginPartners?: string[] | null,
): string {
  const normalized = String(partner || "").trim().toLowerCase();
  if (normalized !== "yatra" || !isDevPanelLogin(username)) return partner;
  const hasBac = (loginPartners || []).some(
    (name) => String(name).toLowerCase() === "bac",
  );
  return hasBac ? "bac" : partner;
}

export function getMojoEventApiBaseUrl(username?: string | null): string {
  if (isDevOperationsLogin(username)) {
    return (
      (import.meta.env.VITE_MOJO_EVENT_PREPROD_domain as string) ||
      "https://preprodapi.mojoboxx.com/preprod/webapi/"
    );
  }

  return import.meta.env.VITE_MOJO_domain as string;
}

/** Normalize legacy persisted partner key after swiggy-ops login. */
export function resolveSwiggyOpsPartner(
  partner: string | undefined | null,
  username?: string | null,
): string {
  if (!isSwiggyOpsUser(username)) return String(partner ?? "");
  const normalized = String(partner ?? "").trim();
  if (
    normalized === "bac" ||
    normalized === BAC_SWIGGY_PARTNER ||
    normalized.startsWith("bac_")
  ) {
    return SWIGGY_OPS_BAC_PARTNER;
  }
  return normalized;
}

/** Lock BAC context to Yatra domain for yatra-ops login. */
export function resolveYatraOpsPartner(
  partner: string | undefined | null,
  username?: string | null,
): string {
  if (!isYatraOpsUser(username)) return String(partner ?? "");
  const normalized = String(partner ?? "").trim();
  if (normalized === "bac" || normalized.startsWith("bac_")) {
    return YATRA_OPS_BAC_PARTNER;
  }
  return normalized;
}

/** Resolve restricted BAC partner for ops-specific logins. */
export function resolveRestrictedBacPartner(
  partner: string | undefined | null,
  username?: string | null,
): string {
  const login = getLoginUsername(username);
  if (isSwiggyOpsUser(login)) {
    return resolveSwiggyOpsPartner(partner, login);
  }
  if (isYatraOpsUser(login)) {
    return resolveYatraOpsPartner(partner, login);
  }
  return String(partner ?? "");
}

export function getRestrictedBacPartner(username?: string | null): string | null {
  const login = getLoginUsername(username);
  if (isSwiggyOpsUser(login)) return SWIGGY_OPS_BAC_PARTNER;
  if (isYatraOpsUser(login)) return YATRA_OPS_BAC_PARTNER;
  return null;
}

export function getRestrictedBacTabLabel(username?: string | null): string | null {
  const login = getLoginUsername(username);
  if (isSwiggyOpsUser(login)) return SWIGGY_OPS_BAC_TAB_LABEL;
  if (isYatraOpsUser(login)) return YATRA_OPS_BAC_TAB_LABEL;
  return null;
}

export function isRestrictedBacOpsUser(username?: string | null): boolean {
  const login = getLoginUsername(username);
  return isSwiggyOpsUser(login) || isYatraOpsUser(login);
}

function getColumnIdentity(column: {
  key?: string | number;
  dataIndex?: string | number;
}): string {
  const key = String(column.key ?? "").trim();
  if (key) return key;
  return String(column.dataIndex ?? "").trim();
}

/** Hide restricted analytics columns for ops-specific logins; others unchanged. */
export function filterSwiggyOpsLogColumns<T extends { key?: string | number; dataIndex?: string | number }>(
  columns: T[],
  page: "bookingLog" | "conversionLog",
  username?: string | null,
): T[] {
  const login = getLoginUsername(username);

  if (page === "bookingLog") {
    if (!isSwiggyOpsUser(login)) return columns;
    return columns.filter(
      (column) => !SWIGGY_OPS_HIDDEN_BOOKING_LOG_KEYS.has(getColumnIdentity(column)),
    );
  }

  if (!isRestrictedOpsConversionLogUser(login)) return columns;

  const hiddenKeys = isSwiggyOpsUser(login)
    ? SWIGGY_OPS_HIDDEN_CONVERSION_LOG_KEYS
    : RESTRICTED_OPS_HIDDEN_CONVERSION_LOG_KEYS;

  return columns.filter((column) => !hiddenKeys.has(getColumnIdentity(column)));
}

/** Keep Indigo-only log columns on the Indigo tab; drop them for every other partner. */
export function filterIndigoOnlyLogColumns<
  T extends { key?: string | number; dataIndex?: string | number },
>(columns: T[], partner?: string | null): T[] {
  if (String(partner || "").toLowerCase() === "indigo") return columns;
  return columns.filter(
    (column) => !INDIGO_ONLY_LOG_COLUMN_KEYS.has(getColumnIdentity(column)),
  );
}
