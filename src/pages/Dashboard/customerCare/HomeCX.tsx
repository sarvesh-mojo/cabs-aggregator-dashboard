import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Descriptions, Tabs, Button } from "antd";
import dayjs from "dayjs";
import DataTable from "../../../components/tables/DataTable";
import { GETBOOKING_LOGS } from "../../../config/customerCare/operationsApicall";
import { Booking } from "../../../config/customerCare/interfaceTypes";
import { useDispatch, useSelector } from "react-redux";
import {
  SaveActivePartner,
  SaveDateRange,
} from "../../../Redux/slices/operationSlice";
import {
  AscendingPickupTime,
  getSignatureNext4HrApiWindow,
  sortBookingsByRecentCreated,
} from "../../../config/customerCare/helper";
import { RangerPicker } from "../../../components/common/RangePicker";
import { SearchBooking } from "../../../components/common/SearchBooking";
import { DatatableColumns, mergeCachedBookingRemark, matchesBookingRemarkId, normalizeBookingRemarkKey, resolveRemarkApiPartner, type CachedBookingRemark } from "../../../components/tables/columns";
import { store } from "../../../Redux/store";
import { FilterOutlined } from "@ant-design/icons";
import CreateLogModal, {
  mapBookingToLogForm,
} from "../customerCare/Createlogmodal";
import { isRequestCanceled } from "../../../config/apiMethods";
import { fetchSupportLogsForBookings } from "../../../utils/customerSupportLogs";
import {
  fetchOpsRemarksForBookings,
  readRemarkCacheFromSession,
  writeRemarkCacheToSession,
} from "../../../utils/bookingOpsRemarks";
import {
  fetchSignaturePartnerCounts,
  fetchSignaturePhysicalPartnerLogs,
} from "../../../utils/signaturePhysicalPartners";
import {
  AvailablecabPartners,
  SIGNATURE_PHYSICAL_CAB_PARTNERS,
} from "../../../config/customerCare/constant";
import { isIndigoCxUser, resolveLockedCabPartners } from "../../../utils/partnerAccess";
import { dedupeBookingsById } from "../../../utils/dedupeBookings";
import EmailComplaintTab from "./EmailComplaintTab";
import {
  EMAIL_COMPLAINT_REFRESH_MS,
  listEmailComplaints,
} from "../../../config/customerCare/emailComplaintApi";

const { TabPane } = Tabs;

const BAC_SUB_TABS = [
  "bac_agent",
  "bac_mb",
  "bac_yatra",
  "bac_corp",
  "bac_swiggy",
  "bac_agentic_chat_dev",
  "bac_agentic_chat",
];

const isTruthyFlag = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true";

/**
 * Driver Reached list rules (API payload unchanged):
 * 1. Reached: Yes — server filters via cabReachedSource:true
 * 2. Started: Yes — remove from tab
 * 3. Pickup > 60 min ago and not started — hide stale reached rides
 */
const filterReachedRides = (bookings: any[]) => {
  const now = new Date();
  return (bookings || []).filter((booking) => {
    if (isTruthyFlag(booking?.cabTripStarted)) return false;

    if (!booking?.pickupTime) return true;

    const pickupTime = new Date(String(booking.pickupTime).replace("Z", "+05:30"));
    const minutesPassed =
      (now.getTime() - pickupTime.getTime()) / (1000 * 60);
    return minutesPassed <= 60;
  });
};

const applyReachedRidesResponse = (logsResp: any) => {
  if (!logsResp) return;

  const filteredBookings = filterReachedRides(logsResp.bookings || []);
  logsResp.bookings = filteredBookings;
  logsResp.totalRecords = filteredBookings.length;
};

const normalizeHomeCxBooking = (item: any, index = 0): Booking => ({
  ...item,
  _rowKey: [
    item?.parentBookingId,
    item?.bookingId,
    item?.pickupTime,
    item?.mobile,
    index,
  ]
    .filter(Boolean)
    .join("|"),
  opsRemarks: item?.opsRemarks ?? item?.ops_remarks ?? null,
  opsRemarkCreatedAt:
    item?.opsRemarkCreatedAt ?? item?.ops_remark_created_at ?? null,
  remarkCount: Number(item?.remarkCount ?? item?.remark_count ?? 0),
});

const homeCxRowKey = (record: Booking) =>
  String((record as Booking & { _rowKey?: string })._rowKey ?? record.bookingId ?? "");

export const HomeCX = () => {
  const dispatch = useDispatch();
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const AuthstoreData = useSelector((state: any) => state?.authStore);

  const loginPartners: string[] = AuthstoreData?.login_partners || [];
  const lockedCabPartners = resolveLockedCabPartners(
    loginPartners,
    AuthstoreData?.logsPartner,
  );
  const lockedCabPartner =
    lockedCabPartners.length === 1 ? lockedCabPartners[0] : "";
  const fetchPartners = useMemo(() => {
    const platforms = loginPartners.filter(
      (p) =>
        !BAC_SUB_TABS.includes(p) &&
        !lockedCabPartners.some(
          (cabPartner) => cabPartner.toLowerCase() === p.toLowerCase(),
        ),
    );
    return platforms.length ? platforms : ["indigo"];
  }, [loginPartners.join(","), lockedCabPartners.join(",")]);

  // Prefer Redux partner; avoid "" which previously triggered a full multi-partner fetch
  const partnerFromStore = OperationstoreData?.selectedPartner as string;
  const [partner, setPartner] = useState<string>(() => {
    const storedIsCabPartner = lockedCabPartners.some(
      (cabPartner) =>
        cabPartner.toLowerCase() === String(partnerFromStore || "").toLowerCase(),
    );
    if (partnerFromStore && !storedIsCabPartner) return partnerFromStore;
    return fetchPartners.length > 1 ? "all" : fetchPartners[0] || "indigo";
  });

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return [today, today];
  });

  // Data States
  const [next2hrData, setNext2hrData] = useState<Booking[]>([]);
  const [delayData, setDelayData] = useState<Booking[]>([]);
  const [activeData, setActiveData] = useState<Booking[]>([]);
  const [delayType, setDelayType] = useState<"all" | "arrival" | "departure">(
    "all",
  );
  const [CancelledData, setCancelledData] = useState<Booking[]>([]);
  const [paymentCapturedData, setPaymentCapturedData] = useState<Booking[]>([]);
  const [reachedData, setReachedData] = useState<Booking[]>([]);
  const [signatureData, setSignatureData] = useState<Booking[]>([]);
  const [allRidesData, setAllRidesData] = useState<Booking[]>([]);
  const [allRidesTotal, setAllRidesTotal] = useState(0);
  const cxView = isIndigoCxUser(
    AuthstoreData?.login_username,
    AuthstoreData?.user_rights,
  );
  const [signaturePartner, setSignaturePartner] = useState<string>("SIGNATURE");
  const [signaturePartnerCounts, setSignaturePartnerCounts] = useState<
    Record<string, number>
  >({});
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedCabPartner, setSelectedCabPartner] = useState("");
  const [tempCabPartner, setTempCabPartner] = useState("");
  const [bookingLogs, setBookingLogs] = useState<Record<string, any[]>>({});
  const [delayAssignments, setDelayAssignments] = useState<Record<string, any>>(
    {},
  );

  const [emailComplaintCount, setEmailComplaintCount] = useState<number | null>(null);
  const [counts, setCounts] = useState({
    Next2hrBookings: 0,
    DelayRides: 0,
    ReachedRides: 0,
    ActiveRides: 0,
    LastHrCancelled: 0,
    PaymentCaptured: 0,
    SignatureRides: 0,
  });

  const [loading, setLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(
    cxView ? "AllRides" : "DelayRides",
  );
  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 20,
  });

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalData, setLogModalData] = useState<{
    partner: string;
    prefill: Record<string, any>;
  }>({
    partner: "",
    prefill: {},
  });

  const activeTabKeyRef = useRef(activeTabKey);
  const listFetchInFlightRef = useRef<string | null>(null);
  const listFetchDedupeRef = useRef<{ key: string; at: number } | null>(null);
  const dashboardLoadInFlightRef = useRef<string | null>(null);
  const hydrateLogsCacheRef = useRef("");
  const hydrateLogsInFlightRef = useRef<string | null>(null);
  const hydrateRemarksCacheRef = useRef("");
  const hydrateRemarksInFlightRef = useRef<string | null>(null);
  const lastLoadKeyRef = useRef("");
  const bookingRemarksCacheRef = useRef<Record<string, CachedBookingRemark>>(
    readRemarkCacheFromSession(),
  );

  const persistRemarkCache = useCallback(() => {
    writeRemarkCacheToSession(bookingRemarksCacheRef.current);
  }, []);

  const applyRemarkCache = useCallback((bookings: Booking[]) => {
    return bookings.map((booking) =>
      mergeCachedBookingRemark(booking, bookingRemarksCacheRef.current),
    );
  }, []);

  const refreshAllTabRemarks = useCallback(() => {
    setNext2hrData((prev) => applyRemarkCache(prev));
    setDelayData((prev) => applyRemarkCache(prev));
    setReachedData((prev) => applyRemarkCache(prev));
    setActiveData((prev) => applyRemarkCache(prev));
    setPaymentCapturedData((prev) => applyRemarkCache(prev));
    setSignatureData((prev) => applyRemarkCache(prev));
    setCancelledData((prev) => applyRemarkCache(prev));
    setSearchResults((prev) => applyRemarkCache(prev));
  }, [applyRemarkCache]);

  const COUNT_TAB_KEYS = [
    "Next2hrBookings",
    "DelayRides",
    "ReachedRides",
    "ActiveRides",
    "LastHrCancelled",
    "PaymentCaptured",
  ] as const;

  const tabSetterMap: Record<string, Function> = {
    Next2hrBookings: setNext2hrData,
    DelayRides: setDelayData,
    ReachedRides: setReachedData,
    ActiveRides: setActiveData,
    PaymentCaptured: setPaymentCapturedData,
    SignatureRides: setSignatureData,
    LastHrCancelled: setCancelledData,
    SearchResults: setSearchResults,
    AllRides: setAllRidesData,
  };

  const resolveLogPartner = useCallback(
    (record: any): string => {
      if (resolveRemarkApiPartner(record, partner) === "railyatri") {
        return "railyatri";
      }

      const raw = record?.partnerName?.toLowerCase();
      const partnerWiseData =
        store.getState().authStore?.partner_wise_data?.[0] || {};
      if (raw && partnerWiseData[raw]) return raw;
      if (raw && partnerWiseData[`bac_${raw}`]) return `bac_${raw}`;
      if (partner && partner !== "all") return partner;
      return "mojo";
    },
    [partner],
  );

  const hydrateSupportLogs = useCallback(
    async (bookings: Booking[], force = false) => {
      if (!bookings?.length) return;

      const cacheKey = [
        partner,
        dateRange[0],
        dateRange[1],
        ...bookings.map((b) => b.bookingId).sort(),
      ].join("|");

      if (!force && hydrateLogsCacheRef.current === cacheKey) return;
      if (!force && hydrateLogsInFlightRef.current === cacheKey) return;

      hydrateLogsInFlightRef.current = cacheKey;

      try {
        const map = await fetchSupportLogsForBookings(
          bookings,
          dateRange,
          resolveLogPartner,
        );
        hydrateLogsCacheRef.current = cacheKey;
        setBookingLogs((prev) => ({ ...prev, ...map }));
      } finally {
        if (hydrateLogsInFlightRef.current === cacheKey) {
          hydrateLogsInFlightRef.current = null;
        }
      }
    },
    [dateRange, resolveLogPartner, partner],
  );

  const hydrateBookingRemarks = useCallback(
    async (bookings: Booking[], force = false) => {
      if (!bookings.length) return;

      const cacheKey = [
        partner,
        ...bookings.map((b) => b.bookingId).sort(),
      ].join("|");

      if (!force && hydrateRemarksCacheRef.current === cacheKey) return;
      if (!force && hydrateRemarksInFlightRef.current === cacheKey) return;

      hydrateRemarksInFlightRef.current = cacheKey;

      try {
        const fetched = await fetchOpsRemarksForBookings(
          bookings,
          dateRange,
          resolveLogPartner,
        );

        bookingRemarksCacheRef.current = {
          ...readRemarkCacheFromSession(),
          ...bookingRemarksCacheRef.current,
          ...fetched,
        };
        persistRemarkCache();
        hydrateRemarksCacheRef.current = cacheKey;
        refreshAllTabRemarks();
      } finally {
        if (hydrateRemarksInFlightRef.current === cacheKey) {
          hydrateRemarksInFlightRef.current = null;
        }
      }
    },
    [partner, persistRemarkCache, refreshAllTabRemarks, resolveLogPartner],
  );

  const patchBookingRemark = useCallback(
    (
      bookingId: string,
      data: { remark: string; tag: string; createdAt: string },
    ) => {
      const cacheKey = normalizeBookingRemarkKey(bookingId);
      const prevCount =
        bookingRemarksCacheRef.current[cacheKey]?.count ??
        0;
      const nextCount = prevCount + 1;

      bookingRemarksCacheRef.current[cacheKey] = {
        remark: data.remark,
        createdAt: data.createdAt,
        count: nextCount,
      };
      persistRemarkCache();

      const patchList = (list: Booking[]) =>
        list.map((booking) =>
          matchesBookingRemarkId(booking, bookingId)
            ? mergeCachedBookingRemark(
                {
                  ...booking,
                  opsRemarks: data.remark,
                  opsRemarkCreatedAt: data.createdAt,
                  remarkCount: Math.max(
                    Number(booking.remarkCount) || 0,
                    nextCount,
                  ),
                },
                bookingRemarksCacheRef.current,
              )
            : booking,
        );

      setNext2hrData(patchList);
      setDelayData(patchList);
      setReachedData(patchList);
      setActiveData(patchList);
      setPaymentCapturedData(patchList);
      setSignatureData(patchList);
      setCancelledData(patchList);
      setSearchResults(patchList);
    },
    [persistRemarkCache],
  );

  const handleCreateLog = (record: any) => {
    setLogModalData({
      partner: resolveLogPartner(record),
      prefill: mapBookingToLogForm(record),
    });
    setLogModalOpen(true);
  };

  useEffect(() => {
    activeTabKeyRef.current = activeTabKey;
  }, [activeTabKey]);

  const emailTabOpen = activeTabKey === "EmailComplaint";

  useEffect(() => {
    if (emailTabOpen) return;
    let cancelled = false;
    let inFlight = false;
    let requestSeq = 0;

    const refreshCount = async () => {
      if (cancelled || inFlight || document.visibilityState === "hidden") return;
      const seq = ++requestSeq;
      inFlight = true;
      try {
        const listed = await listEmailComplaints({ page: 1, limit: 1 });
        if (cancelled || seq !== requestSeq) return;
        if (typeof listed?.pendingLast7Days !== "number") return;
        setEmailComplaintCount(listed.pendingLast7Days);
      } catch (error) {
        console.error("Error fetching email complaint pending count", error);
      } finally {
        if (seq === requestSeq) inFlight = false;
      }
    };

    void refreshCount();
    const timer = window.setInterval(() => {
      void refreshCount();
    }, EMAIL_COMPLAINT_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [emailTabOpen]);

  // Sync partner from Redux only when it actually changes
  useEffect(() => {
    const storedIsCabPartner = lockedCabPartners.some(
      (cabPartner) =>
        cabPartner.toLowerCase() === String(partnerFromStore || "").toLowerCase(),
    );
    if (partnerFromStore && !storedIsCabPartner && partnerFromStore !== partner) {
      setPartner(partnerFromStore);
    }
  }, [partnerFromStore]);

  const getDashboardLoadKey = () =>
    [
      partner,
      dateRange[0],
      dateRange[1],
      fetchPartners.join(","),
      selectedCabPartner,
      lockedCabPartner,
    ].join("|");

  // Single reload: partner / date / cab filter — counts (limit 1) + active tab list (limit 20)
  useEffect(() => {
    const loadKey = getDashboardLoadKey();
    if (lastLoadKeyRef.current !== loadKey) {
      hydrateLogsCacheRef.current = "";
      hydrateRemarksCacheRef.current = "";
      lastLoadKeyRef.current = loadKey;
    }
    setPagination({ current: 1, pageSize: 20 });
    if (!partner) return;
    if (partner === "all" && fetchPartners.length === 0) return;
    const controller = new AbortController();
    loadDashboardData(controller.signal, loadKey);
    return () => controller.abort();
  }, [
    partner,
    dateRange[0],
    dateRange[1],
    fetchPartners.join(","),
    selectedCabPartner,
    lockedCabPartner,
  ]);

  const onSearch = (bookingId: string) => {
    if (!bookingId) {
      setSearchValue("");
      setSearchResults([]);
      setActiveTabKey(cxView ? "AllRides" : "DelayRides");
      return;
    }
    setSearchValue(bookingId);
  };

  // Search only — do not fetch on empty mount
  useEffect(() => {
    if (!searchValue) return;

    setLoading(true);
    fetchCategory("SearchResults", setSearchResults, "SearchResults", undefined, "list")
      .catch((error) => console.error("Error fetching sequence", error))
      .finally(() => setLoading(false));
    setActiveTabKey("SearchResults");
  }, [searchValue]);

  /** limit 1 for all tab badges, signature partner counts, then active tab list */
  const loadSignatureCounts = useCallback(
    async (signal?: AbortSignal) => {
      if (selectedCabPartner || lockedCabPartner) return;

      const signatureWindow = getSignatureNext4HrApiWindow();
      const basePayload = {
        bookingId: "",
        page: 1,
        limit: 1,
        startHour: signatureWindow.startHour,
        endHour: signatureWindow.endHour,
        startDate: signatureWindow.startDate,
        endDate: signatureWindow.endDate,
        status: "BOOKING_CONFIRMED",
      };

      const platformPartners = partner === "all" ? fetchPartners : [partner];
      const { counts: partnerCounts, total } = await fetchSignaturePartnerCounts(
        platformPartners,
        basePayload,
        signal,
      );

      if (signal?.aborted) return;

      setSignaturePartnerCounts(partnerCounts);
      setCounts((prev) => ({ ...prev, SignatureRides: total }));
    },
    [fetchPartners, partner, selectedCabPartner, lockedCabPartner],
  );

  const loadHeaderCountsOnly = async (signal?: AbortSignal) => {
    for (const key of COUNT_TAB_KEYS) {
      if (signal?.aborted) return;
      await fetchCategory(key, tabSetterMap[key], key, signal, "count");
    }

    if (signal?.aborted) return;

    if (lockedCabPartner || selectedCabPartner) {
      await fetchCategory(
        "SignatureRides",
        setSignatureData,
        "SignatureRides",
        signal,
        "count",
      );
    } else {
      await loadSignatureCounts(signal);
    }
  };

  /** Counts + one list fetch for the active tab — no duplicate prefetch. */
  const loadDashboardData = async (signal?: AbortSignal, loadKey?: string) => {
    const dedupeKey = loadKey ?? getDashboardLoadKey();
    if (dashboardLoadInFlightRef.current === dedupeKey) return;
    dashboardLoadInFlightRef.current = dedupeKey;

    setLoading(true);
    try {
      if (!cxView) {
        await loadHeaderCountsOnly(signal);
        if (signal?.aborted) return;
      }

      const activeKey = cxView ? "AllRides" : activeTabKeyRef.current;
      if (
        activeKey &&
        activeKey !== "Support" &&
        activeKey !== "SearchResults" &&
        activeKey !== "EmailComplaint"
      ) {
        await fetchCategory(
          activeKey,
          tabSetterMap[activeKey] || setCancelledData,
          activeKey,
          signal,
          "list",
        );
      }
    } catch (error: any) {
      if (isRequestCanceled(error)) return;
      console.error("Error fetching sequence", error);
    } finally {
      if (dashboardLoadInFlightRef.current === dedupeKey) {
        dashboardLoadInFlightRef.current = null;
      }
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchCategory = async (
    type: string,
    setState: Function,
    countKey: string,
    signal?: AbortSignal,
    mode: "count" | "list" = "list",
    signatureCabPartnerOverride?: string,
    paginationOverride?: { current: number; pageSize: number },
  ) => {
    let listFetchKey = "";
    try {
      const activeSignaturePartner =
        signatureCabPartnerOverride ?? signaturePartner;
      const currentHour = new Date().getHours();
      const TodayDate = dayjs().format("YYYY-MM-DD");
      let startHour, endHour, startDate, endDate;

      // Date Logic
      startDate = type === "Next2hrBookings" ? TodayDate : dateRange[0];
      endDate = type === "Next2hrBookings" ? TodayDate : dateRange[1];

      // Hour Logic
      if (type === "Next2hrBookings") {
        startHour = currentHour;
        if (currentHour === 23 || currentHour === 22) {
          endHour = 23;
        } else {
          endHour = (currentHour + 2) % 24;
        }
      } else if (type === "AllRides") {
        startHour = 0;
        endHour = 23;
      } else if (type === "DelayRides") {
        startHour = currentHour - 1;
        endHour = currentHour + 1;
      } else if (type === "LastHrCancelled") {
        startHour = currentHour - 1;
        endHour = currentHour;
        startDate = TodayDate;
        endDate = TodayDate;
      } else if (type === "SignatureRides") {
        const signatureWindow = getSignatureNext4HrApiWindow();
        startDate = signatureWindow.startDate;
        endDate = signatureWindow.endDate;
        startHour = signatureWindow.startHour;
        endHour = signatureWindow.endHour;
      } else {
        startHour = 0;
        endHour = 23;
      }

      const page =
        mode === "count" ? 1 : (paginationOverride?.current ?? pagination.current);
      const limit =
        mode === "count"
          ? type === "ReachedRides"
            ? 20
            : 1
          : (paginationOverride?.pageSize ?? pagination.pageSize) || 20;
      const appliedCabPartner = lockedCabPartner || selectedCabPartner;

      let bodyPayload: any = "";
      if (searchValue && mode === "list") {
        bodyPayload = {
          bookingId: searchValue,
          page,
          limit,
          ...(appliedCabPartner ? { cabPartner: appliedCabPartner } : {}),
        };
      } else {
        bodyPayload = {
          bookingId: "",
          page,
          limit,
          startHour,
          endHour,
          startDate,
          endDate,
          ...(appliedCabPartner ? { cabPartner: appliedCabPartner } : {}),

          status:
            type === "AllRides"
              ? "BOOKING_CONFIRMED,CANCELLED,COMPLETED,PAYMENT_CAPTURED,PAYMENT_FAILED,CAB_BOOKING_FAILED"
              : type === "LastHrCancelled"
              ? "CANCELLED"
              : type === "PaymentCaptured"
                ? "PAYMENT_CAPTURED"
                : type === "SignatureRides"
                  ? "BOOKING_CONFIRMED"
                  : "BOOKING_CONFIRMED",
          ...(type === "Next2hrBookings" ? { cabTripStarted: "false" } : ""),
          ...(type === "ActiveRides" ? { activeRides: "true" } : ""),
          ...(type === "DelayRides"
            ? { delay: "true", cabReachedSource: false }
            : type === "ReachedRides"
              ? { delay: "true", cabReachedSource: true }
              : type === "Next2hrBookings"
                ? { delay: "false" }
                : ""),
          ...(type === "SignatureRides" &&
          !appliedCabPartner &&
          activeSignaturePartner !== "all"
            ? { cabPartner: activeSignaturePartner }
            : {}),
        };
      }

      const useSignaturePhysicalPartners =
        type === "SignatureRides" &&
        !appliedCabPartner &&
        !(searchValue && mode === "list") &&
        activeSignaturePartner === "all";

      if (mode === "list") {
        listFetchKey = [
          type,
          partner,
          page,
          limit,
          startDate,
          endDate,
          startHour,
          endHour,
          appliedCabPartner,
          activeSignaturePartner,
          searchValue,
        ].join("|");
        const recentListFetch = listFetchDedupeRef.current;
        if (
          recentListFetch?.key === listFetchKey &&
          Date.now() - recentListFetch.at < 400
        ) {
          return;
        }
        if (listFetchInFlightRef.current === listFetchKey) return;
        listFetchInFlightRef.current = listFetchKey;
      }

      let logsResp: any = {};

      if (useSignaturePhysicalPartners) {
        const platformPartners = partner === "all" ? fetchPartners : [partner];
        logsResp = await fetchSignaturePhysicalPartnerLogs(
          platformPartners,
          bodyPayload,
          {
            signal,
            page,
            limit,
            mode,
            selectedCabPartner: appliedCabPartner,
          },
        );
      } else if (partner === "all") {
        const partnerList = fetchPartners;
        const results = await Promise.all(
          partnerList.map(async (p) => {
            try {
              return await GETBOOKING_LOGS(p, bodyPayload, signal);
            } catch (e: any) {
              if (isRequestCanceled(e)) throw e;
              console.error(e);
              return null;
            }
          }),
        );

        if (signal?.aborted) return;

        let mergedBookings: any[] = [];
        let total = 0;
        results.forEach((resp: any) => {
          if (resp?.bookings) mergedBookings = [...mergedBookings, ...resp.bookings];
          if (resp?.totalRecords) total += resp.totalRecords;
        });
        mergedBookings = dedupeBookingsById(mergedBookings);
        if (searchValue) total = mergedBookings.length;
        logsResp = { bookings: mergedBookings, totalRecords: total };
      } else {
        logsResp = (await GETBOOKING_LOGS(partner, bodyPayload, signal)) as any;
      }

      if (signal?.aborted) return;

      if (type === "ReachedRides" || type === "Driver Reached") {
        applyReachedRidesResponse(logsResp);
      }

      if (mode === "list") {
        logsResp =
          searchValue && type === "SearchResults"
            ? sortBookingsByRecentCreated(logsResp)
            : AscendingPickupTime(logsResp);
      }

      if (logsResp) {
        if (mode === "list") {
          const bookings = applyRemarkCache(
            (logsResp.bookings || []).map((item: any, index: number) =>
              normalizeHomeCxBooking(item, index),
            ),
          );
          setState(bookings);
          if (type === "AllRides" || type === "SearchResults") {
            setAllRidesTotal(Number(logsResp.totalRecords) || bookings.length);
          }
          hydrateSupportLogs(bookings);
          hydrateBookingRemarks(bookings);
        }
        if (type === "ReachedRides") {
          setCounts((prev) => ({
            ...prev,
            ReachedRides: logsResp.totalRecords || 0,
          }));
        } else if (
          mode === "count" &&
          (type !== "SignatureRides" || appliedCabPartner)
        ) {
          setCounts((prev) => ({
            ...prev,
            [countKey]: logsResp.totalRecords || 0,
          }));
        }
      }
    } catch (err: any) {
      if (isRequestCanceled(err)) return;
      console.error(`Error fetching ${type}`, err);
    } finally {
      if (mode === "list" && listFetchInFlightRef.current === listFetchKey) {
        listFetchInFlightRef.current = null;
        listFetchDedupeRef.current = { key: listFetchKey, at: Date.now() };
      }
    }
  };

  // Helper Functions for Table Actions
  const handleViewDetails = (record: Booking) => {
    setSelectedBooking(record);
    setModalVisible(true);
  };

  const handleShowJSON = (record: Booking) => {
    setSelectedBooking(record);
    setJsonModalVisible(true);
  };

  const handleUpdate = (record: Booking) => {
    const IdentifyPartner = resolveLogPartner(record);
    window.location.href = `/dashboard/customerCare/HandleBooking?bookingId=${IdentifyPartner}-${record?.bookingId}`;
  };

  const handlePartnerChange = (p: string) => {
    setPartner(p);
    dispatch(SaveActivePartner(p));
  };

  const handleDateChange = (dates: any) => {
    if (dates) {
      const newRange: [string, string] = [dates[0], dates[1]];
      setDateRange((prev) =>
        prev[0] === newRange[0] && prev[1] === newRange[1] ? prev : newRange,
      );
      dispatch(SaveDateRange(newRange));
    }
  };

  const handleApplyFilters = () => {
    setSelectedCabPartner(tempCabPartner);
    setFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setTempCabPartner("");
    setSelectedCabPartner("");
    setFilterModalOpen(false);
  };

  // const handleCreateLog = (record: any) => {
  //   setLogModalData({
  //     partner: record?.partnerName?.toLowerCase() || partner || "mojo",
  //     prefill: mapBookingToLogForm(record),
  //   });
  //   setLogModalOpen(true);
  // };

  const handleAssigned = (bookingId: string, record: any) => {
    setDelayAssignments((prev) => ({ ...prev, [bookingId]: record }));
  };

  const handleCompleted = (bookingId: string) => {
    setDelayAssignments((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], status: "COMPLETE" },
    }));
  };

  const filteredDelayData = (() => {
    if (delayType === "arrival") {
      return delayData.filter(
        (item: any) => item?.travelType?.toLowerCase() === "arrival",
      );
    }

    if (delayType === "departure") {
      return delayData.filter(
        (item: any) => item?.travelType?.toLowerCase() === "departure",
      );
    }

    return delayData;
  })();

  const delayArrivalCount = delayData.filter(
    (item: any) => item?.travelType?.toLowerCase() === "arrival",
  ).length;

  const delayDepartureCount = delayData.filter(
    (item: any) => item?.travelType?.toLowerCase() === "departure",
  ).length;

  const signatureListTotal =
    signaturePartner === "all"
      ? counts.SignatureRides
      : signaturePartnerCounts[signaturePartner] ?? 0;

  const handleSignaturePartnerChange = (nextPartner: string) => {
    if (nextPartner === signaturePartner) return;
    setSignaturePartner(nextPartner);
    setPagination({ current: 1, pageSize: 20 });
    setLoading(true);
    fetchCategory(
      "SignatureRides",
      setSignatureData,
      "SignatureRides",
      undefined,
      "list",
      nextPartner,
    ).finally(() => setLoading(false));
  };

  const columns = DatatableColumns(
    { type: activeTabKey, activePartner: partner, cxView },
    handleViewDetails,
    handleShowJSON,
    handleUpdate,
    handleCreateLog,
    bookingLogs,
    delayAssignments,
    handleAssigned,
    handleCompleted,
    patchBookingRemark,
  );

  let displayPartners = fetchPartners;
  if (displayPartners?.length > 1) {
    displayPartners = [...fetchPartners, "all"];
  }

  const handleTableChange = (pag: any) => {
    setPagination(pag);
    if (
      !activeTabKey ||
      activeTabKey === "Support" ||
      activeTabKey === "SearchResults" ||
      activeTabKey === "EmailComplaint"
    ) {
      return;
    }
    setLoading(true);
    fetchCategory(
      activeTabKey,
      tabSetterMap[activeTabKey] || setCancelledData,
      activeTabKey,
      undefined,
      "list",
      undefined,
      { current: pag.current, pageSize: pag.pageSize },
    ).finally(() => setLoading(false));
  };

  return (
    <div className="p-2 mt-3">
      <style>{`
        .homecx-signature-tab-label {
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }

        .homecx-signature-alert {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 3px 8px 3px 6px;
          border-radius: 8px;
          background: #fef2f2;
          border-left: 3px solid #dc2626;
        }

        .homecx-signature-dot-wrap {
          position: relative;
          width: 11px;
          height: 11px;
          flex-shrink: 0;
        }

        .homecx-signature-dot-ping {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: #ef4444;
          animation: homecx-signature-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .homecx-signature-dot {
          position: absolute;
          inset: 2px;
          border-radius: 9999px;
          background: #dc2626;
        }

        @keyframes homecx-signature-ping {
          75%,
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        .homecx-signature-text {
          color: #dc2626 !important;
          font-weight: 600;
          font-size: 13px;
        }

        .homecx-signature-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 9999px;
          background: #dc2626;
          color: #fff !important;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          animation: homecx-signature-badge-blink 1.2s ease-in-out infinite;
        }

        @keyframes homecx-signature-badge-blink {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.35;
          }
        }

        .homecx-email-tab-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1;
        }

        .homecx-email-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 9999px;
          background: #ea580c;
          color: #fff !important;
          font-size: 11px;
          font-weight: 700;
          animation: homecx-email-pulse 1.3s ease-in-out infinite;
        }

        @keyframes homecx-email-pulse {
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      {/* Partner Tabs */}
      {activeTabKey !== "EmailComplaint" ? (
      <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {displayPartners?.map((p: string) => (
            <button
              key={p}
              onClick={() => handlePartnerChange(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                partner === p
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <RangerPicker
            updateDate={[dateRange[0], dateRange[1]]}
            selectedRange={handleDateChange}
          />
          {lockedCabPartner ? (
            <span className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
              Cab partner: {lockedCabPartner}
            </span>
          ) : cxView ? null : (
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setTempCabPartner(selectedCabPartner);
                setFilterModalOpen(true);
              }}
            >
              Filters
            </Button>
          )}
        </div>
      </div>

      <SearchBooking onSearch={onSearch} />
      </>
      ) : null}

      {cxView ? (
        <DataTable
          dataSource={searchValue ? searchResults : allRidesData}
          columns={columns}
          loading={loading}
          rowKey={homeCxRowKey}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: searchValue ? searchResults.length : allRidesTotal,
          }}
          onChange={handleTableChange}
          title="All Rides"
        />
      ) : (
      <Tabs
        activeKey={activeTabKey}
        onChange={(key) => {
          if (key === "Support" || key === "SearchResults" || key === "EmailComplaint") {
            setActiveTabKey(key);
            return;
          }
          if (key === activeTabKey) return;

          setActiveTabKey(key);
          setPagination({ current: 1, pageSize: 20 });
          setLoading(true);
          fetchCategory(
            key,
            tabSetterMap[key] || setCancelledData,
            key,
            undefined,
            "list",
          ).finally(() => setLoading(false));
        }}
      >
        <TabPane
          tab={`Next 2hr Rides - ${counts.Next2hrBookings}`}
          key="Next2hrBookings"
        >
          <DataTable
            dataSource={next2hrData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: counts.Next2hrBookings,
            }}
            onChange={handleTableChange}
            title="Next 2hr Rides"
          />
        </TabPane>
        <TabPane tab={`Delay Rides - ${counts.DelayRides}`} key="DelayRides">
          <div className="flex gap-2 mb-4">
            <Button
              type={delayType === "all" ? "primary" : "default"}
              onClick={() => setDelayType("all")}
            >
              All ({counts.DelayRides})
            </Button>

            <Button
              type={delayType === "arrival" ? "primary" : "default"}
              onClick={() => setDelayType("arrival")}
            >
              Arrival ({delayArrivalCount})
            </Button>

            <Button
              type={delayType === "departure" ? "primary" : "default"}
              onClick={() => setDelayType("departure")}
            >
              Departure ({delayDepartureCount})
            </Button>
          </div>
          <DataTable
            // dataSource={delayData}
            dataSource={filteredDelayData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              // total: counts.DelayRides,
              total: filteredDelayData.length,
            }}
            onChange={handleTableChange}
            title="Delay Rides"
          />
        </TabPane>
        <TabPane
          tab={`Driver Reached - ${counts.ReachedRides}`}
          key="ReachedRides"
        >
          <DataTable
            dataSource={reachedData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: counts.ReachedRides,
            }}
            onChange={handleTableChange}
            title="Reached Rides"
          />
        </TabPane>
         <TabPane
          tab={
            counts.SignatureRides > 0 ? (
              <span className="homecx-signature-tab-label homecx-signature-alert">
                <span className="homecx-signature-dot-wrap" aria-hidden>
                  <span className="homecx-signature-dot-ping" />
                  <span className="homecx-signature-dot" />
                </span>
                <span className="homecx-signature-text">Signature</span>
                <span className="homecx-signature-badge">
                  {counts.SignatureRides}
                </span>
              </span>
            ) : (
              <span className="homecx-signature-tab-label">
                {`Signature - ${counts.SignatureRides}`}
              </span>
            )
          }
          key="SignatureRides"
        >
          {!lockedCabPartner && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              type={signaturePartner === "all" ? "primary" : "default"}
              onClick={() => handleSignaturePartnerChange("all")}
            >
              All ({counts.SignatureRides})
            </Button>
            {SIGNATURE_PHYSICAL_CAB_PARTNERS.map((cabPartner) => (
              <Button
                key={cabPartner}
                type={signaturePartner === cabPartner ? "primary" : "default"}
                onClick={() => handleSignaturePartnerChange(cabPartner)}
              >
                {cabPartner} ({signaturePartnerCounts[cabPartner] ?? 0})
              </Button>
            ))}
          </div>
          )}
          <DataTable
            dataSource={signatureData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: signatureListTotal,
            }}
            onChange={handleTableChange}
            title="Signature Rides"
          />
        </TabPane>
        <TabPane tab={`Active Rides - ${counts.ActiveRides}`} key="ActiveRides">
          <DataTable
            dataSource={activeData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: counts.ActiveRides,
            }}
            onChange={handleTableChange}
            title="Active Rides"
          />
        </TabPane>
        <TabPane
          tab={
            emailComplaintCount == null ? (
              "Email Complaint"
            ) : emailComplaintCount > 0 ? (
              <span className="homecx-email-tab-label">
                Email Complaint
                <span className="homecx-email-count">{emailComplaintCount}</span>
              </span>
            ) : (
              <span className="homecx-email-tab-label">
                {`Email Complaint - ${emailComplaintCount}`}
              </span>
            )
          }
          key="EmailComplaint"
        >
          <EmailComplaintTab
            active={activeTabKey === "EmailComplaint"}
            onInboxCount={setEmailComplaintCount}
            partner={partner}
            fetchPartners={fetchPartners}
            onViewDetails={handleViewDetails}
            onShowJSON={handleShowJSON}
            onUpdate={handleUpdate}
            onCreateLog={handleCreateLog}
          />
        </TabPane>
        <TabPane
          tab={`Payment Captured - ${counts.PaymentCaptured}`}
          key="PaymentCaptured"
        >
          <DataTable
            dataSource={paymentCapturedData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: counts.PaymentCaptured,
            }}
            onChange={handleTableChange}
            title="Payment Captured Bookings"
          />
        </TabPane>
        {/* <TabPane
          tab={`Signature - ${counts.SignatureRides}`}
          key="SignatureRides"
        >
          <DataTable
            dataSource={signatureData}
            columns={columns}
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: counts.SignatureRides,
            }}
            onChange={handleTableChange}
            title="Signature Rides"
          />
        </TabPane> */}

        {searchValue ? (
          <TabPane tab={`Search Results`} key="SearchResults">
            <DataTable
              dataSource={searchResults}
              columns={columns}
              loading={loading}
              rowKey={homeCxRowKey}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: searchResults.length,
              }}
              onChange={handleTableChange}
              title="Search Results"
            />
          </TabPane>
        ) : (
          ""
        )}
        {/* Support tab hidden — re-enable when RCA emailer iframe is needed again
        <TabPane tab="Support" key="Support">
          <iframe
            src="https://mojo-support-dev.bookairportcab.com"
            title="Support"
            style={{
              width: "100%",
              height: "80vh",
              border: "none",
              borderRadius: "8px",
            }}
            allow="clipboard-read; clipboard-write"
          />
        </TabPane>
        */}
        <TabPane
          tab={`Last 1hr Cancelled - ${counts.LastHrCancelled}`}
          key="LastHrCancelled"
        >
          <DataTable
            dataSource={CancelledData}
            columns={columns}
            loading={loading}
            rowKey={homeCxRowKey}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: counts.LastHrCancelled,
            }}
            onChange={handleTableChange}
            title="Last 1hr Cancelled Rides"
          />
        </TabPane>

      </Tabs>
      )}

      {/* Booking Details Modal */}
      <Modal
        open={modalVisible}
        title="Booking Details"
        footer={null}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        {selectedBooking ? (
          <Descriptions bordered column={2} size="small">
            {Object.entries(selectedBooking)?.map(([key, value]) => (
              <Descriptions.Item label={key} key={key}>
                {typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <p>No data available.</p>
        )}
      </Modal>

      <Modal
        open={filterModalOpen}
        onCancel={() => setFilterModalOpen(false)}
        footer={null}
        centered
        width={400}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Filter Options</h3>

          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block font-medium mb-3 text-gray-700">
              Cab Partner
            </label>

            <select
              className="w-full px-3 py-2 rounded-md border"
              value={tempCabPartner}
              onChange={(e) => setTempCabPartner(e.target.value)}
            >
              <option value="">All</option>

              {AvailablecabPartners.map((partner) => (
                <option key={partner} value={partner}>
                  {partner}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button danger onClick={handleResetFilters}>
              Reset
            </Button>

            <Button onClick={() => setFilterModalOpen(false)}>Cancel</Button>

            <Button type="primary" onClick={handleApplyFilters}>
              Apply
            </Button>
          </div>
        </div>
      </Modal>

      {/* JSON Modal */}
      <Modal
        open={jsonModalVisible}
        title="Booking JSON"
        footer={null}
        onCancel={() => setJsonModalVisible(false)}
        width={800}
      >
        <pre
          style={{
            background: "#f8f8f8",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          {JSON.stringify(selectedBooking, null, 2)}
        </pre>
      </Modal>
      {/* <CreateLogModal
  key={logModalData.prefill.bookingId}   // remount on new booking = form auto-resets
  open={logModalOpen}
  partner={logModalData.partner}
  initialData={logModalData.prefill}
  onClose={() => setLogModalOpen(false)}
  // onSuccess optional — add if you want a toast here
/> */}
      <CreateLogModal
        key={logModalData.prefill.bookingId}
        open={logModalOpen}
        partner={logModalData.partner}
        initialData={logModalData.prefill}
        onClose={() => setLogModalOpen(false)}
        onSuccess={(_bookingId: string, logData: Record<string, any>) => {
          const id = String(logData.bookingId || "");
          if (!id) return;
          setBookingLogs((prev) => {
            const keys = [
              id,
              id.startsWith("MJB") ? id.slice(3) : `MJB${id}`,
            ];
            const next = { ...prev };
            keys.forEach((key) => {
              next[key] = [logData, ...(prev[key] || [])];
            });
            return next;
          });
        }}
      />
    </div>
  );
};
