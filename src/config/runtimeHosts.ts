/** Strip trailing slashes from a host/base URL. */
export function stripTrailingSlash(url: string): string {
  return String(url || "").replace(/\/+$/, "");
}

/**
 * Analytics / CX / ops API host (viaVIP_API).
 * Local: VITE_domain or http://127.0.0.1:3002
 * Live dashboard: VITE_domain or https://viavip-devapi.bookairportcab.com
 */
export function resolveViaDomain(): string {
  const fromEnv = stripTrailingSlash(import.meta.env.VITE_domain || "");
  if (fromEnv) return fromEnv;

  if (typeof window === "undefined") return "";

  const host = window.location.hostname;
  if (
    host === "aggregator-dashboard.bookairportcab.com" ||
    host.endsWith(".aggregator-dashboard.bookairportcab.com")
  ) {
    return "https://viavip-devapi.bookairportcab.com";
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:3002";
  }
  return "";
}

/**
 * Aggregator API host for login/config.
 * Local Vite proxies /auth|/admin (empty base). Live dashboard needs absolute URL.
 */
export function resolveAggregatorBase(): string {
  const fromEnv = stripTrailingSlash(import.meta.env.VITE_API_BASE || "");
  if (fromEnv) return fromEnv;

  if (typeof window === "undefined") return "";

  const host = window.location.hostname;
  if (
    host === "aggregator-dashboard.bookairportcab.com" ||
    host.endsWith(".aggregator-dashboard.bookairportcab.com")
  ) {
    return "https://api-aggregator.bookairportcab.com";
  }
  return "";
}
