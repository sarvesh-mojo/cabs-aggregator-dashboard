import { resolveAggregatorBase } from "../runtimeHosts";

/** Local Vite proxies /auth|/admin to :4100. Deployed dashboard has no proxy. */
const API_BASE = resolveAggregatorBase();

function aggregatorUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean}`;
}

export type AggregatorLoginResult = {
  token: string;
  brand?: string;
  client_type: string;
  expiresAt?: number;
};

export async function aggregatorLogin(
  username: string,
  password: string
): Promise<AggregatorLoginResult> {
  const res = await fetch(aggregatorUrl("/auth/v1/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok || data.status === "failure") {
    throw new Error(data.message || "Login failed");
  }
  return data as AggregatorLoginResult;
}

async function authedGet(path: string, token: string, query: Record<string, unknown> = {}) {
  const qs = new URLSearchParams(
    Object.entries(query)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const url = `${aggregatorUrl(path)}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.status === "failure") {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data.data;
}

export function fetchSummary(token: string, brand?: string) {
  return authedGet("/admin/v1/summary", token, { brand });
}

export function fetchBookingLinks(
  token: string,
  params: Record<string, unknown>
) {
  return authedGet("/admin/v1/booking-links", token, params);
}

export function fetchMarkupRules(token: string) {
  return authedGet("/admin/v1/markup-rules", token);
}

export function fetchModelAllowlist(token: string) {
  return authedGet("/admin/v1/model-allowlist", token);
}

/** Nav rights: ADMIN sees everything; OPS sees analytics + config (read). */
export function rightsForClientType(clientType: string): string {
  const type = String(clientType || "").toUpperCase();
  if (type === "ADMIN") return "ALL";
  if (type === "OPS") {
    return [
      "A.0",
      "A.1",
      "A.2",
      "A.3",
      "1.0",
      "2.0",
      "2.1",
      "2.2",
      "2.3",
      "2.4",
      "2.5",
      "2.6",
      "2.7",
      "2.8",
      "2.9",
      "3.0",
      "3.1",
      "3.2",
      "3.3",
    ].join(",");
  }
  return "A.1,A.2";
}
