// import { getbookingLogs, getbookingstatistics } from "../apiEndpoints";
import axios from "axios";
import { Add_Remarks, AssignDriver, CEO_Dashboard_Metric, DriverArrivedAtPickupLoc, DriverLeftForPickup, Fetch_customer_review, GenericSearch, GET_CITY_LIST, get_Remarks, getbookingDailyCounts, getbookingLogs, getbookingstatistics, GetPaymentStatus, getstatistics, getstatisticsV2, IxigoCancelandRefund, paymentRefund, RemarkOnPaymentRefund, Trigger_Spoc_Message, Trip_Cancel, Trip_Ended, Trip_started, Update_Generic_data, VIP_Bookings, GenericCreate, GenericDelete, GET_BOOKING_INVOICE, SEND_NPS_WHATSAPP, GET_MERGED_NPS_RECORDS as MERGED_NPS_RECORDS_ENDPOINT, OfferAnalytics, OfferAuditLog,BOOKING_CSV_EXPORT, FARE_SEARCH, PREBOOK, PAYMENT_CONFIRMATION, PLACE_SEARCH, PLACE_DETAILS, DISTANCE_MATRIX, REASSIGN_BOOKING, RESCHEDULE_BOOKING, RESCHEDULE_FARE_QUOTE, ENGAGEMENT_REPORT, CLOUDWATCH_LOGS, CLOUDWATCH_ERRORS, HOURLY_THRESHOLD_STATUS } from "../apiEndpoints";
import { GetAPI, PostAPI, PutAPI, DeleteAPI, PostMojoEventAPI, isRequestCanceled} from "../apiMethods";
// import { BookingLogsPayload, BookingLog, BookingStatisticsQuery, BookingStatistics } from "../types";
import { BookingLogsPayload, BookingLog, VIPBookings, AssignDriverType, BookingStatisticsQuery, BookingStatistics, CityListTypes, PaymentRefundPayload, OpsRemarkPayload, OpsRemarkQuery, GenericTablePayload, CEOMetricsQuery, EngagementReportQuery, EngagementReportRow, EngagementReportResponse } from "../types";
import { NpsRecordsPayload, SpocMessagePayload } from "./interfaceTypes";
import {
  shouldSkipTripCancelDomain,
  isBacSwiggyPartner,
  SWIGGY_OPS_CREATED_BY,
  filterSwiggyOpsBookingLogsPage,
} from "../../utils/partnerAccess";
import { withClientScopeParams } from "../../utils/partnerDisplayLabels";
import { store } from "../../Redux/store";

//  BAC HELPER 

const BAC_DOMAIN_MAP: Record<string, string> = {
  bac_agent: "AGENT",
  bac_mb: "BAC",
  bac_yatra: "YATRA",
  bac_corp: "CORP",
  bac_agentic_chat_dev: "AGENTIC-CHAT-DEV",
  bac_agentic_chat : "AGENTIC-CHAT"
};

/**
 * if partner is"bac_*"  then return bac (API key)
 * then return partner as -is
 */
const resolvePartner = (partner: string): string => {
  return partner.startsWith("bac_") ? "bac" : partner;
};

/**
 * if partner is "bac_*" , then return domain, otherwise null domain  params is not added
 */
const getBacDomain = (partner: string): string | null => {
  return BAC_DOMAIN_MAP[partner] ?? null;
};

/**
 * if Bac is Sub portal , then inject the domain in get params
 */
const withDomainParams = (
  partner: string,
  params: Record<string, any> = {}
): Record<string, any> => {
  if (isBacSwiggyPartner(partner)) {
    return { ...params, createdBy: SWIGGY_OPS_CREATED_BY };
  }
  const domain = getBacDomain(partner);
  return domain ? { ...params, domain } : params;
};

/**
 * inject domain in bodye
 */
const withDomainBody = (
  partner: string,
  body: Record<string, any> = {}
): Record<string, any> => {
  if (isBacSwiggyPartner(partner)) {
    return { ...body, createdBy: SWIGGY_OPS_CREATED_BY };
  }
  const domain = getBacDomain(partner);
  return domain ? { ...body, domain } : body;
};

const withReadParams = (
  partner: string,
  params: Record<string, any> = {}
): Record<string, any> =>
  withClientScopeParams(partner, {
    ...withDomainParams(partner, params),
    brand: resolvePartner(partner),
  });

const withReadBody = (
  partner: string,
  body: Record<string, any> = {}
): Record<string, any> =>
  withClientScopeParams(partner, {
    ...withDomainBody(partner, body),
    brand: resolvePartner(partner),
  });

const logApiError = (error: unknown) => {
  if (isRequestCanceled(error)) return;
  console.error(error);
};


export const GET_BOOKING_STATISTICS = async (
  selectedPartner: string,
  queryParams: BookingStatisticsQuery,
  signal?: AbortSignal,
): Promise<BookingStatistics> => {
  try {
    // const response = await GetAPI<{ data: BookingStatistics }>(selectedPartner, getstatistics, queryParams); 
     const response = await GetAPI<{ data: BookingStatistics }>(
      resolvePartner(selectedPartner),
      getstatistics,
      // withDomainParams(selectedPartner, queryParams)
        withReadParams(selectedPartner, queryParams),
        { signal },
    );
    return response.data.data;
  } catch (error) {
    logApiError(error);
    // You may want to throw here instead of returning `error` — up to you
    throw error;
  }
};

export const GET_BOOKING_STATISTICSV2 = async (selectedPartner: string, queryParams: BookingStatisticsQuery): Promise<BookingStatistics> => {
  try {
    // const response = await GetAPI<{ data: BookingStatistics }>(selectedPartner, getstatisticsV2, queryParams);
      const response = await GetAPI<{ data: BookingStatistics }>(
      resolvePartner(selectedPartner),
      getstatisticsV2,
      // withDomainParams(selectedPartner, queryParams)
        withReadParams(selectedPartner, queryParams)

    );
    return response.data.data;
  } catch (error) {
    logApiError(error);
    // You may want to throw here instead of returning `error` — up to you
    throw error;
  }
};

export const GET_CUSTOM_BOOKING_STATISTICS = async (
  selectedPartner: string,
  queryParams: BookingStatisticsQuery,
  signal?: AbortSignal,
): Promise<BookingStatistics> => {
  try {
      const response = await GetAPI<{ data: BookingStatistics }>(
      resolvePartner(selectedPartner),
      getbookingstatistics,
        withReadParams(selectedPartner, queryParams),
        { signal },
    );
    return response.data.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_BOOKING_DAILY_COUNTS = async (
  selectedPartner: string,
  queryParams: BookingStatisticsQuery,
  signal?: AbortSignal,
): Promise<BookingStatistics> => {
  try {
        const response = await GetAPI<{ data: BookingStatistics }>(
      resolvePartner(selectedPartner),
      getbookingDailyCounts,
        withReadParams(selectedPartner, queryParams),
        { signal },
    );
    return response.data.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

// export const GET_CUSTOM_BOOKING_STATISTICS = async (
//   selectedPartner: string,
//   queryParams: BookingStatisticsQuery
// ) => {
//   const response = await GetAPI<{ data: any[] }>(
//     selectedPartner,
//     getbookingstatistics,
//     queryParams
//   );
//   return response.data.data;
// };


export const GETBOOKING_LOGS = async (
  selectedPartner: string,
  payload: BookingLogsPayload,
  signal?: AbortSignal,
): Promise<BookingLog[]> => {
  try {
      const response = await PostAPI<{ data: BookingLog[] }>(
      resolvePartner(selectedPartner),
      getbookingLogs,
        withReadBody(selectedPartner, payload),
        false,
        { signal },
      );
    const data = response.data.data as any;
    if (
      isBacSwiggyPartner(selectedPartner) &&
      data &&
      !Array.isArray(data) &&
      Array.isArray(data.bookings)
    ) {
      return filterSwiggyOpsBookingLogsPage(data);
    }
    return data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/** Booking logs CSV export — API returns raw CSV text when reportType is "csv" */
export const GETBOOKING_LOGS_CSV = async (
  selectedPartner: string,
  payload: BookingLogsPayload
): Promise<string> => {
  try {
    const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      getbookingLogs,
      withReadBody(selectedPartner, { ...payload, reportType: "csv" })
    );
    const data = response.data;
    if (typeof data === "string") return data;
    if (typeof data?.data === "string") return data.data;
    if (typeof data?.csv === "string") return data.csv;
    return "";
  } catch (error) {
    logApiError(error);
    throw error;
  }
};


export const GET_VIP_BOOKINGS = async (selectedPartner: string, queryParams: VIPBookings): Promise<VIPBookings> => {
  try {
    // const response = await GetAPI<{ data: VIPBookings }>(selectedPartner, VIP_Bookings, queryParams);
     const response = await GetAPI<{ data: VIPBookings }>(
      resolvePartner(selectedPartner),
      VIP_Bookings,
      // withDomainParams(selectedPartner, queryParams)
        withReadParams(selectedPartner, queryParams)

    );
    return response.data?.data;

  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const ASSIGN_DRIVER_TO_BOOKING = async (payload: AssignDriverType): Promise<AssignDriverType> => {
  try {
    const response = await PostMojoEventAPI<{ data: AssignDriverType }>(AssignDriver, payload);
    return response.data?.data;

  } catch (error) {
    logApiError(error);
    // You may want to throw here instead of returning `error` — up to you
    throw error;
  }
};

export const DRIVER_LEFT_FOR_PICKUP = async (payload: any): Promise<any> => {
  try {
    const response = await PostMojoEventAPI<{ data: any }>(DriverLeftForPickup, payload);
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const DRIVER_ARRIVED_OR_REACHED = async (payload: any): Promise<any> => {
  try {
    const response = await PostMojoEventAPI<{ data: any }>(DriverArrivedAtPickupLoc, payload);
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const HIT_TRIP_STARTED = async (payload: any): Promise<any> => {
  try {
    const response = await PostMojoEventAPI<{ data: any }>(Trip_started, payload);
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const HIT_TRIP_ENDED = async (payload: any): Promise<any> => {
  try {
    const response = await PostMojoEventAPI<{ data: any }>(Trip_Ended, payload);
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const HIT_CANCEL_TRIP = async (payload: any): Promise<any> => {
  const { partner } = payload;
  delete payload?.partner;

  try {
    const requestBody = shouldSkipTripCancelDomain(partner)
      ? payload
      : withDomainBody(partner, payload);

    const response = await PostAPI<{ data: any }>(
      resolvePartner(partner),
      Trip_Cancel,
      requestBody,
    );
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const HIT_CANCEL_TRIP_IXIGO = async (payload: any): Promise<any> => {
  try {
    const response = await PostAPI<{ data: any }>("ixigo", IxigoCancelandRefund, payload);
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const REFUND_AMOUNT = async (selectedPartner: string, payload: PaymentRefundPayload) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, paymentRefund, payload);
       const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      paymentRefund,
      withDomainBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const REMARK_ADD_ON_REFUND = async (selectedPartner: string, payload: PaymentRefundPayload) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, RemarkOnPaymentRefund, payload);
      const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      RemarkOnPaymentRefund,
      withDomainBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};


// export const GET_LIVE_CITIES_LIST = async (): Promise<any> => {
//   try {
//     const response = await GetAPI<{ data: CityListTypes }>("mojo", GET_CITY_LIST);
//     return response.data;
//   }
//   catch (error) {
//     console.log(error);
//     throw error;
//   }
// }

export const GET_LIVE_CITIES_LIST = async (selectedPartner: string): Promise<any> => {
  try {
    const apiPartner = resolvePartner(selectedPartner);
    // City list is brand-level for BAC; domain filter (e.g. YATRA) can return empty.
    const queryParams =
      apiPartner === "bac" ? {} : withDomainParams(selectedPartner, {});

    const response = await GetAPI<{ data: CityListTypes[] } | CityListTypes[]>(
      apiPartner,
      GET_CITY_LIST,
      queryParams,
    );

    const payload = response.data as { data?: CityListTypes[] } | CityListTypes[];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const GET_REMARKS = async (selectedPartner: string, queryParams: OpsRemarkQuery): Promise<any> => {
  try {
    // const response = await GetAPI<{ data: any }>(selectedPartner, get_Remarks, queryParams);
      const response = await GetAPI<{ data: any }>(
      resolvePartner(selectedPartner),
      get_Remarks,
      withDomainParams(selectedPartner, queryParams)
    );
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const INSERT_REMARK = async (selectedPartner: string, payload: OpsRemarkPayload) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, Add_Remarks, payload);
       const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      Add_Remarks,
      withDomainBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const CUSTOM_GENERIC_TABLE = async (selectedPartner: string, payload: GenericTablePayload) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, GenericSearch, payload);
     const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      GenericSearch,
      // withDomainBody(selectedPartner, payload)
        withReadBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/** Full-table CSV from genericSearch. `filters` empty means every row. */
export const CUSTOM_GENERIC_TABLE_CSV = async (
  selectedPartner: string,
  payload: GenericTablePayload,
): Promise<{ csv: string; fileName: string }> => {
  try {
    const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      GenericSearch,
      withReadBody(selectedPartner, { ...payload, reportType: "csv" }),
      false,
      { timeout: 120000 },
    );
    const data = response.data;
    const csv = typeof data === "string" ? data : "";
    const disposition = String(response.headers?.["content-disposition"] || "");
    const match = disposition.match(/filename="([^"]+)"/);
    const safeTable = String(payload.table || "export").replace(/[^a-zA-Z0-9_-]/g, "_");
    return {
      csv,
      fileName: match?.[1] || `${safeTable}.csv`,
    };
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_CEO_DASHBOARD_METRICS = async (selectedPartner: string, queryParams: CEOMetricsQuery): Promise<any> => {
  try {
    // const response = await GetAPI<{ data: any }>(selectedPartner, CEO_Dashboard_Metric, queryParams);
       const response = await GetAPI<{ data: any }>(
      resolvePartner(selectedPartner),
      CEO_Dashboard_Metric,
      // withDomainParams(selectedPartner, queryParams)
        withReadParams(selectedPartner, queryParams)

    );
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_ENGAGEMENT_REPORT = async (
  selectedPartner: string,
  queryParams: EngagementReportQuery,
  signal?: AbortSignal,
): Promise<EngagementReportRow[]> => {
  try {
    const response = await GetAPI<{
      data?: EngagementReportResponse | EngagementReportRow[];
      monthly?: EngagementReportRow[];
    }>(
      resolvePartner(selectedPartner),
      ENGAGEMENT_REPORT,
      withReadParams(selectedPartner, queryParams),
      { signal, skipAuthRedirect: true },
    );

    const payload = response.data;

    if (Array.isArray(payload)) return payload;

    const reportData = payload?.data;
    if (Array.isArray(reportData)) return reportData;

    if (reportData && Array.isArray(reportData.monthly)) {
      const rows = [...reportData.monthly];
      if (reportData.total) {
        rows.push({ ...reportData.total, isTotal: true });
      }
      return rows;
    }

    if (Array.isArray(payload?.monthly)) return payload.monthly;

    return [];
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export type HourlyThresholdStatusRow = {
  configId: number | null;
  city: string;
  travelType: string;
  partnerName: string;
  vehicleType: string;
  fromHour: number;
  toHour: number;
  date: string;
  isEnabled: boolean;
  thresholds: { window: number; daily: number };
  counters: { window: number; daily: number };
  remaining: { window: number | null; daily: number | null };
  bookingAllowed: boolean;
};

export const GET_HOURLY_THRESHOLD_STATUS = async (
  selectedPartner: string,
  query: { date?: string; city?: string; refreshCache?: boolean } = {},
): Promise<{ rows: HourlyThresholdStatusRow[]; message: string }> => {
  const response = await GetAPI<{
    data?: HourlyThresholdStatusRow[];
    message?: string;
  }>(
    resolvePartner(selectedPartner),
    HOURLY_THRESHOLD_STATUS,
    withReadParams(selectedPartner, query),
    { skipAuthRedirect: true },
  );
  return {
    rows: Array.isArray(response.data?.data) ? response.data.data : [],
    message: response.data?.message || "",
  };
};

export const GET_NPS_RECORDS = async (selectedPartner: string, payload: NpsRecordsPayload) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, Fetch_customer_review, payload);
      const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      Fetch_customer_review,
      // withDomainBody(selectedPartner, payload)
        withReadBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching NPS records:", error);
    throw error;
  }
};



export const CUSTOM_GENERIC_UPDATE = async (selectedPartner: string, payload: any) => {
  try {
    // const response = await PutAPI<any>(selectedPartner, Update_Generic_data, payload);
     const response = await PutAPI<any>(
      resolvePartner(selectedPartner),
      Update_Generic_data,
      withDomainBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    console.error("Error updating generic record:", error);
    throw error;
  }
};


// ixigo fareSerach 
export const GET_IXIGO_FARE_STATS = async (
  queryParams: any,
  signal?: AbortSignal,
): Promise<any> => {
  try {
    const response = await GetAPI<any>("ixigo", getbookingstatistics, queryParams, {
      signal,
    });
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};


export const GET_PAYMENT_STATUS = async (selectedPartner: string, queryParams: any): Promise<any> => {
  try {
    // const response = await GetAPI<any>(selectedPartner, GetPaymentStatus, queryParams);
     const response = await GetAPI<any>(
      resolvePartner(selectedPartner),
      GetPaymentStatus,
      // withDomainParams(selectedPartner, queryParams)
      withReadParams(selectedPartner, queryParams)
    );
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_BOOKING_INVOICE_API = async (
  selectedPartner: string,
  payload: {
    bookingId: string;
    type: "download";
  }
): Promise<string> => {
  try {
    const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      GET_BOOKING_INVOICE,
      withDomainBody(selectedPartner, payload)
    );

    return response?.data?.data || "";
  } catch (error) {
    console.error("Invoice API Error:", error);
    throw error;
  }
};


export const TRIGGER_MESSAGE_TO_SPOC = async (selectedPartner: string, payload: SpocMessagePayload) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, Trigger_Spoc_Message, payload);
     const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      Trigger_Spoc_Message,
      withDomainBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching NPS records:", error);
    throw error;
  }
};

 export const CUSTOM_GENERIC_CREATE = async (selectedPartner: string, payload: any) => {
  try {
    // const response = await PostAPI<any>(selectedPartner, GenericCreate, payload);
        const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      GenericCreate,
      withDomainBody(selectedPartner, payload)
    );
    return response.data;
  } catch (error) {
    console.error("Error creating generic record:", error);
    throw error;
  }
};

export const CUSTOM_GENERIC_DELETE = async (
  selectedPartner: string,
  payload: any
) => {
  try {
    const response = await DeleteAPI<any>(
      resolvePartner(selectedPartner),
      GenericDelete,
      withDomainBody(selectedPartner, payload)
    );

    return response.data;
  } catch (error) {
    console.error("Error deleting generic record:", error);
    throw error;
  }
};

export const SEND_NPS_WHATSAPP_API = async (
  selectedPartner: string,
  payload: { bookingId: string }
) => {
  try {
    const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      SEND_NPS_WHATSAPP,
      withDomainBody(selectedPartner, payload)
    );

    return response.data;
  } catch (error) {
    console.error("Error sending NPS whatsapp:", error);
    throw error;
  }
};

export const GET_MERGED_NPS_RECORDS = async (
  selectedPartner: string,
  payload: {
    startDate: string;
    endDate: string;
    page: number;
    limit: number;
    rating?: string;
  },
) => {
  try {
    const response = await PostAPI<any>(
      resolvePartner(selectedPartner),
      MERGED_NPS_RECORDS_ENDPOINT,
      withReadBody(selectedPartner, payload),
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching merged NPS records:", error);
    throw error;
  }
};

export const GET_OFFER_ANALYTICS = async (
  selectedPartner: string,
  params: any
) => {
  try {
    const response = await GetAPI<{ data: any; code?: number; pagination?: any }>(
      resolvePartner(selectedPartner),
      OfferAnalytics,
      params
    );

    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_CLOUDWATCH_LOGS = async (
  selectedPartner: string,
  params: {
    bookingId: string;
    startTimeIst?: string;
    endTimeIst?: string;
    limit?: number;
    nextToken?: string | null;
  },
  signal?: AbortSignal
) => {
  try {
    const query: Record<string, any> = { bookingId: params.bookingId };
    if (params.startTimeIst) query.startTimeIst = params.startTimeIst;
    if (params.endTimeIst) query.endTimeIst = params.endTimeIst;
    if (params.limit) query.limit = params.limit;
    if (params.nextToken) query.nextToken = params.nextToken;

    const response = await GetAPI<any>(
      resolvePartner(selectedPartner),
      CLOUDWATCH_LOGS,
      query,
      { signal }
    );
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_CLOUDWATCH_ERRORS = async (
  selectedPartner: string,
  params: {
    search?: string;
    startTimeIst: string;
    endTimeIst: string;
    limit?: number;
    topN?: number;
    level?: "error" | "warn" | "all";
    nextToken?: string | null;
  },
  signal?: AbortSignal
) => {
  try {
    const query: Record<string, any> = {
      startTimeIst: params.startTimeIst,
      endTimeIst: params.endTimeIst,
    };
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.limit) query.limit = params.limit;
    if (params.topN) query.topN = params.topN;
    if (params.level) query.level = params.level;
    if (params.nextToken) query.nextToken = params.nextToken;

    const response = await GetAPI<any>(
      resolvePartner(selectedPartner),
      CLOUDWATCH_ERRORS,
      query,
      { signal }
    );
    return response.data?.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const GET_OFFER_AUDIT_LOG = async (
  selectedPartner: string,
  params: any
) => {
  try {
    const response = await GetAPI<{ data: any; code?: number; pagination?: any }>(
      resolvePartner(selectedPartner),
      OfferAuditLog,
      params
    );
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const EXPORT_BOOKING_CSV = async (
    selectedPartner: string,
    params: {
        startDate: string;
        endDate: string;
    }
) => {

    const response = await GetAPI<any>(
        resolvePartner(selectedPartner),
        BOOKING_CSV_EXPORT,
        withReadParams(selectedPartner, params)
    );

    return response.data;
};
/** Ops fare search — uses the selected partner tab host and token. */
export const OPS_FARE_SEARCH = async (
  selectedPartner: string,
  payload: Record<string, any>
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    `${FARE_SEARCH}?context=mojoboxx`,
    payload
  );
  return response.data;
};

function partnerMapsHost(selectedPartner: string): string {
  const state = store.getState() as any;
  const key = resolvePartner(selectedPartner);
  return String(state?.authStore?.partner_wise_data?.[0]?.[key]?.host || "")
    .trim()
    .replace(/\/$/, "");
}

function partnerMapsToken(selectedPartner: string): string {
  const state = store.getState() as any;
  const key = resolvePartner(selectedPartner);
  return String(state?.authStore?.partner_wise_data?.[0]?.[key]?.auth || "").trim();
}

function isLocalOpsOrigin() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * On local Vite, partner /maps rejects Origin:localhost.
 * Proxy through Vite with a bookairportcab Origin so railyatri-dev accepts the call.
 */
async function mapsGetViaLocalProxy(
  selectedPartner: string,
  mapsPath: "/placeSearch" | "/placeDetails" | "/distanceMatrix",
  params: Record<string, any>
) {
  const host = partnerMapsHost(selectedPartner);
  const token = partnerMapsToken(selectedPartner);
  if (!host || !token) {
    throw new Error("RAILYATRI host/token missing from login. Re-login and select RAILYATRI.");
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }

  const response = await axios.get(`/ops-maps${mapsPath}?${search.toString()}`, {
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "X-Partner-Host": host,
      Accept: "application/json",
    },
  });
  return response.data;
}

async function mapsGet(
  selectedPartner: string,
  path: string,
  mapsPath: "/placeSearch" | "/placeDetails" | "/distanceMatrix",
  params: Record<string, any>
) {
  if (isLocalOpsOrigin()) {
    return mapsGetViaLocalProxy(selectedPartner, mapsPath, params);
  }

  const response = await GetAPI<any>(
    resolvePartner(selectedPartner),
    path,
    params,
    { skipAuthRedirect: true }
  );
  return response.data;
}

/** Google Places autocomplete via partner maps proxy. */
export const OPS_PLACE_SEARCH = async (
  selectedPartner: string,
  params: {
    input: string;
    components?: string;
    sessiontoken?: string;
    language?: string;
  }
) => {
  return mapsGet(selectedPartner, PLACE_SEARCH, "/placeSearch", {
    components: "country:in",
    language: "en",
    ...params,
  });
};

/** Place details (lat/lng) via partner maps proxy. */
export const OPS_PLACE_DETAILS = async (
  selectedPartner: string,
  params: {
    placeId: string;
    sessiontoken?: string;
    language?: string;
  }
) => {
  return mapsGet(selectedPartner, PLACE_DETAILS, "/placeDetails", {
    language: "en",
    ...params,
  });
};

/** Driving distance / duration via partner maps proxy. */
export const OPS_DISTANCE_MATRIX = async (
  selectedPartner: string,
  params: {
    sourceLat: number;
    sourceLng: number;
    destLat: number;
    destLng: number;
  }
) => {
  return mapsGet(selectedPartner, DISTANCE_MATRIX, "/distanceMatrix", {
    travelMode: "driving",
    ...params,
  });
};

/** Ops prebook — creates a booking from a fare-search card. */
export const OPS_PREBOOK = async (
  selectedPartner: string,
  payload: Record<string, any>
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    PREBOOK,
    withDomainBody(selectedPartner, payload)
  );
  return response.data;
};

/** Confirms payment after prebook. Stage/RailYatri full and partial also send amount. */
export const OPS_PAYMENT_CONFIRMATION = async (
  selectedPartner: string,
  payload: { bookingId: string; amount?: string }
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    PAYMENT_CONFIRMATION,
    withDomainBody(selectedPartner, payload)
  );
  return response.data;
};

/** CX reassignment fare search — full response TravelVIP-branded */
export const REASSIGN_FARE_SEARCH = async (
  selectedPartner: string,
  payload: Record<string, any>
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    FARE_SEARCH,
    withDomainBody(selectedPartner, { ...payload, context: "reassign" })
  );
  return response.data;
};

/** CX reassignment orchestrator — silent cancel + preBook + paymentConfirm */
export const REASSIGN_BOOKING_API = async (
  selectedPartner: string,
  payload: {
    bookingId: string;
    searchId: string;
    reassignedBy?: string;
    /** When false, customer does not receive reschedule_msg WhatsApp */
    communication?: boolean;
  }
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    REASSIGN_BOOKING,
    withDomainBody(selectedPartner, payload)
  );
  return response.data;
};

/**
 * Reschedule fare quote — evaluates all fares for a new pickup time and
 * flags options that require customer confirmation (fare increase).
 */
export const RESCHEDULE_FARE_QUOTE_API = async (
  selectedPartner: string,
  payload: { bookingId: string; startDateTime: string }
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    RESCHEDULE_FARE_QUOTE,
    withDomainBody(selectedPartner, payload)
  );
  return response.data;
};

/** @deprecated Use RESCHEDULE_FARE_QUOTE_API */
export const RESCHEDULE_FARE_SEARCH = RESCHEDULE_FARE_QUOTE_API;

/** Reschedule orchestrator — invoice rules depend on fare direction (PRD) */
export const RESCHEDULE_BOOKING_API = async (
  selectedPartner: string,
  payload: {
    bookingId: string;
    searchId: string;
    rescheduledBy?: string;
    /** Required when the new fare is higher than the original booking */
    confirmed?: boolean;
    /** When false, skip reschedule_msg WhatsApp */
    communication?: boolean;
  }
) => {
  const response = await PostAPI<any>(
    resolvePartner(selectedPartner),
    RESCHEDULE_BOOKING,
    withDomainBody(selectedPartner, payload)
  );
  return response.data;
};
