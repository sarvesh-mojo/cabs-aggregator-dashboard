import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { store } from "../Redux/store";
import type { RootState } from "../Redux/store";
import { getMojoEventApiBaseUrl, getYatraProdInvoiceAuth, YATRA_PROD_INVOICE_API_HOST } from "../utils/partnerAccess";
import { omitClientIdForPartner } from "../utils/partnerDisplayLabels";

/** Used only when login did not return a Yatra host and the session is not prod or preprod. */
const YATRA_DEV_API_HOST = "https://yata-devapi.bookairportcab.com";
const YATRA_PREPROD_API_HOST = "https://yata-preprodapi.bookairportcab.com";

function yatraHostForSession(pwd: Record<string, { host?: string } | undefined>): string {
  const explicit = String(pwd?.yatra?.host || "").replace(/\/$/, "");
  if (explicit) return explicit;

  const hosts = Object.values(pwd || {})
    .map((entry) => String(entry?.host || "").toLowerCase())
    .filter(Boolean);
  const prod = hosts.some(
    (host) => host.includes("prod") && !host.includes("preprod") && !host.includes("dev")
  );
  if (prod) return YATRA_PROD_INVOICE_API_HOST;
  if (hosts.some((host) => host.includes("preprod"))) return YATRA_PREPROD_API_HOST;

  const devPanel = String(import.meta.env.VITE_domain || "").includes("mojo-bk-dev");
  return devPanel ? YATRA_DEV_API_HOST : YATRA_PROD_INVOICE_API_HOST;
}

const USE_READ = import.meta.env.VITE_USE_READ_API === "true";

const normalizeApiPath = (baseURL: string | undefined, path: string): string => {
  const base = String(baseURL ?? "").replace(/\/$/, "");
  if (base.endsWith("/api/v1") && path.startsWith("/api/v1/")) {
    return path.slice("/api/v1".length);
  }
  return path;
};

/** True for AbortController cancel / axios cancel — not a real failure. */
export const isRequestCanceled = (error: unknown): boolean => {
  const err = error as AxiosError & { name?: string; code?: string };
  return (
    err?.code === "ERR_CANCELED" ||
    err?.name === "CanceledError" ||
    err?.name === "AbortError" ||
    axios.isCancel(error)
  );
};

/**
 * Builds an Axios instance based on partner, token, and whether it’s multipart.
 */
const getApiInstance = (partner: string, multipart = false): AxiosInstance => {
  const state = store.getState() as RootState;
  const { login_JWT, partner_wise_data } = state.authStore;

  let apiDomain = import.meta.env.VITE_domain as string;
  let token = "";

  if (partner === "mojoboxx") {
    token = "";
    apiDomain = import.meta.env.VITE_domain as string;
  }
  else if (partner == "mojo") {
    token = "";
    apiDomain = import.meta.env.VITE_MOJO_domain as string;
  }
  else if (partner === "read") {
  const readData = partner_wise_data?.[0]?.read;

  token = readData?.auth || "";
  apiDomain = readData?.host || "";
}
  else if (partner === "yatra") {
    const pwd = partner_wise_data?.[0] ?? {};
    const yatraData = pwd.yatra;
    const hasYatraConfig =
      yatraData && Object.keys(yatraData).length > 0 && yatraData.host;

    if (hasYatraConfig) {
      token = yatraData.auth;
      apiDomain = yatraData.host;
    } else {
      apiDomain = YATRA_PROD_INVOICE_API_HOST;
      token = getYatraProdInvoiceAuth(pwd, login_JWT);
    }
  }
  else {
    const partnerData = partner_wise_data?.[0]?.[partner];
    const isPartner = partnerData && Object.keys(partnerData).length > 0;

    if (isPartner) {
      token = partnerData.auth;
      apiDomain = partnerData.host;
    } else {
      token = login_JWT;
    }
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": multipart ? "multipart/form-data" : "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  return axios.create({
    baseURL: apiDomain,
    headers,
    // Keep generous: browser only allows ~6 connections/host; queued calls still consume timeout
    timeout: 60000,
  });
};

/*** Generic POST API wrapper */
export async function PostAPI<TRes, TBody = any>(
  partner: string,
  URL: string,
  Body: TBody,
  multipartFormData = false,
  options?: { signal?: AbortSignal; timeout?: number; redirectOnForbidden?: boolean }
): Promise<AxiosResponse<TRes>> {
  // const api = getApiInstance(partner, multipartFormData);
    const state = store.getState() as RootState;

const hasRead =
  !!state.authStore.partner_wise_data?.[0]?.read?.host;

const api = getApiInstance(
  USE_READ && (Body as any)?.brand && hasRead
    ? "read"
    : partner,
  multipartFormData
);

const useRead =
  USE_READ &&
  hasRead &&
  !!(Body as any)?.brand;

let requestBody = omitClientIdForPartner(partner, { ...(Body as any) });

if (!useRead) {
  delete requestBody.brand;
}

  try {
    // const response = await api.post<TRes>(URL, Body);
    const response = await api.post<TRes>(
      normalizeApiPath(api.defaults.baseURL, URL),
      requestBody,
      {
      signal: options?.signal,
      timeout: options?.timeout,
    });
    return response;
  } catch (error) {
    if (isRequestCanceled(error)) throw error;
    const axiosErr = error as AxiosError;
    console.error(axiosErr.response?.data ?? axiosErr.message);

    if (
      options?.redirectOnForbidden !== false &&
      axiosErr.code === "ERR_BAD_REQUEST" &&
      axiosErr.response?.status === 403
    ) {
      window.location.href = "/login";
    }

    throw axiosErr;
  }
}

/** Trip event APIs (assign/left/reached/start/stop) — preprod for dev logins only. */
export async function PostMojoEventAPI<TRes, TBody = any>(
  URL: string,
  Body: TBody,
): Promise<AxiosResponse<TRes>> {
  const state = store.getState() as RootState;
  const api = axios.create({
    baseURL: getMojoEventApiBaseUrl(state.authStore?.login_username),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "",
    },
  });

  try {
    return await api.post<TRes>(URL, Body);
  } catch (error) {
    const axiosErr = error as AxiosError;
    console.error(axiosErr.response?.data ?? axiosErr.message);

    if (
      axiosErr.code === "ERR_BAD_REQUEST" &&
      axiosErr.response?.status === 403
    ) {
      window.location.href = "/login";
    }

    throw axiosErr;
  }
}

/** VIP concierge lives on the Yatra booking API for the environment the user logged into. */
const getVipApiInstance = (multipart = false): AxiosInstance => {
  const state = store.getState() as RootState;
  const pwd = state.authStore.partner_wise_data?.[0] ?? {};
  const baseURL = yatraHostForSession(pwd);
  const token = pwd.yatra?.auth || getYatraProdInvoiceAuth(pwd, state.authStore.login_JWT);

  return axios.create({
    baseURL,
    headers: {
      Accept: "application/json",
      "Content-Type": multipart ? "multipart/form-data" : "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    timeout: 60000,
  });
};

export async function GetVipAPI<TRes>(
  path: string,
  params: Record<string, any> = {}
): Promise<AxiosResponse<TRes>> {
  const api = getVipApiInstance(false);
  try {
    return await api.get<TRes>(normalizeApiPath(api.defaults.baseURL, path), { params });
  } catch (error) {
    const axiosErr = error as AxiosError;
    console.error(axiosErr.response?.data ?? axiosErr.message);
    throw axiosErr;
  }
}

export async function PostVipAPI<TRes, TBody = any>(
  path: string,
  body: TBody
): Promise<AxiosResponse<TRes>> {
  const api = getVipApiInstance(false);
  try {
    return await api.post<TRes>(normalizeApiPath(api.defaults.baseURL, path), body);
  } catch (error) {
    const axiosErr = error as AxiosError;
    console.error(axiosErr.response?.data ?? axiosErr.message);
    throw axiosErr;
  }
}

/*** Generic GET API wrapper */
export async function GetAPI<TRes>(
  partner: string,
  path: string,
  params: Record<string, any> = {},
  options?: { signal?: AbortSignal; skipAuthRedirect?: boolean }
): Promise<AxiosResponse<TRes>> {
  // const api = getApiInstance(partner, false);
  const state = store.getState() as RootState;

const hasRead =
  !!state.authStore.partner_wise_data?.[0]?.read?.host;

const api = getApiInstance(
  USE_READ && hasRead && params?.brand ? "read" : partner,
  false
);

const useRead =
  USE_READ &&
  hasRead &&
  !!params?.brand;

let requestParams = omitClientIdForPartner(partner, { ...params });

if (!useRead) {
  delete requestParams.brand;
}

  try {
    // const response = await api.get<TRes>(path, { params });
    const response = await api.get<TRes>(path, {
  params: requestParams,
  signal: options?.signal,
});
    return response;
  } catch (error) {
    if (isRequestCanceled(error)) throw error;
    const axiosErr = error as AxiosError;
    if (
      !options?.skipAuthRedirect &&
      axiosErr.code === "ERR_BAD_REQUEST" &&
      axiosErr.response?.status === 403
    ) {
      window.location.href = "/login";
    }
    throw axiosErr;
  }
}

/*** Generic PUT API wrapper */
export async function PutAPI<TRes, TBody = any>(
  partner: string,
  URL: string,
  Body: TBody,
  multipartFormData = false
): Promise<AxiosResponse<TRes>> {
  const api = getApiInstance(partner, multipartFormData);
  try {
    const response = await api.put<TRes>(URL, Body);
    return response;
  } catch (error) {
    const axiosErr = error as AxiosError;
    // console.error(axiosErr.response?.data ?? axiosErr.message);

    if (
      axiosErr.code === "ERR_BAD_REQUEST" &&
      axiosErr.response?.status === 403
    ) {
      window.location.href = "/login";
    }

     throw axiosErr;
  }
}

/*** Generic DELETE API wrapper */
export async function DeleteAPI<TRes, TBody = any>(
  partner: string,
  URL: string,
  Body: TBody,
  multipartFormData = false
): Promise<AxiosResponse<TRes>> {
  const api = getApiInstance(partner, multipartFormData);

  try {
    const response = await api.delete<TRes>(URL, {
      data: Body,
    });

    return response;
  } catch (error) {
    const axiosErr = error as AxiosError;

    // console.error(axiosErr.response?.data ?? axiosErr.message);

    if (
      axiosErr.code === "ERR_BAD_REQUEST" &&
      axiosErr.response?.status === 403
    ) {
      window.location.href = "/login";
    }

    throw axiosErr;
  }
}