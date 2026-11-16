export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const WIZARD_STEPS = ["Offer", "Rules", "Limits", "Review"] as const;

export const OFFER_TABLES = [
  { value: "offers", label: "Offers" },
  { value: "offer_rules", label: "Offer Rules" },
  { value: "offer_limits", label: "Offer Limits" },
  { value: "offer_transactions", label: "Transactions" },
] as const;

// export const BROWSE_TABS = [
//   ...OFFER_TABLES,
//   { value: "analytics", label: "Reports" },
// ] as const;

export const ANALYTICS_TABLE_VALUE = "analytics";
export const AUDIT_LOG_TABLE_VALUE = "audit_log";

 
export const BROWSE_TABS = [
  ...OFFER_TABLES,
  { value: ANALYTICS_TABLE_VALUE, label: "Reports" },
  { value: AUDIT_LOG_TABLE_VALUE, label: "Audit Log" },
] as const;


export const CLIENT_ID_MAP: Record<string, string> = {
  indigo: "ING",
  ixigo: "IXIGO",
  mojoboxx: "MOJOBOXX",
  bac: "YTR",
  yatra: "YTR",
};

export interface OfferForm {
  offer_id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  type: "flat" | "percentage";
  discount_value: string;
  max_discount: string;
  min_cart_value: string;
  priority: string;
  is_stackable: string;
  status: string;
  client_id: string;
  userVisibility: string;
  tnc: string;
  start_time_local: string;
  end_time_local: string;
}

export interface RulePresets {
  user_type: string;
  device_type: string;
  cab_partner: string;
  cities: string;
  exclude_cities: string;
  is_new_user: string;
  ride_count: string;
  customer_ids: string;
  scheduleDays: Record<string, boolean>;
  scheduleStart: string;
  scheduleEnd: string;
}

export interface LimitsForm {
  total_budget: string;
  total_usage_limit: string;
  per_user_limit: string;
  per_day_limit: string;
}

export interface CustomRule {
  rule_type: string;
  operator: string;
  value: string;
}

export interface CreateResult {
  table: string;
  status: "success" | "error";
  message: string;
}

export interface ReviewRow {
  key: string;
  val: string;
}

export interface OfferRule {
  offer_id: string;
  rule_type: string;
  operator: string;
  value: string;
}

// NEW: response row shape for the Offer Analytics API
export interface OfferAnalyticsQuery {
  from_date: string;
  to_date: string;
  page: number;
  limit: number;
}
 
export interface OfferAnalyticsRow {
  offerCode: string;
  totalAppliedCount: number;
  amountBurnt: number;
  revenueGenerated: number;
  averageBurnPercent: number;
}

// ===== NEW: Offer Audit Log (Audit Log tab) =====
export interface OfferAuditLogQuery {
  offer_id?: string;
  page: number;
  limit: number;
}
 
export interface OfferAuditLogRow {
  id: number;
  table_name: string;
  record_id: number;
  offer_id: string;
  action: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by: string;
  changed_by_type: string;
  client_id: string;
  correlation_id: string | null;
  ip_address: string;
  created_at: string;
}
 
export interface AuditDiffRow {
  key: string;
  oldVal: string;
  newVal: string;
  changed: boolean;
}
 
/**
 * old_data aur new_data (dono nested JSON objects) ko le kar
 * key-wise diff rows banata hai — Audit Log modal me
 * "Key | Old | New" table dikhane ke liye.
 */
export function buildAuditDiffRows(
  oldData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined,
): AuditDiffRow[] {
  const keys = new Set<string>([
    ...(oldData ? Object.keys(oldData) : []),
    ...(newData ? Object.keys(newData) : []),
  ]);
 
  return Array.from(keys).map((key) => {
    const rawOld = oldData ? oldData[key] : undefined;
    const rawNew = newData ? newData[key] : undefined;
    const oldStr =
      rawOld === null || rawOld === undefined ? "-" : String(rawOld);
    const newStr =
      rawNew === null || rawNew === undefined ? "-" : String(rawNew);
    return {
      key,
      oldVal: oldStr,
      newVal: newStr,
      changed: oldStr !== newStr,
    };
  });
}

export function getClientIdForPartner(partner: string): string {
  const key = partner.toLowerCase().replace(/^bac_/, "bac");
  return CLIENT_ID_MAP[key] || partner.toUpperCase();
}

export function defaultOfferForm(clientId: string): OfferForm {
  return {
    offer_id: "",
    name: "",
    title: "",
    subtitle: "",
    description: "",
    type: "flat",
    discount_value: "",
    max_discount: "",
    min_cart_value: "",
    priority: "10",
    is_stackable: "0",
    status: "active",
    client_id: clientId,
    userVisibility: "1",
    tnc: "",
    start_time_local: "",
    end_time_local: "",
  };
}

export function defaultRulePresets(): RulePresets {
  const days: Record<string, boolean> = {};
  WEEK_DAYS.forEach((d) => {
    days[d] = false;
  });
  return {
    user_type: "",
    device_type: "",
    cab_partner: "",
    cities: "",
    exclude_cities: "",
    is_new_user: "",
    ride_count: "",
    customer_ids: "",
    scheduleDays: days,
    scheduleStart: "",
    scheduleEnd: "",
  };
}

export function defaultLimitsForm(): LimitsForm {
  return {
    total_budget: "",
    total_usage_limit: "",
    per_user_limit: "1",
    per_day_limit: "",
  };
}

export function formatDateTimeLocal(val: string): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
}

// NEW: simple YYYY-MM-DD formatter for the analytics date-range filters
export function formatDateOnly(d: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
 
// NEW: default range = 1st of current month -> today
export function defaultAnalyticsDateRange(): { from: string; to: string } {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: formatDateOnly(firstOfMonth),
    to: formatDateOnly(now),
  };
}

function parseList(str: string): string[] {
  if (!str || !str.trim()) return [];
  return str
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildRules(
  offerId: string,
  rulePresets: RulePresets,
  customRules: CustomRule[],
  minCartValue: string,
): OfferRule[] {
  const rules: OfferRule[] = [];
  const rp = rulePresets;

  if (rp.user_type) {
    rules.push({
      offer_id: offerId,
      rule_type: "user_type",
      operator: "=",
      value: JSON.stringify(rp.user_type),
    });
  }
  if (rp.device_type) {
    rules.push({
      offer_id: offerId,
      rule_type: "device_type",
      operator: "=",
      value: JSON.stringify(rp.device_type),
    });
  }
  if (rp.cab_partner) {
    rules.push({
      offer_id: offerId,
      rule_type: "cab_partner",
      operator: "=",
      value: JSON.stringify(rp.cab_partner),
    });
  }
  if (rp.cities) {
    const cities = parseList(rp.cities);
    if (cities.length) {
      rules.push({
        offer_id: offerId,
        rule_type: "city",
        operator: "IN",
        value: JSON.stringify(cities),
      });
    }
  }
  if (rp.exclude_cities) {
    const exc = parseList(rp.exclude_cities);
    if (exc.length) {
      rules.push({
        offer_id: offerId,
        rule_type: "city",
        operator: "NOT_IN",
        value: JSON.stringify(exc),
      });
    }
  }
  if (rp.is_new_user === "true") {
    rules.push({
      offer_id: offerId,
      rule_type: "is_new_user",
      operator: "=",
      value: "true",
    });
  }
  if (rp.ride_count) {
    rules.push({
      offer_id: offerId,
      rule_type: "ride_count",
      operator: "<",
      value: String(rp.ride_count),
    });
  }
  if (rp.customer_ids) {
    const cids = parseList(rp.customer_ids);
    if (cids.length) {
      rules.push({
        offer_id: offerId,
        rule_type: "customerId",
        operator: "IN",
        value: JSON.stringify(cids),
      });
    }
  }
  if (minCartValue) {
    rules.push({
      offer_id: offerId,
      rule_type: "cart_value",
      operator: ">=",
      value: String(minCartValue),
    });
  }

  const schedDays = WEEK_DAYS.filter((d) => rp.scheduleDays[d]);
  if (schedDays.length && rp.scheduleStart && rp.scheduleEnd) {
    rules.push({
      offer_id: offerId,
      rule_type: "current_time",
      operator: "SCHEDULE",
      value: JSON.stringify({
        days: schedDays,
        startTime: rp.scheduleStart,
        endTime: rp.scheduleEnd,
      }),
    });
  }

  customRules.forEach((r) => {
    if (r.rule_type && r.operator && r.value) {
      rules.push({
        offer_id: offerId,
        rule_type: r.rule_type,
        operator: r.operator,
        value: r.value,
      });
    }
  });

  return rules;
}

export function hasLimits(limitsForm: LimitsForm): boolean {
  const l = limitsForm;
  return !!(
    l.total_budget ||
    l.total_usage_limit ||
    l.per_user_limit ||
    l.per_day_limit
  );
}

export function buildOfferPayload(
  offerForm: OfferForm,
  useLiveTimestamp = false,
): Record<string, string> {
  const f = offerForm;
  const now = useLiveTimestamp
    ? formatDateTimeLocal(new Date().toISOString())
    : "2026-06-02 12:16:58";
  const data: Record<string, string> = {
    offer_id: f.offer_id,
    name: f.name,
    title: f.title,
    subtitle: f.subtitle || "",
    description: f.description || "",
    type: f.type,
    discount_value: String(f.discount_value),
    min_cart_value: f.min_cart_value ? String(f.min_cart_value) : "0",
    priority: String(f.priority || "0"),
    is_stackable: String(f.is_stackable),
    status: f.status,
    client_id: f.client_id || "ING",
    userVisibility: String(f.userVisibility),
    tnc: f.tnc || "",
    created_at: now,
    updated_at: now,
  };
  if (f.type === "percentage" && f.max_discount) {
    data.max_discount = String(f.max_discount);
  }
  if (f.start_time_local) {
    data.start_time = formatDateTimeLocal(f.start_time_local);
  }
  if (f.end_time_local) {
    data.end_time = formatDateTimeLocal(f.end_time_local);
  }
  return data;
}

export function buildReviewRows(offerForm: OfferForm): ReviewRow[] {
  const f = offerForm;
  return [
    { key: "Offer ID", val: f.offer_id },
    { key: "Name", val: f.name },
    { key: "Title", val: f.title },
    { key: "Subtitle", val: f.subtitle },
    { key: "Type", val: f.type },
    { key: "Discount Value", val: f.discount_value },
    { key: "Max Discount", val: f.max_discount },
    { key: "Min Cart Value", val: f.min_cart_value },
    { key: "Priority", val: f.priority },
    {
      key: "Stackable",
      val: f.is_stackable === "1" ? "Yes" : "No",
    },
    { key: "Status", val: f.status },
    { key: "Client ID", val: f.client_id },
    {
      key: "Visibility",
      val: f.userVisibility === "1" ? "Visible" : "Hidden",
    },
    {
      key: "Start Time",
      val: formatDateTimeLocal(f.start_time_local),
    },
    { key: "End Time", val: formatDateTimeLocal(f.end_time_local) },
    { key: "TnC", val: f.tnc },
  ];
}

export function buildLimitsPayload(
  offerId: string,
  limitsForm: LimitsForm,
): Record<string, string> {
  const l = limitsForm;
  const limitData: Record<string, string> = {
    offer_id: offerId,
    used_budget: "0",
  };
  if (l.total_budget) limitData.total_budget = String(l.total_budget);
  if (l.total_usage_limit)
    limitData.total_usage_limit = String(l.total_usage_limit);
  if (l.per_user_limit) limitData.per_user_limit = String(l.per_user_limit);
  if (l.per_day_limit) limitData.per_day_limit = String(l.per_day_limit);
  return limitData;
}

export function getPageNumbers(
  totalPages: number,
  currentPage: number,
): (number | "...")[] {
  const pages: (number | "...")[] = [];
  const maxPagesToShow = 5;

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    if (startPage > 2) pages.push("...");
    for (let j = startPage; j <= endPage; j++) pages.push(j);
    if (endPage < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}
