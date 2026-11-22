import React, { useEffect, useMemo, useState } from "react";
import { Modal, message } from "antd";
import { MdContentCopy } from "react-icons/md";
import {
  cancelBookingApi,
  Trip_has_ended_status,
  Trip_has_started_status,
  update_driver_arrived_status,
  update_Driver_left_BookingStatusApi,
} from "../../../config/customerCare/tripUpdate";
import AssignDriverModal from "../../../components/customerCare/AssignDriver";
import CancelBookingModal from "../../../components/customerCare/CancelBooking";
import CloudwatchLogs from "../../../components/customerCare/CloudwatchLogs";
import ReassignBookingModal from "../../../components/customerCare/ReassignBooking";
import RescheduleBookingModal from "../../../components/customerCare/RescheduleBooking";
import { Booking } from "../../../config/customerCare/interfaceTypes";
import { readBookedAddOns } from "../../../utils/addOnServices";
import {
  HIT_CANCEL_TRIP_IXIGO,
  REFUND_AMOUNT,
  REMARK_ADD_ON_REFUND,
  GETBOOKING_LOGS,
  INSERT_REMARK,
  GET_PAYMENT_STATUS,
  GET_NPS_RECORDS,
  CUSTOM_GENERIC_TABLE,
  GET_BOOKING_INVOICE_API,
} from "../../../config/customerCare/operationsApicall";
import {
  emailComplaintError,
  escalateBookingIssue,
  listRelatedEmailComplaints,
  notifyBookingCustomers,
  type EmailComplaintThread,
} from "../../../config/customerCare/emailComplaintApi";
import { store } from "../../../Redux/store";
import { useSearchParams, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  bookingDetailPartner,
  isCloudWatchLogsPartner,
  resolveInvoiceApiPartner,
} from "../../../utils/partnerAccess";
import { resolveRemarkApiPartner } from "../../../components/tables/columns";

type BookingStatusEvent = {
  status?: string;
  event_at_ist?: string;
  eventAtIst?: string;
};

const getStatusEventTime = (event: BookingStatusEvent): string =>
  event.event_at_ist ?? event.eventAtIst ?? "";

const formatIstDateTime = (dt: string | null | undefined): string => {
  if (!dt) return "N/A";
  const cleaned = dt
    .replace(/Z$/, "")
    .replace("T", " ")
    .replace(/\.\d+$/, "")
    .trim();
  const match = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/,
  );
  if (match) {
    const [, year, month, day, time] = match;
    return `${day}/${month}/${year}, ${time} IST`;
  }
  return `${cleaned} IST`;
};

const getTrackingEventTime = (record: {
  sync_datetime?: string | null;
  insertTime?: string | null;
  timestamp?: string | number | null;
}): string | null => {
  if (record.sync_datetime) return record.sync_datetime;
  if (record.insertTime) return record.insertTime;
  if (record.timestamp != null && record.timestamp !== "") {
    const ts = Number(record.timestamp);
    if (!Number.isNaN(ts) && ts > 0) return new Date(ts).toISOString();
  }
  return null;
};

const getPartnerVehicleName = (partnerResponse: unknown): string => {
  if (!partnerResponse || typeof partnerResponse !== "object") return "";
  const vehicleName = (partnerResponse as Record<string, unknown>).vehicle_name;
  if (vehicleName == null || vehicleName === "") return "";
  return String(vehicleName).trim();
};

const formatNpsSendTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const raw = String(value).trim();
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  if (hasZone) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return `${date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
      })} IST`;
    }
  }
  return formatIstDateTime(raw);
};

const npsSendStatusLabel = (status?: string): string => {
  switch (String(status || "").toLowerCase()) {
    case "sent":
      return "Sent";
    case "pending":
      return "Sent · reminder pending";
    case "responded":
      return "Sent · customer responded";
    case "failed":
      return "Failed";
    case "processing":
      return "Sending";
    default:
      return status || "Unknown";
  }
};

const npsSendStatusClass = (status?: string): string => {
  switch (String(status || "").toLowerCase()) {
    case "sent":
    case "responded":
      return "bg-green-100 text-green-700 border-green-300";
    case "pending":
    case "processing":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "failed":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

type SearchKind = "bookingId" | "mobile" | "email";

const classifySearchQuery = (value: string): SearchKind => {
  const trimmed = String(value || "").trim();
  if (trimmed.includes("@")) return "email";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 12 && !/[A-Za-z]/.test(trimmed)) {
    return "mobile";
  }
  return "bookingId";
};

const lookingIntoDraft = (bookingId?: string | null) =>
  [
    "Hello,",
    "",
    bookingId
      ? `We are looking into this matter for booking ${bookingId} and will call you shortly.`
      : "We are looking into this matter and will call you shortly.",
    "",
    "Thank you,",
    "Book Airport Cab Support",
    "care@bookairportcab.com",
  ].join("\n");

const HandleBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const navigate = useNavigate();

  const AuthstoreData = useSelector((state: any) => state.authStore);
  let displayPartners = AuthstoreData?.login_partners || [];

  const [booking, setBooking] = useState<Booking | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchPartner, setSearchPartner] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatusData, setPaymentStatusData] = useState<any>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [npsData, setNpsData] = useState<any[]>([]);
  const [npsMessageSends, setNpsMessageSends] = useState<any[]>([]);
  const [npsMessageSendsLoading, setNpsMessageSendsLoading] = useState(false);
  const [customerRideHistory, setCustomerRideHistory] = useState<any[]>([]);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);
  const [opsRemarks, setOpsRemarks] = useState<any[]>([]);
  const [statusEvents, setStatusEvents] = useState<BookingStatusEvent[]>([]);
  const [statusEventsLoading, setStatusEventsLoading] = useState(false);
  const [showPaymentStatusBlock, setShowPaymentStatusBlock] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    "details" | "cloudwatch" | "emails"
  >("details");
  const [directLogsBookingId, setDirectLogsBookingId] = useState("");
  const [relatedEmails, setRelatedEmails] = useState<EmailComplaintThread[]>([]);
  const [relatedEmailsTotal, setRelatedEmailsTotal] = useState(0);
  const [relatedEmailsLoading, setRelatedEmailsLoading] = useState(false);
  const [relatedEmailsError, setRelatedEmailsError] = useState("");
  const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);
  const [searchHits, setSearchHits] = useState<Booking[]>([]);
  const [escalating, setEscalating] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const [showPartnerResponse, setShowPartnerResponse] = useState(false);
  const [showtrackingUrl, setShowtrackingUrl] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const applyFetchedBooking = (fetchedBooking: Booking, partnerName: string) => {
    setBooking(fetchedBooking);
    setSearchHits([]);
    setDirectLogsBookingId("");
    fetchNpsData(fetchedBooking.bookingId, partnerName);
    fetchNpsMessageSends(fetchedBooking.bookingId, partnerName);
    fetchCustomerRideHistory(
      fetchedBooking.mobile,
      partnerName,
      fetchedBooking.bookingId,
    );
    fetchOpsRemarks(fetchedBooking.bookingId, partnerName);
    fetchStatusEvents(fetchedBooking.bookingId, partnerName);
    fetchRelatedEmails(fetchedBooking);
    if (fetchedBooking.paymentDetails) {
      setPaymentStatusData(fetchedBooking.paymentDetails);
      setShowPaymentStatusBlock(true);
    } else {
      setPaymentStatusData(null);
      setShowPaymentStatusBlock(false);
    }
  };

  const clearBookingState = (fallbackId = "") => {
    setBooking(null);
    setDirectLogsBookingId(fallbackId);
    setPaymentStatusData(null);
    setShowPaymentStatusBlock(false);
    setStatusEvents([]);
    setCustomerRideHistory([]);
    setNpsMessageSends([]);
    setRelatedEmails([]);
    setRelatedEmailsTotal(0);
    setRelatedEmailsError("");
    setExpandedEmailId(null);
  };

  const fetchBooking = async (bId: string, partnerName: string) => {
    setLoading(true);
    setSearchHits([]);
    try {
      const kind = classifySearchQuery(bId);
      const payload: any = {
        bookingId: bId.trim(),
        pageName: "detail",
        partnerResponse: true,
        limit: kind === "bookingId" ? 5 : 20,
        orderDirection: "DESC",
      };
      const response: any = await GETBOOKING_LOGS(partnerName, payload);
      const list: Booking[] = Array.isArray(response?.bookings) ? response.bookings : [];
      if (!list.length) {
        clearBookingState(bId);
        return;
      }
      const exact = list.find(
        (item) =>
          String(item.bookingId || "").toUpperCase() === bId.trim().toUpperCase() ||
          String(item.parentBookingId || "").toUpperCase() === bId.trim().toUpperCase(),
      );
      if (kind !== "bookingId" && list.length > 1 && !exact) {
        setSearchHits(list);
        clearBookingState();
        return;
      }
      applyFetchedBooking(exact || list[0], partnerName);
      if ((exact || list[0])?.bookingId) {
        const selectedId = String((exact || list[0]).bookingId);
        setSearchInput(selectedId);
        navigate(
          `/dashboard/customerCare/HandleBooking?bookingId=${partnerName}-${selectedId}`,
          { replace: true },
        );
      }
    } catch (e) {
      console.error(e);
      setSearchHits([]);
      clearBookingState(bId);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedEmails = async (fetchedBooking: Booking) => {
    const bookingId = String(fetchedBooking?.bookingId || "").trim();
    const email = String(fetchedBooking?.email || "").trim();
    const mobile = String(fetchedBooking?.mobile || "").trim();
    if (!bookingId && !email && !mobile) {
      setRelatedEmails([]);
      setRelatedEmailsTotal(0);
      setRelatedEmailsError("");
      return;
    }
    setRelatedEmailsLoading(true);
    setRelatedEmailsError("");
    setExpandedEmailId(null);
    try {
      const listed = await listRelatedEmailComplaints({
        bookingId: bookingId || undefined,
        email: email || undefined,
        mobile: mobile || undefined,
        limit: 20,
      });
      setRelatedEmails(listed?.threads || []);
      setRelatedEmailsTotal(listed?.total || listed?.threads?.length || 0);
    } catch (error) {
      console.error("Error fetching related emails:", error);
      setRelatedEmails([]);
      setRelatedEmailsTotal(0);
      setRelatedEmailsError(emailComplaintError(error));
    } finally {
      setRelatedEmailsLoading(false);
    }
  };

  const fetchCustomerRideHistory = async (
    mobile: string,
    partnerName: string,
    currentBookingId?: string,
  ) => {
    if (!mobile) {
      setCustomerRideHistory([]);
      return;
    }
    setCustomerHistoryLoading(true);
    try {
      const response: any = await GETBOOKING_LOGS(partnerName, {
        bookingId: mobile,
        page: 1,
        limit: 20,
        pageName: "logs",
      });
      const list: any[] =
        response?.bookings ??
        (Array.isArray(response?.data?.bookings)
          ? response.data.bookings
          : Array.isArray(response)
            ? response
            : []);
      const others = currentBookingId
        ? list.filter((b) => b.bookingId !== currentBookingId)
        : list;
      setCustomerRideHistory(others.length ? others : list);
    } catch (error) {
      console.error("Error fetching customer ride history:", error);
      setCustomerRideHistory([]);
    } finally {
      setCustomerHistoryLoading(false);
    }
  };

  const fetchNpsData = async (bId: string, partnerName: string) => {
    try {
      const payload = {
        page: 1,
        limit: 10,
        search: bId,
        startDT: "2020-01-01", // Long range to catch data
        endDT: new Date().toISOString().split("T")[0],
      };
      const response = await GET_NPS_RECORDS(partnerName, payload);
      console.log(response);
      if (
        response?.status === "success" &&
        Array.isArray(response.data?.reviews)
      ) {
        setNpsData(response.data.reviews);
      }
    } catch (error) {
      console.error("Error fetching NPS:", error);
    }
  };

  const fetchNpsMessageSends = async (bId: string, partnerName: string) => {
    setNpsMessageSendsLoading(true);
    try {
      const response = await CUSTOM_GENERIC_TABLE(partnerName, {
        table: "nps_message_sends",
        limit: 20,
        page: 1,
        filters: {
          booking_id: bId,
        },
      });
      const rows = Array.isArray(response?.data) ? response.data : [];
      if (response?.status === "success" || response?.code === 200) {
        setNpsMessageSends(rows);
      } else {
        setNpsMessageSends([]);
      }
    } catch (error) {
      console.error("Error fetching NPS message sends:", error);
      setNpsMessageSends([]);
    } finally {
      setNpsMessageSendsLoading(false);
    }
  };

  const fetchOpsRemarks = async (bId: string, partnerName: string) => {
    try {
      const payload = {
        table: "ops_booking_remarks",
        limit: 20,
        page: 1,
        filters: {
          bookingId: bId,
        },
      };
      const response = await CUSTOM_GENERIC_TABLE(partnerName, payload);
      if (response?.status === "success" && Array.isArray(response.data)) {
        setOpsRemarks(response.data);
      } else {
        setOpsRemarks([]);
      }
    } catch (error) {
      console.error("Error fetching ops remarks:", error);
      setOpsRemarks([]);
    }
  };

  const fetchStatusEvents = async (bId: string, partnerName: string) => {
    setStatusEventsLoading(true);
    try {
      const payload = {
        table: "booking_status_events",
        limit: 10,
        page: 1,
        filters: {
          booking_id: bId,
        },
      };
      const response = await CUSTOM_GENERIC_TABLE(partnerName, payload);
      const rows = Array.isArray(response?.data) ? response.data : [];

      if (response?.status === "success" || response?.code === 200) {
        const sorted = [...rows].sort(
          (a: BookingStatusEvent, b: BookingStatusEvent) =>
            new Date(getStatusEventTime(a)).getTime() -
            new Date(getStatusEventTime(b)).getTime(),
        );
        setStatusEvents(sorted);
      } else {
        setStatusEvents([]);
      }
    } catch (error) {
      console.error("Error fetching booking status events:", error);
      setStatusEvents([]);
    } finally {
      setStatusEventsLoading(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!booking?.parentBookingId) return;
    setCheckingPayment(true);
    try {
      const { selectedPartner } = store.getState().operationStore;
      const resolved = resolveRemarkApiPartner(
        booking,
        searchPartner || selectedPartner,
      );
      const IdentifyPartner =
        resolved !== "not found"
          ? resolved
          : searchPartner || selectedPartner;

      const resp = await GET_PAYMENT_STATUS(IdentifyPartner, {
        orderId: booking.parentBookingId,
      });
      setPaymentStatusData(resp);
      setShowPaymentStatusBlock(true);
    } catch (error) {
      console.error("Error checking payment status:", error);
      alert("Failed to fetch payment status");
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!booking?.bookingId) {
      alert("Booking ID not found");
      return;
    }

    try {
      setInvoiceLoading(true);

      const { selectedPartner } = store.getState().operationStore;
      const rawPartner =
        searchPartner ||
        booking?.partnerName?.toLowerCase() ||
        selectedPartner;
      const invoicePartner = resolveInvoiceApiPartner(rawPartner);

      const invoiceUrl = await GET_BOOKING_INVOICE_API(invoicePartner, {
        bookingId: booking.bookingId,
        type: "download",
      });

      if (!invoiceUrl) {
        alert("Invoice not available");
        return;
      }

      // Open invoice in new tab
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Invoice download failed:", error);
      alert("Failed to download invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  useEffect(() => {
    if (bookingIdParam) {
      const parts = bookingIdParam.split("-");
      if (parts.length > 1) {
        const id = parts.slice(1).join("-");
        const resolved = resolveRemarkApiPartner({ bookingId: id }, parts[0]);
        const fromUrl = resolved !== "not found" ? resolved : parts[0];
        const p = bookingDetailPartner(
          fromUrl,
          AuthstoreData?.login_username,
          AuthstoreData?.login_partners,
        );
        setSearchPartner(p);
        setSearchInput(id);
        fetchBooking(id, p);
      } else {
        setSearchInput(bookingIdParam);
        fetchBooking(bookingIdParam, displayPartners?.[0] || "mojo");
      }
    }
  }, [bookingIdParam]);

  const handleSearchClick = () => {
    if (searchInput.trim() && searchPartner) {
      fetchBooking(searchInput.trim(), searchPartner);
    } else {
      message.error("Enter booking ID / mobile / email and select a partner");
    }
  };

  const linkedComplaintEmails = useMemo(() => {
    const bookingEmail = String(booking?.email || "").trim().toLowerCase();
    const emails = new Set<string>();
    relatedEmails.forEach((thread) => {
      const sender = String(thread.customerEmail || "").trim().toLowerCase();
      if (sender && sender.includes("@") && sender !== bookingEmail) {
        emails.add(sender);
      }
    });
    return [...emails];
  }, [booking?.email, relatedEmails]);

  const notifyRecipientEmails = useMemo(() => {
    const emails = new Set<string>();
    const bookingEmail = String(booking?.email || "").trim().toLowerCase();
    if (bookingEmail.includes("@")) emails.add(bookingEmail);
    linkedComplaintEmails.forEach((email) => emails.add(email));
    return [...emails];
  }, [booking?.email, linkedComplaintEmails]);

  const handleEscalateIssue = () => {
    if (!booking?.bookingId) return;
    Modal.confirm({
      title: "Escalate this booking as urgent?",
      content:
        "An email will be sent to the configured ops inbox asking them to look into this matter urgently.",
      okText: "Send escalation",
      okButtonProps: { danger: true },
      onOk: async () => {
        setEscalating(true);
        try {
          await escalateBookingIssue({
            bookingId: String(booking.bookingId),
            agent: sessionStorage["userName"] || "CX agent",
            linkedEmails: linkedComplaintEmails,
            booking: {
              parentBookingId: booking.parentBookingId,
              status: booking.status,
              userName: booking.userName,
              mobile: booking.mobile,
              email: booking.email,
              cabPartner: booking.cabPartner,
              sourceName: booking.sourceName,
              destinationName: booking.destinationName,
              pickupTime: booking.pickupTime,
            },
          });
          message.success("Escalation email sent to ops");
        } catch (error) {
          message.error(emailComplaintError(error));
          throw error;
        } finally {
          setEscalating(false);
        }
      },
    });
  };

  const handleNotifyCustomers = () => {
    if (!booking?.bookingId || notifyRecipientEmails.length === 0) {
      message.error("No customer emails available for this booking");
      return;
    }
    const both =
      notifyRecipientEmails.length > 1
        ? `Both ${notifyRecipientEmails.join(" and ")}`
        : notifyRecipientEmails[0];
    Modal.confirm({
      title: "Email customer that we are looking into this?",
      content: `${both} will receive: we are looking into this matter and will call shortly.`,
      okText: "Send email",
      onOk: async () => {
        setNotifying(true);
        try {
          const linkedThread = relatedEmails.find((thread) =>
            notifyRecipientEmails.includes(
              String(thread.customerEmail || "").trim().toLowerCase(),
            ),
          );
          await notifyBookingCustomers({
            bookingId: String(booking.bookingId),
            emails: notifyRecipientEmails,
            draftReply: lookingIntoDraft(booking.bookingId),
            threadId: linkedThread?.id,
          });
          message.success(
            notifyRecipientEmails.length > 1
              ? "Update emailed to booking email and complaint sender"
              : "Update emailed to customer",
          );
        } catch (error) {
          message.error(emailComplaintError(error));
          throw error;
        } finally {
          setNotifying(false);
        }
      },
    });
  };

  const { selectedPartner } = store.getState().operationStore;
  const resolvedPartner = resolveRemarkApiPartner(
    booking || { bookingId: searchInput },
    searchPartner || selectedPartner,
  );
  const partner =
    resolvedPartner !== "not found"
      ? resolvedPartner
      : searchPartner || selectedPartner;
  const activePartnerKey = String(searchPartner || partner || "").toLowerCase();
  const showCloudWatchLogs = isCloudWatchLogsPartner(activePartnerKey);

  useEffect(() => {
    if (!showCloudWatchLogs && activeSection === "cloudwatch") {
      setActiveSection("details");
    }
  }, [showCloudWatchLogs, activeSection]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundTag, setRefundTag] = useState("");
  const [refundRemark, setRefundRemark] = useState("");

  const handleCancel = async (reason: string, refund: boolean) => {
    const cancelstatus = await cancelBookingApi(booking, reason, refund, searchPartner);
    if (cancelstatus === true) {
      setCancelOpen(false);
    }
     if (cancelstatus === true && booking?.bookingId && searchPartner) {
    fetchBooking(booking.bookingId, searchPartner); 
  }
  };

  const handleStatus = async (status: string) => {
    if (status == "LEFT") {
      await update_Driver_left_BookingStatusApi(booking!, status);
    } else if (status == "REACHED") {
      await update_driver_arrived_status(booking!, status);
    } else if (status == "STARTED") {
      await Trip_has_started_status(booking!, status);
    } else if (status == "ENDED") {
      await Trip_has_ended_status(booking!, status);
    }
  };

  const handleRefundSubmit = () => {
    setShowRefundConfirm(true);
  };

  const handleRefundConfirm = async () => {
    let IdentifyPartner = partner;

    let payload: any = {};
    if (IdentifyPartner == "ixigo") {
      payload = {
        partnerBookingId: booking?.parentBookingId,
        raisedBy: sessionStorage["userName"] + "@mojoboxx.com",
        toBeCancelled: false,
        amount: refundAmount,
        remark: refundRemark,
      };
    } else {
      payload = {
        unique_request_id: booking?.bookingId + "-refund",
        amount: Number(refundAmount),
        parentBookingId: booking?.bookingId,
      };
    }

    const resp =
      IdentifyPartner == "ixigo"
        ? await HIT_CANCEL_TRIP_IXIGO(payload)
        : await REFUND_AMOUNT(partner, payload);
    if (resp?.status == "success") {
      // const isSuccess =
      //   resp?.status === "success" ||
      //   resp?.code === 200 ||
      //   resp?.refundStatus === "REFUNDED" ||
      //   resp?.data?.refundStatus === "REFUNDED";
      // if (isSuccess) {
      alert("Refund Initiated Successfully !");
      await RemarkAdd(partner, booking);
      setShowRefundConfirm(false);
      setShowRefundModal(false);
      setRefundAmount("");

      if (booking?.bookingId) {
        fetchBooking(booking.bookingId, partner);
      }
    } else {
      alert("Unable to initiate refund, Something went wrong!");
    }
  };

  const RemarkAdd = async (partner: string, booking: any) => {
    const payload: any = {
      bookingId: booking?.bookingId,
      agentMobile: sessionStorage["userName"] || "Unknown Agent",
      remark: refundRemark,
      tag: refundTag,
    };

    const opsRemarkPayload: any = {
      bookingId: booking?.bookingId,
      remark: refundRemark,
      agentMobile: sessionStorage["userName"] || "Unknown Agent",
      tag: refundTag,
    };
    try {
      await REMARK_ADD_ON_REFUND(partner, payload);
      await INSERT_REMARK(partner, opsRemarkPayload);
      await fetchOpsRemarks(booking?.bookingId, partner);
    } catch (error) {
      console.error("Error saving remarks: ", error);
    }
    setRefundAmount("");
    setRefundTag("");
    setRefundRemark("");
  };

  const formatLocalDateTime = (dt: string | null | undefined): string => {
    if (!dt) return "N/A";
    const cleaned = dt
      .replace(/Z$/, "")
      .replace("T", " ")
      .replace(/\.\d+$/, "");
    const date = new Date(cleaned);
    return isNaN(date.getTime())
      ? dt
      : date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false, // ✅ 24hr format
        });
  };

  const SearchBlock = (
    <div className="bg-white p-3 sm:p-4 mb-3 sm:mb-4 rounded-xl shadow-md border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end max-w-7xl mx-auto">
        <div className="flex flex-col flex-1 min-w-0 sm:min-w-[220px]">
          <label className="text-sm font-semibold text-gray-700 mb-1">
            Booking ID / Mobile / Email
          </label>
          <input
            type="text"
            className="w-full p-2.5 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base sm:text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchClick();
            }}
            placeholder="JCRWE… / 98xxxxxxxx / name@email.com"
            inputMode="search"
            autoCapitalize="characters"
          />
        </div>
        <div className="flex flex-col flex-1 min-w-0 sm:min-w-[180px]">
          <label className="text-sm font-semibold text-gray-700 mb-1">
            Select Partner
          </label>
          <select
            className="w-full p-2.5 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700 text-base sm:text-sm"
            value={searchPartner}
            onChange={(e) => setSearchPartner(e.target.value)}
          >
            <option value="">-- Choose Partner --</option>
            {displayPartners?.map((p: string) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearchClick}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
      {searchHits.length > 0 ? (
        <div className="mt-3 max-w-7xl mx-auto space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {searchHits.length} bookings found — pick one
          </p>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {searchHits.map((hit) => (
              <button
                key={hit.bookingId}
                type="button"
                className="w-full text-left rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => {
                  if (!searchPartner) return;
                  applyFetchedBooking(hit, searchPartner);
                  setSearchInput(String(hit.bookingId || ""));
                  navigate(
                    `/dashboard/customerCare/HandleBooking?bookingId=${searchPartner}-${hit.bookingId}`,
                    { replace: true },
                  );
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 break-all">
                    {hit.bookingId}
                  </span>
                  <span className="text-[11px] rounded-full bg-white border px-2 py-0.5">
                    {String(hit.status || "—").replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-600 break-words">
                  {hit.mobile || "—"} · {hit.email || "—"} · {hit.cabPartner || "—"}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (!booking || Object.keys(booking).length === 0) {
    return (
      <div className="p-2 sm:p-3 mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden">
        {SearchBlock}
        {searchHits.length === 0 ? (
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-lg border border-gray-200 text-center">
            <p className="text-red-500 font-medium">No booking data found.</p>
            <p className="text-xs text-gray-500 mt-2">
              Search with booking ID, mobile number, or email.
            </p>
          </div>
        ) : null}
        {showCloudWatchLogs && directLogsBookingId && (
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-lg border border-gray-200 mt-4 text-left overflow-x-auto">
            <CloudwatchLogs
              bookingId={directLogsBookingId}
              partner={searchPartner || partner}
              directSearch
            />
          </div>
        )}
      </div>
    );
  }

  const paidAmount = Number(booking?.paidAmount || 0);
  const refundedAmount = Number(booking?.paymentDetails?.amount_refunded || 0);
  const isFullyRefunded = paidAmount > 0 && refundedAmount >= paidAmount;
  const partnerVehicleName = getPartnerVehicleName(booking?.partnerResponse);

  return (
    <div className="p-2 sm:p-3 mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden text-[13px] leading-tight">
      {SearchBlock}

      <div className="bg-white p-3 sm:p-5 rounded-xl shadow-lg border border-gray-200 mt-3 sm:mt-4">
        {/* HEADER */}
        <div className="pb-3 border-b border-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0 text-left sm:text-center sm:flex-1">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Booking Overview</h2>
              <div className="space-y-1.5 text-gray-700">
                <div className="flex flex-wrap items-center gap-2 break-all">
                  <b className="shrink-0">Parent ID:</b>
                  <span>{booking?.parentBookingId || "—"}</span>
                  {booking?.parentBookingId ? (
                    <MdContentCopy
                      className="cursor-pointer text-blue-500 hover:text-blue-600 shrink-0"
                      onClick={() => handleCopy(booking?.parentBookingId || "", "parent")}
                      title="Copy Parent ID"
                    />
                  ) : null}
                  {copiedId === "parent" ? (
                    <span className="text-[11px] text-emerald-600 font-semibold">Copied!</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 break-all">
                  <b className="shrink-0">Booking ID:</b>
                  <span className="font-semibold text-slate-900">{booking?.bookingId}</span>
                  {booking?.bookingId ? (
                    <MdContentCopy
                      className="cursor-pointer text-blue-500 hover:text-blue-600 shrink-0"
                      onClick={() => handleCopy(booking?.bookingId || "", "booking")}
                      title="Copy Booking ID"
                    />
                  ) : null}
                  {copiedId === "booking" ? (
                    <span className="text-[11px] text-emerald-600 font-semibold">Copied!</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 break-all">
                  <b className="shrink-0">Cab Partner Booking ID:</b>
                  <span>{"MJB" + booking?.bookingId}</span>
                  {booking?.bookingId ? (
                    <MdContentCopy
                      className="cursor-pointer text-blue-500 hover:text-blue-600 shrink-0"
                      onClick={() => handleCopy("MJB" + (booking?.bookingId || ""), "partner")}
                      title="Copy Cab Partner Booking ID"
                    />
                  ) : null}
                  {copiedId === "partner" ? (
                    <span className="text-[11px] text-emerald-600 font-semibold">Copied!</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-base sm:text-lg">
                Status:{" "}
                <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">
                  {booking?.status?.replace(/_/g, " ")}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[220px]">
              <button
                type="button"
                disabled={escalating}
                onClick={handleEscalateIssue}
                className="w-full px-4 py-2.5 rounded-lg bg-rose-600 text-white font-medium shadow hover:bg-rose-700 disabled:opacity-60"
              >
                {escalating ? "Escalating…" : "Escalate issue (email ops)"}
              </button>
              <button
                type="button"
                disabled={notifying || notifyRecipientEmails.length === 0}
                onClick={handleNotifyCustomers}
                className="w-full px-4 py-2.5 rounded-lg bg-[#2f6cf6] text-white font-medium shadow hover:bg-[#2558d6] disabled:opacity-60"
                title={
                  notifyRecipientEmails.length
                    ? `Send to: ${notifyRecipientEmails.join(", ")}`
                    : "No customer email on booking or linked complaint"
                }
              >
                {notifying
                  ? "Sending…"
                  : linkedComplaintEmails.length > 0
                    ? "Email both (looking into it)"
                    : "Email customer (looking into it)"}
              </button>
              {linkedComplaintEmails.length > 0 ? (
                <p className="text-[11px] leading-4 text-gray-500">
                  Complaint sender differs from booking email — both will be notified.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* SECTION TABS — Booking details, related emails, CloudWatch (partner-gated) */}
        <div className="mt-4 flex flex-nowrap sm:flex-wrap gap-2 border-b pb-2 overflow-x-auto">
          {(
            [
              { key: "details" as const, label: "Booking Details" },
              {
                key: "emails" as const,
                label:
                  relatedEmailsTotal > 0
                    ? `Emails (${relatedEmailsTotal})`
                    : "Emails",
              },
              ...(showCloudWatchLogs
                ? [{ key: "cloudwatch" as const, label: "CloudWatch Logs" }]
                : []),
            ] as Array<{ key: "details" | "emails" | "cloudwatch"; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`shrink-0 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeSection === tab.key
                  ? "bg-[#001b94] text-white shadow-md"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showCloudWatchLogs && activeSection === "cloudwatch" && (
          <CloudwatchLogs
            bookingId={booking?.bookingId}
            partner={searchPartner || partner}
          />
        )}

        {activeSection === "emails" && (
          <div className="mt-4 bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-md text-slate-900">
                  Customer emails
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Matched by booking ID, customer email, or mobile from support
                  inbox. If someone else emailed about this booking, notify both addresses.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                {(booking?.email || booking?.mobile) && (
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-words">
                    {booking?.email ? (
                      <div>
                        <b>Booking email:</b> {booking.email}
                      </div>
                    ) : null}
                    {booking?.mobile ? (
                      <div>
                        <b>Mobile:</b> {booking.mobile}
                      </div>
                    ) : null}
                    {linkedComplaintEmails.length > 0 ? (
                      <div>
                        <b>Complaint sender:</b> {linkedComplaintEmails.join(", ")}
                      </div>
                    ) : null}
                  </div>
                )}
                <button
                  type="button"
                  disabled={notifying || notifyRecipientEmails.length === 0}
                  onClick={handleNotifyCustomers}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg bg-[#2f6cf6] text-white text-sm font-medium disabled:opacity-60"
                >
                  {notifying
                    ? "Sending…"
                    : linkedComplaintEmails.length > 0
                      ? "Email both: looking into it"
                      : "Email customer: looking into it"}
                </button>
              </div>
            </div>
            {relatedEmailsLoading ? (
              <p className="text-sm text-gray-500">Looking up related emails…</p>
            ) : relatedEmailsError ? (
              <p className="text-sm text-rose-600">{relatedEmailsError}</p>
            ) : relatedEmails.length === 0 ? (
              <p className="text-sm text-gray-500">
                No support emails found for this customer yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {relatedEmails.map((thread) => {
                  const open = expandedEmailId === thread.id;
                  const body =
                    thread.messages?.find((m) => m.direction === "inbound")
                      ?.bodyText ||
                    thread.emailPreview ||
                    "";
                  return (
                    <div
                      key={thread.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() =>
                          setExpandedEmailId(open ? null : thread.id)
                        }
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800 truncate">
                              {thread.subject || "No subject"}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {thread.customerEmail || "Unknown sender"}
                              {thread.customerMobile
                                ? ` · ${thread.customerMobile}`
                                : ""}
                              {thread.bookingId ? ` · ${thread.bookingId}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                thread.caseStatus === "resolved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : thread.caseStatus === "working"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {(thread.caseStatus || "pending").toUpperCase()}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {thread.receivedAt
                                ? formatIstDateTime(String(thread.receivedAt))
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </button>
                      {open ? (
                        <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-white bg-white p-3 font-sans text-[13px] leading-5 text-gray-700">
                          {body || "No message body."}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeSection === "details" && (
          <>
        {/* RIDE INFO */}
        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <h3 className="font-semibold mb-2 text-md">🚗 Ride Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-gray-700">
            <p>
              <b>Mobile:</b> {booking?.mobile}
            </p>
            <p className="break-all">
              <b>Email:</b> {booking?.email || "—"}
            </p>
            <p>
              <b>Support emails:</b>{" "}
              {relatedEmailsLoading
                ? "Checking…"
                : relatedEmailsError
                  ? "Lookup failed"
                  : relatedEmailsTotal > 0
                    ? `${relatedEmailsTotal} found`
                    : "None"}
              {relatedEmailsTotal > 0 ? (
                <button
                  type="button"
                  className="ml-2 text-[#001b94] underline text-sm"
                  onClick={() => setActiveSection("emails")}
                >
                  View
                </button>
              ) : null}
            </p>
            <p>
              <b>Ride Type:</b> {booking?.journeyType || "Airport"}
            </p>
            <p>
              <b>Cab Type:</b> {booking?.vehicleType}
              {partnerVehicleName ? ` ${partnerVehicleName}` : ""}
            </p>
            <p>
              <b>Fuel:</b> {booking?.fuelType}
            </p>
            {booking?.journeyType && (
              <p>
                <b>Journey Type:</b> {String(booking.journeyType).toUpperCase()}
              </p>
            )}
            {booking?.payType && (
              <p>
                <b>Pay Type:</b> {String(booking.payType).toUpperCase()}
              </p>
            )}
            {booking?.travelType && (
              <p>
                <b>Travel Type:</b> {String(booking.travelType).toUpperCase()}
              </p>
            )}
            <p>
              <b>Partner:</b> {booking?.cabPartner}
            </p>
            <p>
              <b>Powered By:</b> {booking?.cabPartner}
            </p>
            <p className="break-all">
              <b>Reference Number:</b> {booking?.referenceNumber || "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 bg-violet-50 p-4 rounded-xl border border-violet-200 shadow-sm">
          <h3 className="font-semibold text-md mb-2 text-violet-900">
            📋 Customer ride history (ratings &amp; reviews)
          </h3>
          {customerHistoryLoading ? (
            <p className="text-sm text-gray-500">Loading past rides…</p>
          ) : customerRideHistory.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {customerRideHistory.map((ride) => (
                <div
                  key={ride.bookingId}
                  className="bg-white p-2.5 rounded border border-violet-100 text-[12px]"
                >
                  <div className="flex flex-wrap justify-between gap-2 mb-1">
                    <span className="font-semibold text-violet-800">
                      {ride.bookingId}
                    </span>
                    <span className="text-gray-500">
                      {ride.pickupTime
                        ? formatIstDateTime(String(ride.pickupTime))
                        : "—"}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    <b>Status:</b> {ride.status || "—"} ·{" "}
                    <b>Partner:</b> {ride.cabPartner || "—"}
                  </p>
                  <p className="text-gray-700 mt-1">
                    <b>Rating:</b>{" "}
                    {ride.customerRating ? (
                      ride.customerRating
                    ) : (
                      <i className="text-gray-400">No rating</i>
                    )}
                    {ride.preDefReview ? (
                      <>
                        {" "}
                        · <b>Tag:</b> {ride.preDefReview}
                      </>
                    ) : null}
                  </p>
                  <p className="text-gray-700">
                    <b>Review:</b>{" "}
                    {ride.customerReview ? (
                      ride.customerReview
                    ) : (
                      <i className="text-gray-400">No review</i>
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm">
              No other rides found for this mobile.
            </p>
          )}
        </div>

        <div className="mt-4">
          {/* Buttons Row */}
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 bg-black text-white rounded-lg"
              onClick={() => setShowtrackingUrl((prev) => !prev)}
            >
              {showtrackingUrl ? "Hide tracking" : "Show tracking"}
            </button>

            <button
              className="px-4 py-2 bg-black text-white rounded-lg"
              onClick={() => setShowPartnerResponse((prev) => !prev)}
            >
              {showPartnerResponse ? "Hide JSON" : "Show JSON"}
            </button>
          </div>

          {/* Tracking JSON */}
          {showtrackingUrl && booking?.trackingUrl && (
            // <div className="mt-4 text-black p-4 rounded-lg text-xs overflow-auto font-medium">
            //   <pre>{JSON.stringify(booking.trackingUrl, null, 2)}</pre>
            // </div>
            <div className="mt-4 text-sm">
              {typeof booking.trackingUrl === "string" ? (
                <a
                  href={booking.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline break-all"
                >
                  {booking.trackingUrl}
                </a>
              ) : (
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(booking.trackingUrl, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Partner Response JSON */}
          {showPartnerResponse && booking?.partnerResponse && (
            <div className="mt-4 text-black p-4 rounded-lg text-xs overflow-auto font-medium">
              <pre>{JSON.stringify(booking.partnerResponse, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* DRIVER DETAILS */}
        {(booking.driverMobile || booking.vehicleNumber) && (
          <div className="mt-4 bg-blue-50 p-3 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-md mb-2">🧑 Driver Details</h3>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              {/* Column 1 */}

              <div className="flex flex-col gap-2">
                <p>
                  <b>Name:</b> {booking.driverName || "N/A"}
                </p>
                <p>
                  <b>Mobile:</b> {booking.driverMobile || "N/A"}
                </p>
              </div>

              {/* Column 2 */}
              <div className="flex flex-col gap-2">
                <p>
                  <b>Vehicle:</b> {booking.vehicleType || "N/A"}
                </p>
                <p>
                  <b>Car Number:</b>{" "}
                  <span className="text-red-600 font-bold">
                    {booking.vehicleNumber || "N/A"}
                  </span>
                </p>
              </div>

              {/* Column 3 */}
              <div className="flex flex-col gap-2">
                <p>
                  <b>OTP:</b> {booking?.otp || "N/A"}
                </p>
                <p>
                  <b>Status:</b> Assigned: {booking?.cabAssigned || "0"} | Left:{" "}
                  {booking?.cabLeftForPickup || "0"} | Reached:{" "}
                  {booking?.cabReachedSource || "0"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {/* <div className="mt-6 bg-gray-50 p-5 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-lg mb-3">📅 Trip Timeline</h3>
          <ul className="text-gray-700 space-y-2">
            {booking.driverLocations?.length ? (
              booking.driverLocations.map((step: any, index: number) => (
                <li
                  key={index}
                  className="flex justify-between p-2 rounded bg-white shadow-sm"
                >
                  <span className="font-medium">{step.event}</span>
                  <span>{new Date(step.sync_datetime).toLocaleString()}</span>
                </li>
              ))
            ) : (
              <p>No timeline available.</p>
            )}
          </ul>
        </div> */}

        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-md mb-2">
            📋 Booking Status Timeline
          </h3>
          {statusEventsLoading ? (
            <p className="text-gray-500 text-sm">Loading status timeline...</p>
          ) : statusEvents.length > 0 ? (
            <ul className="text-gray-700 space-y-1">
              {statusEvents.map((event, index) => (
                <li
                  key={`${event.status}-${getStatusEventTime(event)}-${index}`}
                  className="flex justify-between p-2 rounded bg-white shadow-sm"
                >
                  <span className="font-medium">
                    {(event.status || "N/A").replace(/_/g, " ")}
                  </span>
                  <span>{formatIstDateTime(getStatusEventTime(event))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic text-sm">
              No booking status events found.
            </p>
          )}
        </div>
   
        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-md mb-2">📅 Trip Timeline</h3>
          <ul className="text-gray-700 space-y-1">
            {(() => {
              const events: { label: string; datetime: string }[] = [];

              // Driver Assigned from driverDetails
              (booking.driverDetails || []).forEach((d: any) => {
                const datetime = getTrackingEventTime(d);
                if (datetime) {
                  events.push({
                    label: d.is_reassigned
                      ? `Driver Reassigned (${d.chauffeur_name || "N/A"})`
                      : `Driver Assigned (${d.chauffeur_name || "N/A"})`,
                    datetime,
                  });
                }
              });

              // Left for pickup / Arrived from driverLocations
              (booking.driverLocations || []).forEach((d: any) => {
                const datetime = getTrackingEventTime(d);
                if (datetime) {
                  events.push({ label: d.event, datetime });
                }
              });

              // Trip Started / Stopped from startStopDetails
              (booking.startStopDetails || []).forEach((d: any) => {
                const datetime = getTrackingEventTime(d);
                if (datetime) {
                  events.push({
                    label:
                      d.trip_event === "start"
                        ? "Trip Started"
                        : "Trip Stopped",
                    datetime,
                  });
                }
              });

              // Sort all events chronologically
              events.sort(
                (a, b) =>
                  new Date(a.datetime).getTime() -
                  new Date(b.datetime).getTime(),
              );

              return events.length > 0 ? (
                events.map((step, index) => (
                  <li
                    key={index}
                    className="flex justify-between p-2 rounded bg-white shadow-sm"
                  >
                    <span className="font-medium">{step.label}</span>
                    {/* <span>{new Date(step.datetime).toLocaleString()}</span> */}
                    <span>{formatLocalDateTime(step.datetime)}</span>
                  </li>
                ))
              ) : (
                <p>No timeline available.</p>
              );
            })()}
          </ul>
        </div>

        {/* LOCATION */}
        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-md mb-1">📍 Location Details</h3>
          <p className="mb-1">
            <b>Pickup:</b> {booking?.sourceName}
          </p>
          <p className="mb-1">
            <b>Drop:</b> {booking?.destinationName}
          </p>
          {/* <p>
            <b>Booking Time:</b> {booking?.bookingTime ? new Date(booking.bookingTime).toLocaleString() : "N/A"}
          </p>
          <p>
            <b>Pickup Time:</b> {booking?.pickupTime ? new Date(booking.pickupTime).toLocaleString() : "N/A"}
          </p> */}
          <p>
            <b>Booking Time:</b> {formatLocalDateTime(booking?.bookingTime)}
          </p>
          <p>
            <b>Pickup Time:</b> {formatLocalDateTime(booking?.pickupTime)}
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            className="px-4 py-2.5 rounded-lg bg-rose-600 text-white shadow hover:bg-rose-700 disabled:opacity-60"
            disabled={escalating}
            onClick={handleEscalateIssue}
          >
            {escalating ? "Escalating…" : "Escalate issue"}
          </button>
          <button
            className="px-4 py-2.5 rounded-lg bg-yellow-500 text-white shadow hover:bg-yellow-600"
            onClick={() => setAssignOpen(true)}
          >
            Assign Cab Driver
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-blue-500 text-white shadow hover:bg-blue-600"
            onClick={() => handleStatus("LEFT")}
          >
            Left for Pickup
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-green-600 text-white shadow hover:bg-green-700"
            onClick={() => handleStatus("REACHED")}
          >
            Reached
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-purple-600 text-white shadow hover:bg-purple-700"
            onClick={() => handleStatus("STARTED")}
          >
            Start Trip
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-white shadow hover:bg-gray-800"
            onClick={() => handleStatus("ENDED")}
          >
            Stop Trip
          </button>

          {/* {partner != "ixigo" && ( */}
          <button
            className="px-4 py-2 rounded-lg bg-red-600 text-white shadow hover:bg-red-700"
            onClick={() => setCancelOpen(true)}
          >
            Cancel Booking
          </button>
          {/* )} */}

          {booking?.status === "BOOKING_CONFIRMED" &&
            !booking?.cabTripStarted &&
            !booking?.started && (
              <>
                <button
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700"
                  onClick={() => setReassignOpen(true)}
                >
                  Reassign Booking
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700"
                  onClick={() => setRescheduleOpen(true)}
                >
                  Reschedule Booking
                </button>
              </>
            )}
        </div>

        {/* VIEW STATUS SECTION */}
        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <h3 className="text-md mb-2 font-semibold">🔍 View Status Section</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 disabled:opacity-50"
              onClick={handleDownloadInvoice}
              disabled={invoiceLoading}
            >
              {invoiceLoading ? "Opening Invoice..." : "Download Invoice"}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700"
              onClick={() =>
                navigate(
                  `/dashboard/customerCare/CustomBookingReport?id=${booking?.bookingId}&partner=${partner}&table=tracking_cab_location`,
                )
              }
            >
              Track Cab locations
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700"
              onClick={() =>
                navigate(
                  `/dashboard/customerCare/CustomBookingReport?id=${booking?.bookingId}&partner=${partner}&table=tracking_driver_details`,
                )
              }
            >
              Driver assigns
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700"
              onClick={() =>
                navigate(
                  `/dashboard/customerCare/CustomBookingReport?id=${booking?.bookingId}&partner=${partner}&table=tracking_driver_location`,
                )
              }
            >
              Driver left or arrive
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700"
              onClick={() =>
                navigate(
                  `/dashboard/customerCare/CustomBookingReport?id=${booking?.bookingId}&partner=${partner}&table=tracking_start_stop`,
                )
              }
            >
              Start or stop
            </button>
          </div>
        </div>

        {/* FARE DETAILS */}
        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <h3 className="text-md mb-2 font-semibold">💰 Fare Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-1 gap-x-4 text-gray-700">
            <p>
              <b>Total Fare:</b> ₹{booking?.totalFare}
            </p>
            {readBookedAddOns(booking?.extraDetails).services.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-4">
                <p>
                  <b>Fare before add-ons:</b> ₹
                  {readBookedAddOns(booking?.extraDetails).fareBeforeAddOns ?? "—"}
                </p>
                <p className="mt-1">
                  <b>Add-on services:</b>
                </p>
                <ul className="ml-4 list-disc">
                  {readBookedAddOns(booking?.extraDetails).services.map((item) => (
                    <li key={item.name}>
                      {item.name}: ₹{item.amount}
                    </li>
                  ))}
                </ul>
                <p>
                  <b>Add-on total:</b> ₹
                  {readBookedAddOns(booking?.extraDetails).addOnTotal}
                </p>
              </div>
            )}
            <p>
              <b>Payment:</b> {booking?.paymentStatus}
            </p>
            <p>
              <b>Prepaid Amount:</b> ₹{booking?.paidAmount}
            </p>
            <p>
              <b>Remaining Amt:</b> {booking?.remainingAmount}
            </p>
            <p>
              <b>Verification OTP:</b> {booking?.otp}
            </p>
            <p>
              <b>Total Distance:</b> {booking?.kilometer} KM
            </p>
            <p>
              <b>Cancellation Fee:</b> ₹{booking?.cancellationFee}
            </p>
            <p>
              <b>Extra Per Km:</b> ₹{booking?.extraPerKm}
            </p>
              <p>
              <b>Discount Applied :</b> ₹{booking?.discountApplied}
            </p>
            {booking?.extraDetails?.flatFiftyOffApplied === true && (
              <>
                <p>
                  <b> Discount Pct :</b> {booking?.extraDetails?.discountPCT}
                </p>
                <p>
                  <b> Discount Upto :</b> {booking?.extraDetails?.discountUpto}
                </p>
              </>
            )}
            {booking?.extraDetails?.travelVipCapped === true && (
              <>
                <p>
                  <b>Travel VIP Capped:</b>{" "}
                  {booking?.extraDetails?.travelVipCapped ? "Yes" : "No"}
                </p>
                <p>
                  <b>Original Fare :</b> ₹{booking?.extraDetails?.originalFare}
                </p>
                <p>
                  <b>Margin Earned:</b> ₹{booking?.extraDetails?.marginEarned}
                </p>
                <p>
                  <b>Capping Mode:</b> {booking?.extraDetails?.cappingMode}
                </p>
              </>
            )}
            {(booking?.isReassigned === true ||
              booking?.isReassigned === 1) && (
              <>
                <p>
                  <b>Reassigned:</b> Yes
                </p>
                <p>
                  <b>Customer impact:</b> None (company bears partner delta)
                </p>
                <p>
                  <b>Company absorbed:</b>{" "}
                  {booking?.companyAbsorbedAmount != null
                    ? `₹${Number(booking.companyAbsorbedAmount)}`
                    : booking?.extraDetails?.originalFare != null
                      ? `₹${Math.max(
                          0,
                          Number(booking.extraDetails.originalFare) -
                            Number(booking.totalFare || 0),
                        )}`
                      : "N/A"}
                </p>
                <p>
                  <b>Reassigned By:</b> {booking?.reassignedBy || "N/A"}
                </p>
                <p>
                  <b>Reassigned At:</b>{" "}
                  {booking?.reassignedAt
                    ? formatIstDateTime(String(booking.reassignedAt))
                    : "N/A"}
                </p>
                <p>
                  <b>Parent Booking ID:</b> {booking?.parentBookingId || "N/A"}
                </p>
                <p>
                  <b>Reassign Partner Advance:</b>{" "}
                  {booking?.extraDetails?.reassignPartnerAdvance != null
                    ? `₹${Number(booking.extraDetails.reassignPartnerAdvance)}`
                    : "N/A"}
                </p>
                <p>
                  <b>Reassign Margin Retained:</b>{" "}
                  {booking?.extraDetails?.reassignMarginRetained != null
                    ? `₹${Number(booking.extraDetails.reassignMarginRetained)}`
                    : "N/A"}
                </p>
                <p>
                  <b>Partner Advance Amount:</b>{" "}
                  {(booking?.partnerAdvanceAmount ??
                    booking?.advanceAmountPaidToPartner) != null
                    ? `₹${Number(
                        booking?.partnerAdvanceAmount ??
                          booking?.advanceAmountPaidToPartner,
                      )}`
                    : "N/A"}
                </p>
                <p>
                  <b>Parent Fare:</b>{" "}
                  {(booking?.parentFare ??
                    booking?.reschedulePricing?.parentFare) != null
                    ? `₹${Number(
                        booking?.parentFare ??
                          booking?.reschedulePricing?.parentFare,
                      )}`
                    : "N/A"}
                </p>
                <p>
                  <b>Parent Partial Amount:</b>{" "}
                  {(booking?.parentPartialAmount ??
                    booking?.reschedulePricing?.parentPartialAmount) != null
                    ? `₹${Number(
                        booking?.parentPartialAmount ??
                          booking?.reschedulePricing?.parentPartialAmount,
                      )}`
                    : "N/A"}
                </p>
                <p>
                  <b>Fare Difference:</b>{" "}
                  {(booking?.fareDifference ??
                    booking?.reschedulePricing?.fareDifference) != null
                    ? `₹${Number(
                        booking?.fareDifference ??
                          booking?.reschedulePricing?.fareDifference,
                      )}`
                    : "N/A"}
                </p>
                <p>
                  <b>New Partial Amount:</b>{" "}
                  {(booking?.newPartialAmount ??
                    booking?.reschedulePricing?.newPartialAmount) != null
                    ? `₹${Number(
                        booking?.newPartialAmount ??
                          booking?.reschedulePricing?.newPartialAmount,
                      )}`
                    : "N/A"}
                </p>
                <p>
                  <b>New Remaining Amount:</b>{" "}
                  {(booking?.newRemainingAmount ??
                    booking?.reschedulePricing?.newRemainingAmount) != null
                    ? `₹${Number(
                        booking?.newRemainingAmount ??
                          booking?.reschedulePricing?.newRemainingAmount,
                      )}`
                    : "N/A"}
                </p>
              </>
            )}
            {(booking?.isRescheduled === true ||
              booking?.isRescheduled === 1) && (
              <>
                <p>
                  <b>Rescheduled:</b> Yes
                </p>
                <p>
                  <b>Original booking fare:</b>{" "}
                  {booking?.originalBookingFare != null
                    ? `₹${Number(booking.originalBookingFare)}`
                    : booking?.extraDetails?.originalBookingFare != null
                      ? `₹${Number(booking.extraDetails.originalBookingFare)}`
                      : "N/A"}
                </p>
                <p>
                  <b>New invoice:</b> ₹{Number(booking?.totalFare || 0)}
                </p>
                <p>
                  <b>Pay to driver:</b>{" "}
                  {booking?.payToDriver != null
                    ? `₹${Number(booking.payToDriver)}`
                    : booking?.extraDetails?.payToDriver != null
                      ? `₹${Number(booking.extraDetails.payToDriver)}`
                      : "N/A"}
                </p>
                <p>
                  <b>Fare difference:</b>{" "}
                  {booking?.fareDifference != null
                    ? `₹${Number(booking.fareDifference)}`
                    : booking?.extraDetails?.fareDifference != null
                      ? `₹${Number(booking.extraDetails.fareDifference)}`
                      : "N/A"}
                </p>
                <p>
                  <b>Rescheduled at:</b>{" "}
                  {booking?.rescheduledAt
                    ? formatIstDateTime(String(booking.rescheduledAt))
                    : "N/A"}
                </p>
                <p>
                  <b>Rescheduled by:</b> {booking?.rescheduledBy || "N/A"}
                </p>
                <p>
                  <b>Parent Booking ID:</b> {booking?.parentBookingId || "N/A"}
                </p>
              </>
            )}
          </div>

          {/* INCLUSIONS */}
          {booking.inclusion &&
            Array.isArray(booking.inclusion) &&
            booking.inclusion.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-green-700 mb-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">
                    ✓
                  </span>
                  Inclusions
                </h4>
                <ul className="space-y-1.5 ml-1">
                  {/* {booking.inclusion.map((item: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-gray-700 text-sm"
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      {item}
                    </li>
                  ))} */}
                  {booking.inclusion.map((item: string, idx: number) => {
                    const tollCharges = booking?.fareDetails?.tollCharges ?? 0;

                    return (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-gray-700 text-sm"
                      >
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />

                        {item.toLowerCase().includes("toll") ? (
                          <>
                            {item} <b>(₹{tollCharges})</b>
                          </>
                        ) : (
                          item
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          {/* EXCLUSIONS */}
          {booking.exclusion && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs">
                  ✕
                </span>
                Exclusions
              </h4>

              {/* Case 1: exclusion is a string array */}
              {Array.isArray(booking.exclusion) &&
                booking.exclusion.length > 0 && (
                  <ul className="space-y-1.5 ml-1">
                    {booking.exclusion.map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-gray-700 text-sm"
                      >
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

              {/* Case 2: exclusion is an object with waitingCharges / distanceCharges */}
              {!Array.isArray(booking.exclusion) &&
                typeof booking.exclusion === "object" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {booking.exclusion.waitingCharges && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-semibold text-red-800 text-sm mb-1">
                          ⏳ Waiting Charges
                        </p>
                        <p className="text-gray-700 text-sm">
                          Free for first{" "}
                          <b>
                            {booking.exclusion.waitingCharges.inclusionDuration}{" "}
                            mins
                          </b>
                        </p>
                        <p className="text-gray-700 text-sm">
                          Then{" "}
                          <b>
                            ₹
                            {
                              booking.exclusion.waitingCharges
                                .afterwardsChargesPerMin
                            }
                            /min
                          </b>
                        </p>
                      </div>
                    )}
                    {booking.exclusion.distanceCharges && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-semibold text-red-800 text-sm mb-1">
                          📏 Extra Distance Charges
                        </p>
                        <p className="text-gray-700 text-sm">
                          Included:{" "}
                          <b>
                            {
                              booking.exclusion.distanceCharges
                                .inclusionDistance
                            }{" "}
                            Kms
                          </b>
                        </p>
                        <p className="text-gray-700 text-sm">
                          After that:{" "}
                          <b>
                            ₹
                            {
                              booking.exclusion.distanceCharges
                                .afterwardsChargesPerKm
                            }
                            /Km
                          </b>
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* PAYMENT SECTION */}
        <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-300">
          <p className="text-md mb-1">
            💼 <b>Cash – Pay on ride completion</b>
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
              onClick={handleCheckPaymentStatus}
              disabled={checkingPayment}
            >
              {checkingPayment ? "Checking..." : "Check Payment Status"}
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700">
              Send Cashback
            </button>
            {/* {partner != "ixigo" && ( */}
            <button
              className={`px-4 py-2 rounded-lg shadow transition-colors font-medium ${
                isFullyRefunded
                  ? "bg-gray-400 text-white cursor-not-allowed opacity-80"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
              onClick={() => {
                if (!isFullyRefunded) setShowRefundModal(true);
              }}
              disabled={isFullyRefunded}
            >
              {isFullyRefunded ? "Fully Refunded" : "Refund"}
            </button>
          </div>

          {/* PAYMENT STATUS BLOCK (Collapsible, persists until refresh) */}
          {showPaymentStatusBlock &&
            paymentStatusData &&
            (() => {
              const d = paymentStatusData;
              const isCharged = d.status === "CHARGED";
              const statusDescriptions: Record<string, string> = {
                NEW: "Newly created order. This is the status if transaction is not triggered for an order",
                PENDING_VBV: "Authentication is in progress",
                CHARGED: "Successful transaction",
                AUTHENTICATION_FAILED: "User did not complete authentication",
                AUTHORIZATION_FAILED:
                  "User completed authentication, but the bank refused the transaction.",
                JUSPAY_DECLINED:
                  "User input is not accepted by the underlying PG",
                AUTHORIZING: "Transaction status is pending from bank",
                COD_INITIATED: "COD Initiated Successfully",
                STARTED:
                  "Transaction is pending. Juspay system isn't able to find a gateway to process a transaction",
                AUTO_REFUNDED: "Transaction is automatically refunded",
                PARTIAL_CHARGED:
                  "This status occurs when the final charged or debited amount is less than the effective order amount. It typically happens in scenarios involving either the use of products like a merchant's in-house wallet, where users can claim a certain balance from the Merchant's wallet, or in Auth and Capture flow where the total amount captured in the end is lower than the effective order amount",
                AUTHORIZED: "Pre-authorized transaction",
                CAPTURE_INITIATED:
                  "Capture pending for the pre-authorized transaction",
                CAPTURE_FAILED:
                  "Capture failed for the pre-authorized transaction",
                VOIDED: "Void is successful for the pre-authorized transaction",
                VOID_INITIATED:
                  "Void pending for the pre-authorized transaction",
                VOID_FAILED: "Void failed for the pre-authorized transaction",
                NOT_FOUND: "Provided order id is not created at Juspay",
              };

              return (
                <div className="mt-3 bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Header Bar */}
                  <div className="flex justify-between items-center px-4 py-2 bg-indigo-50 border-b border-indigo-200">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-900 text-[13px]">
                        💳 Payment Details
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${isCharged ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}`}
                      >
                        {d.status}
                      </span>
                      {d.refunded && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-300">
                          REFUNDED
                        </span>
                      )}
                      {statusDescriptions[d.status] && (
                        <span className="text-[10px] text-gray-500 font-medium italic hidden sm:inline-block ml-1">
                          - {statusDescriptions[d.status]}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowPaymentStatusBlock(false)}
                      className="text-gray-400 hover:text-red-500 font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Order Info */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="font-semibold text-gray-700 mb-1.5 text-[11px] uppercase tracking-wide">
                        🧾 Order Info
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] text-gray-700">
                        <p>
                          <b>Order ID:</b> {d.order_id}
                        </p>
                        <p>
                          <b>Txn ID:</b> {d.txn_id || d.transactionId}
                        </p>
                        <p>
                          <b>Amount:</b>{" "}
                          <span className="text-green-700 font-bold">
                            ₹{d.amount}
                          </span>
                        </p>
                        <p>
                          <b>Effective Amt:</b> ₹{d.effective_amount}
                        </p>
                        <p>
                          <b>Currency:</b> {d.currency}
                        </p>
                        <p>
                          <b>Merchant:</b> {d.merchant_id}
                        </p>
                        <p>
                          <b>Refunded:</b>{" "}
                          {d.refunded ? `Yes (₹${d.amount_refunded})` : "No"}
                        </p>
                        <p>
                          <b>Max Refundable:</b> ₹
                          {d.maximum_eligible_refund_amount || "N/A"}
                        </p>
                        {/* <p>
                          <b>Created:</b>{" "}
                          {d.date_created
                            ? new Date(d.date_created).toLocaleString()
                            : "N/A"}
                        </p>
                        <p>
                          <b>Last Updated:</b>{" "}
                          {d.last_updated
                            ? new Date(d.last_updated).toLocaleString()
                            : "N/A"}
                        </p> */}
                        <p>
                          <b>Created:</b> {formatLocalDateTime(d.date_created)}
                        </p>
                        <p>
                          <b>Last Updated:</b>{" "}
                          {formatLocalDateTime(d.last_updated)}
                        </p>
                        <p>
                          <b>Method Type:</b> {d.payment_method_type || "N/A"}
                        </p>
                        <p>
                          <b>Auth Type:</b> {d.auth_type || "N/A"}
                        </p>
                        {d.next_action?.length > 0 && (
                          <p className="col-span-2">
                            <b>Next Action:</b> {d.next_action.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    {(d.customer_email || d.customer_phone) && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="font-semibold text-gray-700 mb-1.5 text-[11px] uppercase tracking-wide">
                          👤 Customer
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] text-gray-700">
                          <p>
                            <b>Email:</b> {d.customer_email || "N/A"}
                          </p>
                          <p>
                            <b>Phone:</b> {d.customer_phone || "N/A"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          <div className="mt-4 flex gap-2 flex-wrap">
            <input
              type="number"
              placeholder="Enter amount"
              className="p-2 w-full sm:w-64 border rounded-lg shadow-sm"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Generate Payment Link
            </button>
          </div>
        </div>

        {/* NPS message send ledger from genericSearch (nps_message_sends) */}
        <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex justify-between items-center gap-2 mb-2">
            <h3 className="font-semibold text-md text-emerald-900">
              NPS Message
            </h3>
            {!npsMessageSendsLoading && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  npsMessageSends.length > 0
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-gray-100 text-gray-600 border-gray-300"
                }`}
              >
                {npsMessageSends.length > 0 ? "Message sent" : "Not sent"}
              </span>
            )}
          </div>
          {npsMessageSendsLoading ? (
            <p className="text-gray-500 text-sm">Loading NPS message sends...</p>
          ) : npsMessageSends.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {npsMessageSends.map((item, idx) => (
                <div
                  key={item.id ?? idx}
                  className="bg-white p-2.5 rounded border border-emerald-100 shadow-xs text-[12px]"
                >
                  <div className="flex justify-between items-center mb-1.5 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${npsSendStatusClass(item.status)}`}
                      >
                        {npsSendStatusLabel(item.status)}
                      </span>
                      <span className="text-gray-600">
                        Attempt {item.attempt ?? "—"}
                      </span>
                      {item.template_name && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          {item.template_name}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[10px] whitespace-nowrap">
                      {formatNpsSendTime(item.sent_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
                    <span>
                      <b>Mobile:</b> {item.mobile || "—"}
                    </span>
                    <span>
                      <b>Reminder due:</b>{" "}
                      {formatNpsSendTime(item.reminder_due_at)}
                    </span>
                    <span>
                      <b>Fails:</b> {item.fail_count ?? 0}
                    </span>
                    {item.request_id && (
                      <span className="truncate max-w-full">
                        <b>Request:</b> {item.request_id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No NPS message send found for this booking.
            </p>
          )}
        </div>

        {/* NPS & CX OPS REMARKS BLOCKS */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NPS Block */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
            <h3 className="font-semibold text-md mb-2 text-orange-900">
              ⭐ NPS Feedback
            </h3>
            {npsData.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {npsData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded border border-orange-100 shadow-xs text-[12px]"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.rating === "9-10"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : item.rating === "7-8"
                                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                : "bg-red-100 text-red-700 border-red-300"
                          }`}
                        >
                          Rating: {item.rating}
                        </span>
                        {item.pre_def_review && (
                          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-semibold">
                            {item.pre_def_review}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-[10px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-1">
                      <b>Review:</b>{" "}
                      {item.review || (
                        <i className="text-gray-400">No review</i>
                      )}
                    </p>
                    {item.ops_remark && (
                      <p className="text-gray-600 mb-1">
                        <b>Ops Remark:</b> {item.ops_remark}
                      </p>
                    )}
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 pt-1 border-t border-orange-50">
                      <span>
                        {item.customerName} • {item.mobile}
                      </span>
                      <span>{item.partnerName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                No NPS data found for this booking.
              </p>
            )}
          </div>

          {/* CX Ops Remarks Block */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
            <h3 className="font-semibold text-md mb-2 text-blue-900">
              📝 CX Ops Remarks
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm">Action Taken</span>
                {refundedAmount > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded border border-blue-200">
                    Refunded: ₹{refundedAmount}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {opsRemarks.length > 0 ? (
                  opsRemarks.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded border border-blue-100 shadow-xs text-[12px]"
                    >
                      <div className="flex justify-between font-bold mb-1">
                        <span className="text-blue-700">
                          {item.tag || "N/A"}
                        </span>
                        <span className="text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-1">{item.remark}</p>
                      <div className="text-[10px] text-gray-400 text-right">
                        Added by: {item.agentMobile}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-center py-4 bg-white rounded border border-dashed border-blue-200">
                    No remarks available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        <AssignDriverModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          bookingData={booking}
        />

        <CancelBookingModal
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleCancel}
          bookingId={booking?.bookingId}
          partner={partner}
        />

        {booking && (
          <ReassignBookingModal
            open={reassignOpen}
            onClose={() => setReassignOpen(false)}
            booking={booking}
            partner={searchPartner || partner}
            onSuccess={(newBookingId) => {
              setReassignOpen(false);
              const p = searchPartner || partner;
              setSearchInput(newBookingId);
              navigate(
                `/dashboard/customerCare/HandleBooking?bookingId=${p}-${newBookingId}`
              );
              fetchBooking(newBookingId, p);
            }}
          />
        )}

        {booking && (
          <RescheduleBookingModal
            open={rescheduleOpen}
            onClose={() => setRescheduleOpen(false)}
            booking={booking}
            partner={searchPartner || partner}
            onSuccess={(newBookingId) => {
              setRescheduleOpen(false);
              const p = searchPartner || partner;
              setSearchInput(newBookingId);
              navigate(
                `/dashboard/customerCare/HandleBooking?bookingId=${p}-${newBookingId}`
              );
              fetchBooking(newBookingId, p);
            }}
          />
        )}

        {/* Refund modal - input + Submit */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-semibold text-red-600 mb-3">
                Refund
              </h2>
              <p className="text-gray-600 text-sm mb-3">
                Booking ID: <b>{booking?.bookingId}</b>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Refund amount (₹)
              </label>
              <input
                type="text"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tag
              </label>
              <select
                value={refundTag}
                onChange={(e) => setRefundTag(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              >
                <option value="">Select tag</option>
                <option value="Driver no show">Driver no show</option>
                <option value="Customer no show">Customer no show</option>
                <option value="Complaint">Complaint </option>
                <option value="General inquiry">General inquiry </option>
                <option value="Delay in pickup">Delay in pickup</option>
                <option value="Other">Other</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Remark
              </label>
              <textarea
                value={refundRemark}
                onChange={(e) => setRefundRemark(e.target.value)}
                placeholder="Enter custom remark"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              ></textarea>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundAmount("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  onClick={handleRefundSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund confirm popup */}
        {showRefundConfirm && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60]">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Confirm refund
              </h2>
              <p className="text-gray-600 mb-1">
                Are you sure you want to refund?
              </p>
              {refundAmount && (
                <p className="text-sm font-medium text-gray-700 mb-4">
                  Amount: ₹{refundAmount}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  onClick={() => setShowRefundConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  onClick={handleRefundConfirm}
                >
                  Yes, refund
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandleBooking;
