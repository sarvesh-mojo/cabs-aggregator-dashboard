/** Shared multi-tenant hosts (e.g. railyatri-dev) — UI must not show another client's brand. */
const SHARED_PLATFORM_PARTNERS = new Set(["ondc", "railyatri", "travelvip"]);

/** Partners on the same API host/DB — analytics requires explicit clientId. */
export const SHARED_HOST_PARTNERS = new Set([
  "ondc",
  "bac",
  "yatra",
  "phonepe",
  "oneticket",
]);

export const PARTNER_CLIENT_ID_MAP: Record<string, string> = {
  indigo: "ING",
  ixigo: "IXIGO",
  // BAC tab hits the Yatra API host; bookings/searches are stored as YTR.
  bac: "YTR",
  yatra: "YTR",
  railyatri: "RYT",
  ondc: "ONDC",
  stage: "STAGE",
  travelvip: "TRAVELVIP",
  phonepe: "PHP",
  oneticket: "ONT",
  mojoboxx: "MOJOBOXX",
};

const PARTNER_BRAND_LABELS: Record<string, string> = {
  indigo: "IndiGo",
  ixigo: "Ixigo",
  bac: "BAC",
  yatra: "Yatra",
  travelvip: "TravelVIP",
  railyatri: "RailYatri",
  ondc: "ONDC",
  stage: "Stage",
  phonepe: "PhonePe",
  oneticket: "OneTicket",
  mojoboxx: "MojoBoxx",
};

export function normalizePartnerKey(partner?: string | null): string {
  return String(partner ?? "")
    .trim()
    .toLowerCase()
    .replace(/^bac_.*/, "bac");
}

export function usesNeutralPlatformLabels(partner?: string | null): boolean {
  return SHARED_PLATFORM_PARTNERS.has(normalizePartnerKey(partner));
}

/** Display brand for metrics/columns — neutral "Platform" on shared hosts and ALL tab. */
export function getPartnerBrandLabel(partner?: string | null): string {
  const key = normalizePartnerKey(partner);
  if (!key || key === "all" || usesNeutralPlatformLabels(key)) {
    return "Platform";
  }
  return PARTNER_BRAND_LABELS[key] || key.toUpperCase();
}

export function getPlatformShareLabel(
  partner: string | null | undefined,
  percent: string,
): string {
  return `${getPartnerBrandLabel(partner)} Share ${percent}`;
}

export function getListingFeeShareLabel(
  partner: string | null | undefined,
  variant: "percent" | "inr" | "short-percent" | "short-inr" = "percent",
): string {
  const brand = getPartnerBrandLabel(partner);
  switch (variant) {
    case "inr":
      return `${brand} Listing Fee share (in INR)`;
    case "short-percent":
      return `${brand} Listing Fee (%)`;
    case "short-inr":
      return `${brand} Listing Fee (INR)`;
    default:
      return `${brand} Listing Fee share`;
  }
}

/** Only these partners append `clientId` on read/analytics APIs. */
export function shouldSendClientId(partner?: string | null): boolean {
  return SHARED_HOST_PARTNERS.has(normalizePartnerKey(partner));
}

/** API client_id for shared-host partner tabs (ONDC on shared host). */
export function getClientIdForPartner(partner?: string | null): string | undefined {
  if (!shouldSendClientId(partner)) return undefined;
  const key = normalizePartnerKey(partner);
  return PARTNER_CLIENT_ID_MAP[key] || key.toUpperCase();
}

export function withClientScopeParams(
  partner: string,
  params: Record<string, unknown> = {},
): Record<string, unknown> {
  const { clientId: _ignored, ...rest } = params;

  if (!shouldSendClientId(partner)) {
    return rest;
  }

  const clientId = getClientIdForPartner(partner);
  if (!clientId) return rest;
  return { ...rest, clientId };
}

/** Final guard — strip `clientId` unless partner is on shared-host scope (ONDC). */
export function omitClientIdForPartner<T extends Record<string, unknown>>(
  partner: string,
  params: T,
): T {
  if (shouldSendClientId(partner)) return params;
  if (!("clientId" in params)) return params;
  const { clientId: _removed, ...rest } = params;
  return rest as T;
}
