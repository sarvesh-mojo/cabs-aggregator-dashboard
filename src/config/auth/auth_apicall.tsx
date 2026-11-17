import { USER_LOGIN } from "../apiEndpoints";
import { PostAPI } from "../apiMethods";
import { AxiosResponse } from "axios";
import {
  aggregatorLogin,
  rightsForClientType,
} from "../aggregator/api";
import { resolveViaDomain } from "../runtimeHosts";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
}

/**
 * Analytics/CX APIs are viaVIP_API — need a viaVIP JWT, not the aggregator token.
 * Same username/password must exist in viaVIP `users` for Dashboard to load data.
 */
async function viaVipLogin(
  username: string,
  password: string
): Promise<string | null> {
  const base = resolveViaDomain();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/auth/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const token = typeof data?.token === "string" ? data.token : null;
    return token;
  } catch {
    return null;
  }
}

/**
 * Prefer cabs-aggregator login (JWT ADMIN/OPS).
 * Falls back to legacy management /users/login when aggregator rejects
 * and VITE_USE_LEGACY_LOGIN is not "false".
 */
export const LoginAPI = async (
  payload: LoginPayload
): Promise<any> => {
  try {
    const agg = await aggregatorLogin(payload.username, payload.password);
    const clientType = String(agg.client_type || "").toUpperCase();
    if (clientType !== "ADMIN" && clientType !== "OPS") {
      return {
        status: 403,
        success: false,
        message: "Use an ADMIN or OPS account for this dashboard",
      };
    }

    const partnerKey = "aggregator";
    const viaHost = resolveViaDomain();
    // Prefer server-minted viaVIP token from aggregator; else same-password viaVIP login.
    const viaToken =
      (typeof agg.viaVipToken === "string" && agg.viaVipToken) ||
      (await viaVipLogin(payload.username, payload.password));
    // Prefer viaVIP token for analytics host; keep aggregator JWT as session login_JWT.
    const analyticsAuth = viaToken || agg.token;

    return {
      status: 200,
      success: true,
      backend: "aggregator",
      jwtToken: agg.token,
      partner: [partnerKey],
      type: clientType,
      username: payload.username.trim(),
      cabPartner: null,
      data: [
        {
          [partnerKey]: {
            auth: analyticsAuth,
            host: viaHost,
            user_rights: rightsForClientType(clientType),
            brand: agg.brand || "via",
            client_type: clientType,
            via_auth: Boolean(viaToken),
          },
        },
      ],
    };
  } catch (aggErr: any) {
    const allowLegacy = import.meta.env.VITE_USE_LEGACY_LOGIN !== "false";
    if (!allowLegacy) {
      return {
        status: 401,
        success: false,
        message: aggErr?.message || "Invalid credentials",
      };
    }

    try {
      const response: AxiosResponse<any> = await PostAPI(
        "mojoboxx",
        USER_LOGIN,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error(error);
      return {
        status: 401,
        success: false,
        message: aggErr?.message || error?.message || "Login failed",
      };
    }
  }
};
