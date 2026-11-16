import { GET_CITY_LIST } from "../../../config/apiEndpoints";
import { GetAPI } from "../../../config/apiMethods";
import {
  OPS_DISTANCE_MATRIX,
  OPS_PLACE_DETAILS,
  OPS_PLACE_SEARCH,
} from "../../../config/customerCare/operationsApicall";

export type ResolvedPlace = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  placeId?: string;
  /** Google place types, used to detect airports when the label omits the word. */
  types?: string[];
};

type AddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

const CITY_CODE_MAP: Record<string, string> = {
  bengaluru: "BLR",
  bangalore: "BLR",
  mumbai: "BOM",
  delhi: "DEL",
  "new delhi": "DEL",
  hyderabad: "HYD",
  chennai: "MAA",
  kolkata: "CCU",
  goa: "GOI",
  pune: "PNQ",
  ahmedabad: "AMD",
  jaipur: "JAI",
  lucknow: "LKO",
  chandigarh: "IXC",
  kochi: "COK",
  cochin: "COK",
  agra: "AGR",
};

function normalizeCityKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseCityFromAddress(address: string) {
  const parts = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3] || "";
  if (parts.length >= 2) return parts[parts.length - 2] || "";
  return parts[0] || "";
}

export function parseStateFromAddress(address: string) {
  const parts = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const maybeState = parts[parts.length - 2];
    if (maybeState.toLowerCase() !== "india") return maybeState;
  }
  return "";
}

export function parseAddressComponents(components: AddressComponent[] | undefined) {
  let city = "";
  let state = "";
  for (const component of components || []) {
    const types = component.types || [];
    if (types.includes("locality")) city = component.long_name || city;
    if (!city && types.includes("administrative_area_level_2")) {
      city = component.long_name || city;
    }
    if (types.includes("administrative_area_level_1")) {
      state = component.long_name || state;
    }
  }
  return { city, state };
}

export function inferCityCode(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const code = CITY_CODE_MAP[normalizeCityKey(candidate)];
    if (code) return code;
  }
  return "";
}

export function isAirportAddress(address: string) {
  return /airport|terminal|aerodrome|international airport|igi|kempegowda|chhatrapati|csia/i.test(
    address || ""
  );
}

function isAirportType(types: string[] | undefined) {
  return (types || []).some((type) => String(type).toLowerCase() === "airport");
}

export function isAirportPlace(address: string, types?: string[]) {
  return isAirportType(types) || isAirportAddress(address);
}

export function inferTravelType(
  sourceAddress: string,
  destinationAddress: string,
  sourceTypes?: string[],
  destinationTypes?: string[]
) {
  const sourceIsAirport = isAirportPlace(sourceAddress, sourceTypes);
  const destinationIsAirport = isAirportPlace(destinationAddress, destinationTypes);
  if (sourceIsAirport && !destinationIsAirport) return "departure";
  if (destinationIsAirport && !sourceIsAirport) return "arrival";
  return "departure";
}

/** Same cutoff as the airport site: above 70 km is an outstation ride. */
export const OUTSTATION_MIN_KM = 70;

/**
 * Default booking split when the tester leaves journey type on Auto:
 * airport → AIRPORT, outstation → OUTSTATION, city ride → RENTAL.
 * LOCAL is never inferred — pick it in the fare-search form to test covering packages.
 */
export function inferJourneyType(
  sourceAddress: string,
  destinationAddress: string,
  kilometer: number,
  sourceTypes?: string[],
  destinationTypes?: string[]
) {
  if (
    isAirportPlace(sourceAddress, sourceTypes) ||
    isAirportPlace(destinationAddress, destinationTypes)
  ) {
    return "AIRPORT";
  }
  if (Number(kilometer) > OUTSTATION_MIN_KM) return "OUTSTATION";
  return "RENTAL";
}

/** City-ride filter from yatra_bac: keep rental packages that cover the trip. */
export function filterRentalFares<T extends Record<string, unknown>>(
  fares: T[],
  kilometer: number,
  duration: number
) {
  const tripKm = Number(kilometer);
  const tripMinutes = Number(duration);
  return fares.filter((fare) => {
    const packageKm = Number(fare.rentalDistance ?? fare.rentaldistance ?? 0);
    const packageMinutes = Number(fare.duration ?? 0);
    return packageKm >= tripKm && packageMinutes >= tripMinutes;
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDurationMinutes(kilometer: number) {
  return Math.max(15, Math.round(kilometer * 2.2));
}

function hasCoords(lat: unknown, lng: unknown) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function placeFromBody(
  body: Record<string, unknown>,
  side: "source" | "destination"
): ResolvedPlace | null {
  const name = String(
    side === "source"
      ? body.sourceName || body.sourceAddress || ""
      : body.destinationName || body.destinationAddress || ""
  ).trim();
  if (!name) return null;

  const lat = side === "source" ? body.sourceLatitude : body.destinationLatitude;
  const lng = side === "source" ? body.sourceLongitude : body.destinationLongitude;
  if (!hasCoords(lat, lng)) return null;

  return {
    name,
    address: name,
    latitude: Number(lat),
    longitude: Number(lng),
    city: String(
      side === "source" ? body.sourceCity || "" : body.destinationCity || ""
    ),
    state: String(
      side === "source" ? body.sourceState || "" : body.destinationState || ""
    ),
  };
}

export async function resolvePlaceFromQuery(
  partner: string,
  input: string,
  sessiontoken?: string
): Promise<ResolvedPlace> {
  const query = input.trim();
  if (!query) throw new Error("Enter pickup and drop locations.");

  const search = await OPS_PLACE_SEARCH(partner, {
    input: query,
    sessiontoken,
  });
  if (search?.status === "failure" || search?.status === "error") {
    throw new Error(search?.message || `Could not find place: ${query}`);
  }

  const predictions = search?.data?.predictions || [];
  const first = predictions[0];
  if (!first?.place_id) {
    throw new Error(`Could not find place: ${query}`);
  }

  return resolvePlaceFromPlaceId(partner, first.place_id, sessiontoken, query);
}

export async function resolvePlaceFromPlaceId(
  partner: string,
  placeId: string,
  sessiontoken?: string,
  fallbackName = ""
): Promise<ResolvedPlace> {
  const details = await OPS_PLACE_DETAILS(partner, {
    placeId,
    sessiontoken,
  });
  if (details?.status === "failure" || details?.status === "error") {
    throw new Error(details?.message || "Could not resolve place details.");
  }

  const data = details?.data || {};
  const lat = Number(data?.location?.lat);
  const lng = Number(data?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Selected place has no coordinates.");
  }

  const address =
    String(data.formattedAddress || data.name || fallbackName || "").trim() ||
    fallbackName;
  const parsed = parseAddressComponents(data.addressComponents);
  const types = [
    ...(Array.isArray(data.types) ? data.types : []),
    ...(data.primaryType ? [data.primaryType] : []),
    ...(data.addressComponents || []).flatMap(
      (component: AddressComponent) => component.types || []
    ),
  ]
    .map((type: unknown) => String(type || "").trim())
    .filter(Boolean);

  return {
    name: address,
    address,
    latitude: lat,
    longitude: lng,
    city: parsed.city || parseCityFromAddress(address),
    state: parsed.state || parseStateFromAddress(address),
    placeId: String(data.placeId || placeId),
    ...(types.length ? { types } : {}),
  };
}

async function resolveSide(
  partner: string,
  body: Record<string, unknown>,
  side: "source" | "destination",
  selected: ResolvedPlace | null,
  sessiontoken?: string
): Promise<ResolvedPlace> {
  if (selected && hasCoords(selected.latitude, selected.longitude)) {
    return selected;
  }

  const cached = placeFromBody(body, side);
  const typed = String(
    side === "source"
      ? body.sourceName || body.sourceAddress || ""
      : body.destinationName || body.destinationAddress || ""
  ).trim();

  if (cached && typed && normalizeCityKey(cached.name) === normalizeCityKey(typed)) {
    return { ...cached, name: typed, address: typed };
  }

  if (!typed) {
    throw new Error(
      side === "source" ? "Select a pickup location." : "Select a drop location."
    );
  }

  return resolvePlaceFromQuery(partner, typed, sessiontoken);
}

async function resolveCityCode(
  partner: string,
  source: ResolvedPlace,
  destination: ResolvedPlace
) {
  const airportSide = isAirportPlace(source.address, source.types)
    ? source
    : isAirportPlace(destination.address, destination.types)
      ? destination
      : source;

  try {
    const apiPartner = partner.startsWith("bac_") ? "bac" : partner;
    const response = await GetAPI<any>(
      apiPartner,
      GET_CITY_LIST,
      {
        latitude: airportSide.latitude,
        longitude: airportSide.longitude,
      },
      { skipAuthRedirect: true }
    );
    const payload = response.data;
    const cities = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    if (cities.length) {
      const code = String(cities[0]?.airportCode || cities[0]?.code || "").trim();
      if (code) return code;
    }
  } catch {
    /* fall through to inference */
  }

  return (
    inferCityCode(source.city, destination.city, source.address, destination.address) ||
    "DEL"
  );
}

async function resolveRouteMetrics(
  partner: string,
  source: ResolvedPlace,
  destination: ResolvedPlace
) {
  try {
    const matrix = await OPS_DISTANCE_MATRIX(partner, {
      sourceLat: source.latitude,
      sourceLng: source.longitude,
      destLat: destination.latitude,
      destLng: destination.longitude,
    });
    if (matrix?.status === "success" && matrix?.data) {
      const meters = Number(matrix.data.distance?.value);
      const seconds = Number(
        matrix.data.durationInTraffic?.value ?? matrix.data.duration?.value
      );
      if (Number.isFinite(meters) && meters > 0) {
        return {
          kilometer: Math.round(meters / 100) / 10,
          duration: Number.isFinite(seconds)
            ? Math.max(1, Math.round(seconds / 60))
            : estimateDurationMinutes(Math.round(meters / 100) / 10),
          provider: "google" as const,
        };
      }
    }
  } catch {
    /* haversine fallback */
  }

  const kilometer =
    Math.round(
      haversineKm(
        source.latitude,
        source.longitude,
        destination.latitude,
        destination.longitude
      ) * 10
    ) / 10;
  return {
    kilometer,
    duration: estimateDurationMinutes(kilometer),
    provider: "estimate" as const,
  };
}

export type PrepareResult = {
  body: Record<string, unknown>;
  info: string;
  source: ResolvedPlace;
  destination: ResolvedPlace;
};

/**
 * Resolve Places lat/lng + Distance Matrix km/duration into a fareSearch body.
 */
export async function prepareFareSearchBody(
  partner: string,
  body: Record<string, unknown>,
  options?: {
    sourcePlace?: ResolvedPlace | null;
    destinationPlace?: ResolvedPlace | null;
    sessiontoken?: string;
    onStatus?: (message: string) => void;
    journeyType?: "AIRPORT" | "OUTSTATION" | "RENTAL" | "LOCAL";
  }
): Promise<PrepareResult> {
  const onStatus = options?.onStatus;
  onStatus?.("Resolving pickup & drop…");

  const [source, destination] = await Promise.all([
    resolveSide(partner, body, "source", options?.sourcePlace || null, options?.sessiontoken),
    resolveSide(
      partner,
      body,
      "destination",
      options?.destinationPlace || null,
      options?.sessiontoken
    ),
  ]);

  onStatus?.("Calculating distance & duration…");
  const route = await resolveRouteMetrics(partner, source, destination);

  onStatus?.("Preparing city code…");
  const cityCode = await resolveCityCode(partner, source, destination);
  const travelType = inferTravelType(
    source.address,
    destination.address,
    source.types,
    destination.types
  );
  const journeyType =
    options?.journeyType ||
    inferJourneyType(
      source.address,
      destination.address,
      route.kilometer,
      source.types,
      destination.types
    );

  const next: Record<string, unknown> = {
    ...body,
    sourceName: source.address,
    sourceAddress: source.address,
    sourceLatitude: source.latitude,
    sourceLongitude: source.longitude,
    sourceCity: source.city || parseCityFromAddress(source.address),
    sourceState: source.state || parseStateFromAddress(source.address),
    destinationName: destination.address,
    destinationAddress: destination.address,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
    destinationCity: destination.city || parseCityFromAddress(destination.address),
    destinationState: destination.state || parseStateFromAddress(destination.address),
    kilometer: route.kilometer,
    duration: route.duration,
    cityCode,
    travelType,
    journeyType,
  };

  if (journeyType === "OUTSTATION") {
    next.journeyMode = "ONEWAY";
  } else {
    delete next.journeyMode;
  }

  const info = `Ready (${route.provider === "google" ? "Google Maps" : "estimate"}): ${route.kilometer} km · ${route.duration} min · ${cityCode} · ${journeyType} · ${travelType}`;
  onStatus?.(info);

  return { body: next, info, source, destination };
}
