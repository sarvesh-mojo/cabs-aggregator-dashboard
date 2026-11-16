import { useEffect, useRef, useState } from "react";
import {
  Button,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  Spin,
  message,
  // Radio,
} from "antd";
import {
  formatDateValue,
  formatRemarksDate,
} from "../../config/customerCare/helper";
import { Booking } from "../../config/customerCare/interfaceTypes";
import {
  WhatsAppOutlined,
  PhoneOutlined,
  // MailOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import RideStatus from "../customerCare/RideStatus";
import {
  GET_REMARKS,
  INSERT_REMARK,
  // TRIGGER_MESSAGE_TO_SPOC,
  //  CUSTOM_GENERIC_CREATE,
  //  CUSTOM_GENERIC_UPDATE ,
} from "../../config/customerCare/operationsApicall";
import { fetchSupportLogsForBooking } from "../../utils/customerSupportLogs";
import {
  readRemarkCacheFromSession,
  writeRemarkCacheToSession,
} from "../../utils/bookingOpsRemarks";
// TOP pe existing imports ke saath ye add karo
import { AssignmentCell } from "../tables/AssignmentCell";

const { TextArea } = Input;

const getLogPreview = (log: any) => {
  const text =
    log?.complaints || log?.inquiry || log?.resolution || log?.finalReport || "";
  const trimmed = String(text).trim();
  return trimmed && trimmed !== "NA" ? trimmed : "Customer log recorded";
};

const pickBookingLogs = (
  map: Record<string, any[]>,
  bookingId?: string | number,
) => {
  const raw = String(bookingId ?? "");
  return (
    map[raw] ||
    map[raw.startsWith("MJB") ? raw.slice(3) : `MJB${raw}`] ||
    []
  );
};

export type CachedBookingRemark = {
  remark: string;
  createdAt: string;
  count: number;
};

export const normalizeBookingRemarkKey = (bookingId?: string | number) =>
  String(bookingId ?? "").trim();

export const bookingRemarkKeys = (bookingId?: string | number): string[] => {
  const raw = normalizeBookingRemarkKey(bookingId);
  if (!raw) return [];
  if (raw.startsWith("MJB")) return [raw, raw.slice(3)];
  return [raw, `MJB${raw}`];
};

export const matchesBookingRemarkId = (
  booking: { bookingId?: string | number },
  targetId: string,
): boolean => {
  const target = normalizeBookingRemarkKey(targetId);
  return bookingRemarkKeys(booking.bookingId).includes(target);
};
export const mergeCachedBookingRemark = <T extends Booking>(
  booking: T,
  cache: Record<string, CachedBookingRemark>,
): T => {
  const keys = bookingRemarkKeys(booking.bookingId);
  const cached = keys.map((key) => cache[key]).find(Boolean);
  if (!cached) return booking;

  return {
    ...booking,
    opsRemarks: cached.remark,
    opsRemarkCreatedAt: cached.createdAt,
    remarkCount: Math.max(Number(booking.remarkCount) || 0, cached.count),
  };
};

const latestRemarkFetchCache = new Map<string, CachedBookingRemark>();

interface RemarksCellProps {
  booking: Booking;
  onCreateLog?: (booking: Booking) => void;
  onRemarkSuccess?: (
    bookingId: string,
    data: { remark: string; tag: string; createdAt: string },
  ) => void;
  supportLogs?: any[];
  tabPartner?: string | null;
}

export const RemarksCell = ({
  booking,
  onCreateLog,
  onRemarkSuccess,
  supportLogs = [],
  tabPartner,
}: RemarksCellProps) => {
  // const [messageApi, contextHolder] = message.useMessage();
  const [messageApi] = message.useMessage();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isViewLogsVisible, setIsViewLogsVisible] = useState(false);
  const [loadedLogs, setLoadedLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [form] = Form.useForm();
  const logsFetchInFlight = useRef(false);

  const displayLogs = loadedLogs.length ? loadedLogs : supportLogs;
  const latestLog = displayLogs[0];
  const hasLogs = displayLogs.length > 0;

  const [inlineRemark, setInlineRemark] = useState<{
    text: string;
    createdAt: string;
    count: number;
  } | null>(null);

  const seedRemarkCache = (text: string, createdAt: string, count: number) => {
    const entry: CachedBookingRemark = { remark: text, createdAt, count };
    bookingRemarkKeys(booking.bookingId).forEach((key) => {
      latestRemarkFetchCache.set(key, entry);
    });
    const sessionCache = readRemarkCacheFromSession();
    bookingRemarkKeys(booking.bookingId).forEach((key) => {
      sessionCache[key] = entry;
    });
    writeRemarkCacheToSession(sessionCache);
  };

  const displayRemark =
    inlineRemark?.text ??
    booking?.opsRemarks ??
    (booking as any)?.ops_remarks ??
    "";
  const displayRemarkAt =
    inlineRemark?.createdAt ??
    booking?.opsRemarkCreatedAt ??
    (booking as any)?.ops_remark_created_at ??
    "";
  const displayRemarkCount =
    inlineRemark?.count ??
    (typeof booking?.remarkCount === "number" ? booking.remarkCount : 0);

  const hasRemark = Boolean(displayRemark) || displayRemarkCount > 0;

  useEffect(() => {
    const remarkFromBooking =
      booking?.opsRemarks ?? (booking as any)?.ops_remarks ?? "";
    const createdAtFromBooking =
      booking?.opsRemarkCreatedAt ??
      (booking as any)?.ops_remark_created_at ??
      "";
    const countFromBooking = Number(booking?.remarkCount ?? 0);

    if (remarkFromBooking) {
      setInlineRemark((prev) => ({
        text: remarkFromBooking,
        createdAt: createdAtFromBooking || prev?.createdAt || "",
        count: countFromBooking || prev?.count || 1,
      }));
      seedRemarkCache(
        remarkFromBooking,
        createdAtFromBooking || "",
        countFromBooking || 1,
      );
      return;
    }

    const sessionCached = bookingRemarkKeys(booking.bookingId)
      .map((key) => readRemarkCacheFromSession()[key])
      .find(Boolean);
    if (sessionCached?.remark) {
      setInlineRemark({
        text: sessionCached.remark,
        createdAt: sessionCached.createdAt,
        count: sessionCached.count,
      });
      return;
    }

    if (countFromBooking === 0) {
      setInlineRemark(null);
    }
  }, [
    booking.bookingId,
    booking.opsRemarks,
    booking.opsRemarkCreatedAt,
    booking.remarkCount,
  ]);

  const handleOpenAdd = () => {
    setIsAddModalVisible(true);
  };

  const handleCloseAdd = () => {
    setIsAddModalVisible(false);
    form.resetFields();
  };

  const handleOpenViewLogs = () => {
    setIsViewLogsVisible(true);
  };

  const handleCloseViewLogs = () => {
    setIsViewLogsVisible(false);
    setLoadedLogs([]);
  };

  useEffect(() => {
    if (!isViewLogsVisible) return;

    // Table load already hydrated logs — no duplicate genericSearch on modal open
    if (supportLogs.length > 0) {
      setLoadedLogs(supportLogs);
      return;
    }

    if (logsFetchInFlight.current) return;

    let cancelled = false;
    logsFetchInFlight.current = true;
    setLoadingLogs(true);

    fetchSupportLogsForBooking(
      booking,
      (b) => b?.partnerName?.toLowerCase() || "mojo",
    )
      .then((rows) => {
        if (!cancelled) setLoadedLogs(rows);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          messageApi.open({ type: "error", content: "Failed to load logs" });
        }
      })
      .finally(() => {
        logsFetchInFlight.current = false;
        if (!cancelled) setLoadingLogs(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewLogsVisible, booking.bookingId, supportLogs.length]);

  const handleOpenView = () => {
    setIsViewModalVisible(true);
  };

  const handleCloseView = () => {
    setIsViewModalVisible(false);
  };

  const loadRemarks = async () => {
    setLoadingRemarks(true);
    const BookingPartner = resolveRemarkApiPartner(booking, tabPartner);

    if (BookingPartner === "not found") {
      alert("Unable to find Booking partner!");
    }

    try {
      const data = await GET_REMARKS(BookingPartner, {
        bookingId: booking.bookingId,
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.remarks)
          ? data.remarks
          : [];
      setRemarks(list);
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: "Failed to load remarks",
      });
    } finally {
      setLoadingRemarks(false);
    }
  };

  useEffect(() => {
    if (isViewModalVisible) {
      loadRemarks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewModalVisible]);

  const handleSubmitRemark = async (values: any) => {
    const template = values?.remarkTemplate;
    const custom = values?.customRemark?.trim();

    if (!custom && !template) {
      messageApi.open({
        type: "warning",
        content: "Please select or enter a remark",
      });
      return;
    }

    const payload = {
      bookingId: booking.bookingId,
      agentMobile: sessionStorage["userName"] || "Unknown Agent",
      remark: custom || "Not Entered",
      tag: template || "Not selected",
    };

    setSubmitting(true);
    const BookingPartner = resolveRemarkApiPartner(booking, tabPartner);

    if (BookingPartner === "not found") {
      alert("Unable to find Booking partner!");
    }

    try {
      await INSERT_REMARK(BookingPartner, payload);
      const createdAt = new Date().toISOString();
      const nextCount = displayRemarkCount + 1;

      setInlineRemark({
        text: payload.remark,
        createdAt,
        count: nextCount,
      });
      seedRemarkCache(payload.remark, createdAt, nextCount);
      onRemarkSuccess?.(String(booking.bookingId), {
        remark: payload.remark,
        tag: payload.tag,
        createdAt,
      });

      messageApi.open({
        type: "success",
        content: "Remark added successfully",
      });
      handleCloseAdd();
      if (isViewModalVisible) {
        loadRemarks();
      }
    } catch (error) {
      console.error(error);
      messageApi.open({
        type: "error",
        content: "Failed to add remark",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const createLogBtn = onCreateLog ? (
    <button
      onClick={() => onCreateLog(booking)}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        color: "#7c3aed",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        alignItems: "center",
        gap: 4,
      }}
    >
      Insert Log
      {hasLogs ? (
        <span
          style={{
            background: "#7c3aed",
            color: "#fff",
            borderRadius: 10,
            padding: "0px 5px",
            fontSize: 10,
          }}
        >
          {displayLogs.length}
        </span>
      ) : null}
    </button>
  ) : null;

  return (
    <>
      {/* {contextHolder} */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 160,
        }}
      >
        {/* Remarks text */}
        {displayRemark && (
          <Tooltip title={displayRemark}>
            <div
              onClick={handleOpenView}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#1f2937",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "4px 8px",
                cursor: "pointer",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                maxWidth: 160,
                lineHeight: "1.4",
              }}
            >
              {displayRemark}
            </div>
          </Tooltip>
        )}

        {/* Date + Count */}
        {displayRemarkAt && (
          <div style={{ fontSize: 10, color: "#9ca3af" }}>
            🕐 {formatRemarksDate(displayRemarkAt)}
          </div>
        )}
        {displayRemarkCount > 0 && (
          <div style={{ fontSize: 10, color: "#6b7280" }}>
            💬 {displayRemarkCount} remark{displayRemarkCount > 1 ? "s" : ""}
          </div>
        )}

        {hasLogs && latestLog && (
          <>
            <Tooltip title={getLogPreview(latestLog)}>
              <div
                onClick={handleOpenViewLogs}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#5b21b6",
                  background: "#f5f3ff",
                  border: "1px solid #ddd6fe",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  maxWidth: 160,
                  lineHeight: "1.4",
                }}
              >
                {getLogPreview(latestLog)}
              </div>
            </Tooltip>
            {latestLog.createdAt && (
              <div style={{ fontSize: 10, color: "#9ca3af" }}>
                🕐 {formatRemarksDate(latestLog.createdAt)}
              </div>
            )}
            <div style={{ fontSize: 10, color: "#6b7280" }}>
              📋 {displayLogs.length} log{displayLogs.length > 1 ? "s" : ""}
              {latestLog.agentName ? ` · ${latestLog.agentName}` : ""}
            </div>
          </>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            marginTop: 2,
          }}
        >
          {hasRemark ? (
            <>
              <Button
                type="link"
                size="small"
                style={{
                  padding: 0,
                  fontSize: 11,
                  height: 18,
                  textAlign: "left",
                }}
                onClick={handleOpenView}
              >
                View all
              </Button>
              <Button
                type="link"
                size="small"
                style={{
                  padding: 0,
                  fontSize: 11,
                  height: 18,
                  textAlign: "left",
                }}
                onClick={handleOpenAdd}
              >
                Add remark
              </Button>
            </>
          ) : (
            <Button
              type="link"
              size="small"
              style={{
                padding: 0,
                fontSize: 11,
                height: 18,
                textAlign: "left",
              }}
              onClick={handleOpenAdd}
            >
              Insert remark
            </Button>
          )}
          {hasLogs ? (
            <Button
              type="link"
              size="small"
              style={{
                padding: 0,
                fontSize: 11,
                height: 18,
                textAlign: "left",
                color: "#7c3aed",
              }}
              onClick={handleOpenViewLogs}
            >
              View all logs
            </Button>
          ) : null}
          {createLogBtn}
        </div>
      </div>

      <Modal
        title="Add Remark"
        open={isAddModalVisible}
        onCancel={handleCloseAdd}
        onOk={() => form.submit()}
        okText="Submit"
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitRemark}>
          <Form.Item name="remarkTemplate" label="Quick remark">
            <Select
              allowClear
              placeholder="Select a remark"
              options={[
                { label: "Driver no show", value: "Driver no show" },
                { label: "Customer no show", value: "Customer no show" },
                { label: "Complaint", value: "Complaint" },
                { label: "General inquiry", value: "General inquiry" },
                { label: "Delay in pickup", value: "Delay in pickup" },
                { label: "Vip", value: "Vip" },

                { label: "Other", value: "Other" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="customRemark"
            label="Remark"
            extra="You can edit or override the quick remark here."
          >
            <TextArea rows={3} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="All Remarks"
        open={isViewModalVisible}
        onCancel={handleCloseView}
        footer={null}
        width={480}
      >
        {loadingRemarks ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : remarks && remarks.length > 0 ? (
          <div className="max-h-64 overflow-y-auto">
            {remarks.map((item: any, index: number) => (
              <div
                key={index}
                className="border-b border-gray-200 py-2 text-[11px]"
              >
                <div className="font-medium break-words">
                  {item.opsRemarks || item.remark || "-"}
                </div>
                {(item.opsRemarkCreatedAt || item.createdAt) && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    {/* {formatDateValue(item.opsRemarkCreatedAt || item.createdAt)} */}
                    {formatRemarksDate(
                      item.opsRemarkCreatedAt || item.createdAt,
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-[11px] text-gray-500">
            No remarks found for this booking.
          </div>
        )}
      </Modal>

      <Modal
        title="Customer Logs"
        open={isViewLogsVisible}
        onCancel={handleCloseViewLogs}
        footer={null}
        width={480}
      >
        {loadingLogs ? (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        ) : displayLogs.length > 0 ? (
          <div className="max-h-64 overflow-y-auto">
            {displayLogs.map((item: any, index: number) => (
              <div
                key={item.id || index}
                className="border-b border-gray-200 py-2 text-[11px]"
              >
                <div className="font-medium break-words text-[#5b21b6]">
                  {getLogPreview(item)}
                </div>
                {item.agentName && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    Agent: {item.agentName}
                  </div>
                )}
                {item.createdAt && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    {formatRemarksDate(item.createdAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-[11px] text-gray-500">
            No logs found for this booking.
          </div>
        )}
      </Modal>
    </>
  );
};

const whatsappGroups: Record<
  string,
  {
    name: string;
    link: string;
  }
> = {
  refex: {
    name: "Refex",
    link: "https://chat.whatsapp.com/CwG0npg1742DXP2vx4U7VY",
  },

  bluecabs: {
    name: "Bluecabs",
    link: "https://chat.whatsapp.com/KpyY4p6HdW26iDJKFbU7bE",
  },

  betmobility: {
    name: "BetMobility",
    link: "https://chat.whatsapp.com/CL3J3sRWpFlJeNECUzS0Az",
  },

  shoffr: {
    name: "shoffr",
    link: "https://chat.whatsapp.com/IpWCnbuiQHCL26gbEQmzuW",
  },
};

const TriggerCell = ({ booking }: { booking: Booking }) => {
  // const [messageApi, contextHolder] = message.useMessage();
  // const [confirmType, setConfirmType] = useState<"whatsapp" | "email" | null>(
  //   null,
  // );
  // const [loading, setLoading] = useState(false);
  // const [, contextHolder] = message.useMessage();
  // // const [loading] = useState(false);
  // const [whatsappMessageType, setWhatsappMessageType] = useState<string>(
  //   "driver_assign_on_time",
  // );
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);

  const partnerKey = booking?.cabPartner?.trim().toLowerCase() || "";

  const currentGroup = whatsappGroups[partnerKey];

  // const handleTrigger = async () => {
  //   if (!confirmType) return;

  //   const payload: any = {
  //     bookingId: booking.bookingId,
  //     type: confirmType,
  //     cabPartner: booking.cabPartner || "SIGNATURE",
  //   };
  //   if (confirmType === "whatsapp") {
  //     payload.buttonStatus = whatsappMessageType;
  //   }

  //   const partner = booking?.partnerName?.toLowerCase() || "mojo";

  //   setLoading(true);
  //   try {
  //     await TRIGGER_MESSAGE_TO_SPOC(partner, payload);
  //     messageApi.open({
  //       type: "success",
  //       content: `${confirmType} trigger sent successfully`,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     messageApi.open({
  //       type: "error",
  //       content: `Failed to send ${confirmType} trigger`,
  //     });
  //   } finally {
  //     setLoading(false);
  //     setConfirmType(null);
  //     setWhatsappMessageType("driver_assign_on_time");
  //   }
  // };

  return (
    <>
      {/* {contextHolder} */}
      <div className="flex gap-2">
        <Button
          type="link"
          title="send whatsapp"
          style={{ padding: 0 }}
          // onClick={() => setConfirmType("whatsapp")}
          onClick={() => setIsWhatsappModalOpen(true)}
        >
          <WhatsAppOutlined style={{ fontSize: "16px", color: "#25D366" }} />
        </Button>
        <Tooltip title="Call feature coming soon">
        <Button
          type="link"
          // title="Make a call"
          title="Call feature coming soon"
          style={{ padding: 0 }}
          // onClick={() => window.open(`tel:${booking?.mobile}`)}
        >
          {/* <PhoneOutlined style={{ fontSize: "16px", color: "#1E90FF" }} /> */}
          <PhoneOutlined style={{ fontSize: "16px",  color: "#bfbfbf", opacity: 0.5, filter: "grayscale(100%)", cursor: "not-allowed",  }} />
        </Button>
        </Tooltip>
        {/* <Button
          type="link"
          title="send email"
          style={{ padding: 0 }}
          // onClick={() => setConfirmType("email")}
        >
          <MailOutlined style={{ fontSize: "16px", color: "#d9534f" }} />
        </Button> */}
      </div>

      {/* <Modal
        title="Confirm Trigger"
        open={!!confirmType}
        // open={confirmType === "email"}
        onCancel={() => {
          setConfirmType(null);
          setWhatsappMessageType("driver_assign_on_time");
        }}
        onOk={handleTrigger}
        // onOk={() => setConfirmType(null)}
        okText="OK"
        cancelText="Cancel"
        confirmLoading={loading}
      >
        <p>
          Are you sure you want to send <b>{confirmType}</b> for booking{" "}
          <b>{booking.bookingId}</b>?
        </p>

        {confirmType === "whatsapp" && (
          <div className="mt-4">
            <p className="mb-2">Which message do you want to send?</p>
            <Radio.Group
              onChange={(e) => setWhatsappMessageType(e.target.value)}
              value={whatsappMessageType}
              className="flex flex-col gap-2"
            >
              <Radio value="driver_assign_on_time">Driver assign on time</Radio>
              <Radio value="driver_assign_delayed">Driver assign delayed</Radio>
            </Radio.Group>
          </div>
        )}
      </Modal> */}
      <Modal
        title="WhatsApp Groups"
        open={isWhatsappModalOpen}
        footer={null}
        onCancel={() => setIsWhatsappModalOpen(false)}
      >
        {/* <div className="flex flex-col gap-3">
    {whatsappGroups.map((group, index) => (
      <Button
        key={index}
        block
        type="default"
        icon={<WhatsAppOutlined style={{ color: "#25D366" }} />}
        onClick={() => window.open(group.link, "_blank")}
      >
        {group.name}
      </Button>
    ))}
  </div> */}
        <div className="flex flex-col gap-3">
          {currentGroup ? (
            <Button
              block
              icon={<WhatsAppOutlined style={{ color: "#25D366" }} />}
              onClick={() => window.open(currentGroup.link, "_blank")}
            >
              {currentGroup.name}
            </Button>
          ) : (
            <div style={{ textAlign: "center" }}>
              No WhatsApp group configured for this partner.
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

const SWIGGY_OPS_CREATED_BY = "swiggy-ops";

export const getBookingCreatedBy = (record: any): string => {
  const value = record?.createdBy ?? record?.created_by;
  if (value == null || value === "") return "";
  const normalized = String(value).trim().toLowerCase();
  return normalized === SWIGGY_OPS_CREATED_BY ? SWIGGY_OPS_CREATED_BY : "";
};

const mapPartnerWatermarkLabel = (partnerKey: string): string => {
  const raw = partnerKey.trim().toUpperCase();
  if (!raw) return "OTHER";
  if (raw === "YATRA") return "BAC";
  return raw;
};

const normalizeBookingIdForWatermark = (record: any): string => {
  const raw = String(record?.bookingId ?? "").trim().toUpperCase();
  if (!raw) return "";
  return raw.startsWith("MJB") ? raw : `MJB${raw}`;
};

/** FE only: BAC/Yatra + Railyatri — Indigo/Ixigo stay on BE partnerName. */
const getWatermarkFromBookingId = (bookingId: string): string | null => {
  if (!bookingId) return null;
  if (bookingId.startsWith("MJBSTP")) return "RAILYATRI";
  if (bookingId.startsWith("MJBYTRA")) return "BAC";
  return null;
};

/** Customer column watermark — bookingId prefix first, then BE partnerName. */
export const getCustomerWatermarkSource = (
  record: any,
  activePartner?: string | null,
): string => {
  const fromBookingId = getWatermarkFromBookingId(
    normalizeBookingIdForWatermark(record),
  );
  if (fromBookingId) return fromBookingId;

  const fromRecord = String(record?.partnerName ?? "").trim();
  if (fromRecord) {
    return mapPartnerWatermarkLabel(fromRecord);
  }

  const fallback = String(activePartner ?? "").trim();
  if (fallback) {
    return mapPartnerWatermarkLabel(fallback);
  }

  return "OTHER";
};

/** Ops remark API host — Railyatri bookings must not use partnerName `yatra`. */
export const resolveRemarkApiPartner = (
  record: any,
  tabPartner?: string | null,
): string => {
  if (normalizeBookingIdForWatermark(record).startsWith("MJBSTP")) {
    return "railyatri";
  }

  const raw = String(record?.partnerName ?? "").trim().toLowerCase();
  if (raw) return raw;

  const tab = String(tabPartner ?? "").trim().toLowerCase();
  if (tab && tab !== "all") return tab;

  return "not found";
};

export const normalizeBookingRecords = <T extends Record<string, any>>(
  bookings: T[] = [],
): T[] =>
  bookings.map((booking) => {
    const createdBy = getBookingCreatedBy(booking);
    return createdBy ? { ...booking, createdBy } : booking;
  });

const CopyHelper = ({ text }: { text: any }) => {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text.toString());
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 5000);
  };

  return (
    <div className="items-center gap-2 flex mt-0.5">
      <span>{text}</span>
      <Tooltip title={copied ? "Copied" : "Copy"}>
        <CopyOutlined
          onClick={handleCopy}
          style={{
            cursor: "pointer",
            color: copied ? "green" : "#1890ff",
            fontSize: "13px",
          }}
        />
      </Tooltip>
    </div>
  );
};

const formatTripMetaValue = (value?: string | null): string | null => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.toUpperCase() : null;
};

/** Journey / Pay type / Payment mode — shown on booking list cards when API sends them. */
const BookingTripMetaFields = ({ record }: { record: Booking }) => {
  const journeyType = formatTripMetaValue(record?.journeyType);
  const payType = formatTripMetaValue(record?.payType);
  const paymentMode = formatTripMetaValue(record?.paymentMode);

  if (!journeyType && !payType && !paymentMode) return null;

  return (
    <div
      className="mt-2"
      style={{ fontSize: "10px", lineHeight: "1.5", color: "#555" }}
    >
      {journeyType && (
        <div>
          <b>Journey Type:</b> {journeyType}
        </div>
      )}
      {payType && (
        <div>
          <b>Pay Type:</b> {payType}
        </div>
      )}
      {paymentMode && (
        <div>
          <b>Payment Mode:</b> {paymentMode}
        </div>
      )}
    </div>
  );
};

function cxMoney(value: unknown): string {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return String(Math.round(n * 100) / 100);
}

function ibcLine(record: Booking, keys: string[], fallback: unknown): string {
  const items = (record as Booking & { ibcFareDisplay?: { key?: string; value?: unknown }[] })
    .ibcFareDisplay;
  const fromDisplay = Array.isArray(items)
    ? items.find((item) => item?.key && keys.includes(item.key))?.value
    : undefined;
  const value = fromDisplay ?? fallback;
  return value == null || value === "" ? "-" : String(value);
}

const PaymentBreakupCell = ({ record }: { record: Booking }) => {
  const mode = String(record.paymentMode || record.payType || "").trim();
  const upper = mode.toUpperCase();
  const partial = upper.includes("PARTIAL") || String(record.payType || "").toUpperCase() === "PARTIAL";
  const ibc = upper.includes("IBC");
  const label = ibc ? "IBC" : partial ? "Partial" : mode || "Full";

  return (
    <div style={{ fontSize: "11px", lineHeight: 1.5, minWidth: 140 }}>
      <div>
        <b>Mode:</b> {label}
      </div>
      <div>
        <b>Total fare:</b> {cxMoney(record.totalFare)}
      </div>
      <div>
        <b>Paid:</b> {cxMoney(record.paidAmount)}
      </div>
      {partial && (
        <div>
          <b>Remaining:</b> {cxMoney(record.remainingAmount)}
        </div>
      )}
      {ibc && (
        <>
          <div>
            <b>BluChips redeemed:</b>{" "}
            {ibcLine(
              record,
              ["total_ibc_redeemed"],
              (record as Booking & { totalIbcRedeemed?: unknown }).totalIbcRedeemed,
            )}
          </div>
          <div>
            <b>Redemption fee:</b>{" "}
            {ibcLine(
              record,
              ["redemption_fee", "redemptoon_fee"],
              (record as Booking & { ibcRedemptionFee?: unknown; redemptionFees?: unknown })
                .ibcRedemptionFee ??
                (record as Booking & { redemptionFees?: unknown }).redemptionFees,
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const DatatableColumns = (
  propsData: any,
  handleViewDetails: (record: Booking) => void,
  handleShowJSON: (record: Booking) => void,
  handleUpdate: (record: Booking) => void,
  onCreateLog?: (record: Booking) => void,
  bookingLogs?: Record<string, any[]>,

  // add new two params :
  assignments?: Record<string, any>,
  onAssigned?: (bookingId: string, record: any) => void,
  onCompleted?: (bookingId: string) => void,
  onRemarkSuccess?: (
    bookingId: string,
    data: { remark: string; tag: string; createdAt: string },
  ) => void,
) => {
  const columns: any[] = [
    {
      title: "Customer",
      key: "customer",
      // render: (_: any, record: Booking) => {
      render: (_: any, record: any) => {
        let npsIcon = null;
        let npsTooltip = "";
        const ratingStr = record?.customerRating;
        const reviewCount = Number(record?.reviewCount || 0);
        // const source = record?.partnerName?.toUpperCase() || "Other";

        const source = getCustomerWatermarkSource(
          record,
          propsData?.activePartner,
        );
        const createdBy = getBookingCreatedBy(record);

        // customer tag indicator by nps rating
        if (reviewCount === 0) {
          npsIcon = "🆕";
          npsTooltip = "First-time user";
        } else {
          const ratingValue = ratingStr
            ? parseInt(ratingStr.split("-")[0])
            : null;
          const reviewTags = record?.customerReview || "No comments";
          const preDef =
            record?.preDefReview || record?.pre_def_review || "";
          const tagSuffix = preDef ? ` | Tag: ${preDef}` : "";

          if (ratingValue === null || isNaN(ratingValue)) {
            npsIcon = "🔁";
            npsTooltip = `Repeat user - No numeric rating found${tagSuffix}`;
          } else if (ratingValue <= 6) {
            npsIcon = "🚨";
            npsTooltip = `Detractor (Rating: ${ratingStr}) | Issues: ${reviewTags}${tagSuffix}`;
          } else if (ratingValue <= 8) {
            npsIcon = "🟠";
            npsTooltip = `Passive (Rating: ${ratingStr}) | Issues: ${reviewTags}${tagSuffix}`;
          } else {
            npsIcon = "⭐";
            npsTooltip = `Promoter (Rating: ${ratingStr}) | Tags: ${reviewTags}${tagSuffix}`;
          }
        }

        //   return (
        //     <>
        //       <div
        //         style={{ fontSize: "13px", lineHeight: "1.4" }}
        //         className="w-[180px]"
        //       >
        //         <div style={{ fontWeight: 500 }}>{record?.userName}</div>
        //         <div>
        //           <CopyHelper text={record?.mobile} />
        //         </div>
        //         <div style={{ color: "#666" }}>{record?.email}</div>
        //         <div className="relative">
        //           {source && (
        //             <span
        //               style={{ marginTop: "28px", marginLeft: "-115px" }}
        //               className={`absolute inset-0 flex items-center justify-center b-0
        //           text-[15px] font-bold opacity-30 select-none
        //           ${source === "INDIGO" ? "text-indigo-700" : "text-orange-500"}`}
        //             >
        //               {source}
        //             </span>
        //           )}

        //           <div style={{ color: "#666" }}>
        //             <CopyHelper text={record?.bookingId} />
        //           </div>
        //         </div>
        //       </div>
        //     </>
        //   );
        // },

        return (
          <div
            style={{ fontSize: "13px", lineHeight: "1.4" }}
            className="w-[210px]"
          >
            {/* Name + NPS Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 500 }}>{record?.userName || "-"}</span>
              {npsIcon && (
                <Tooltip title={npsTooltip}>
                  <span style={{ cursor: "pointer", fontSize: "15px" }}>
                    {npsIcon}
                  </span>
                </Tooltip>
              )}
            </div>

            {/* Mobile Number with Copy Helper */}
            <div>
              <CopyHelper text={record?.mobile} />
            </div>

            {/* Email */}
            <div style={{ color: "#666" }}>{record?.email}</div>

            {/* Booking ID with Copy Helper & Source Watermark */}
            <div className="relative">
              {source && (
                <span
                  style={{ marginTop: "28px", marginLeft: "-115px" }}
                  className={`absolute inset-0 flex items-center justify-center b-0
              text-[15px] font-bold opacity-30 select-none
              ${source === "INDIGO" ? "text-indigo-700" : "text-orange-500"}`}
                >
                  {createdBy ? `${createdBy} ` : ""}
                  {source}
                </span>
              )}
              <div style={{ color: "#666" }}>
                {/* <CopyHelper text={record?.bookingId} /> */}
                <CopyHelper
                  text={
                    record?.bookingId
                      ? record.bookingId.startsWith("MJB")
                        ? record.bookingId
                        : `MJB${record.bookingId}`
                      : "-"
                  }
                />
              </div>
            </div>
          </div>
        );
      },
    },
    // {
    //   title: "Timing",
    //   key: "pickup",
    //   render: (_: any, record: Booking) => (
    //     <div
    //       style={{ fontSize: "13px", lineHeight: "1.4" }}
    //       className="w-[130px]"
    //     >
    //       <div>
    //         <b>Pickup : </b>
    //         {formatDateValue(record?.pickupTime)}
    //       </div>
    //       <div className="mt-2" style={{ color: "#777" }}>
    //         <b>BookingTime : </b>
    //         {formatDateValue(record?.bookingTime)}
    //       </div>
    //     </div>
    //   ),
    // },
    {
      title: "Locations",
      key: "location",
      render: (_: any, record: Booking) => {
        const pickup =
          record?.sourceAddress ||
          record?.sourceName ||
          record?.pickupLocation ||
          "-";
        const drop =
          record?.destinationAddress ||
          record?.destinationName ||
          record?.dropLocation ||
          "-";
        const travelType = formatTripMetaValue(record?.travelType);
        return (
          <div
            style={{ fontSize: "11px", lineHeight: "1.4" }}
            className="w-[150px]"
          >
            <div>
              <b>Pickup : </b>
              {pickup}
            </div>
            <div className="mt-3" style={{ color: "#777" }}>
              <b>Drop : </b>
              {drop}
            </div>
            {travelType && (
              <div className="mt-3" style={{ color: "#555", fontSize: "10px" }}>
                <b>Travel Type:</b> {travelType}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Status/Fare",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string, record: Booking) => {
        let tabtype = propsData?.type;
        return (
          <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
            <RideStatus data={{ status, record, tabtype }} />
            <div
              className="mt-2"
              style={{
                fontSize: "11px",
                color: "black",
                wordBreak: "break-word",
                fontWeight: "bold",
              }}
            >
              <b>Pickup : </b>
              {formatDateValue(record?.pickupTime)}
            </div>
            <BookingTripMetaFields record={record} />
            <div style={{ fontSize: "10px" }}>
              <div>TOTAL-FARE : {record?.paid || record?.totalFare}</div>
              <div>PRE-PAID : {record?.paid || record?.paidAmount}</div>
              <div
                style={{
                  fontWeight: "bold",
                  color: record?.remainingAmount > 0 ? "red" : "inherit",
                }}
              >
                REMAINING : {record?.remainingAmount || 0}{" "}
              </div>
              {Number(record?.loyalty_points_disbursed) > 0 && (
                <div
                  style={{
                    color: "#b45309",
                    fontWeight: "bold",
                    marginTop: "2px",
                  }}
                >
                  🪙 LOYALTY : {record.loyalty_points_disbursed} pts
                </div>
              )}
            </div>
            {record?.cancellationReason && (
              <div
                className="mt-1"
                style={{
                  fontSize: "10px",
                  color: "#ff4d4f",
                  wordBreak: "break-word",
                }}
              >
                <b>Reason : </b>
                {record.cancellationReason}
              </div>
            )}
          </div>
        );
      },
    },

    {
      title: "Driver Status",
      key: "cabStatus",
      render: (_: any, record: Booking) => {
        const yesNo = (value: number) =>
          value === 1 ? (
            <span style={{ color: "green" }}>Yes</span>
          ) : (
            <span style={{ fontSize: "11px", color: "red" }}>No</span>
          );

        return (
          <div className="w-18" style={{ fontSize: "11px", lineHeight: "1.6" }}>
            <div>
              <b>Assigned:</b> {yesNo(record?.cabAssigned)}
            </div>
            <div>
              <b>Left:</b> {yesNo(record?.cabLeftForPickup)}
            </div>
            <div>
              <b>Reached:</b> {yesNo(record?.cabReachedSource)}
            </div>
            <div>
              <b>Started:</b> {yesNo(record?.cabTripStarted)}
            </div>
            <div>
              <b>End:</b> {yesNo(record?.cabTripEnd)}
            </div>
          </div>
        );
      },
    },
    // {
    //   title: "Fare / Payment",
    //   key: "fare",
    //   render: (_: any, record: Booking) => (
    //     <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
    //       <div style={{ fontWeight: 500 }}>₹ {record?.totalFare}</div>
    //       <div>PAID : {record?.paid || record?.totalFare}</div>
    //       <div>REMAINING : {record?.remaining || 0}</div>
    //     </div>
    //   ),
    // },
    {
      title: "Partner",
      key: "partner",
      width: 140,
      render: (_: any, record: Booking) => (
        <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
          <div style={{ fontWeight: 700 }}>{record?.cabPartner}</div>
          {record?.driverName && (
            <div className="mt-3 mb-1">
              <b>Driver:</b> {record?.driverName}
            </div>
          )}
          {record?.driverMobile && (
            <div className="mb-1">
              <b>D-Mobile:</b> {record?.driverMobile}
            </div>
          )}
          {record?.vehicleNumber && (
            <div className="mb-1">
              <b>Vehicle No:</b> {record?.vehicleNumber}
            </div>
          )}
          {record?.otp && (
            <div>
              <b>OTP:</b> {record?.otp}
            </div>
          )}
        </div>
      ),
    },

    {
      title: "Remarks",
      key: "remark",
      render: (_: any, record: Booking) => (
        <RemarksCell
          booking={record}
          onCreateLog={onCreateLog}
          onRemarkSuccess={onRemarkSuccess}
          supportLogs={pickBookingLogs(bookingLogs || {}, record.bookingId)}
          tabPartner={propsData?.activePartner}
        />
      ),
    },
    {
      title: "Trigger",
      key: "trigger",
      render: (_: any, record: Booking) => <TriggerCell booking={record} />,
    },

    {
      title: "Booking Assignment",
      key: "assignment",
      // show only on delay tab
      ...(propsData?.type === "DelayRides" && {
        render: (_: any, record: Booking) => (
          <AssignmentCell
            booking={record}
            assignment={assignments?.[record.bookingId]}
            onAssigned={onAssigned || (() => {})}
            onCompleted={onCompleted || (() => {})}
          />
        ),
      }),
      //  if no delay ride then hide column
      ...(propsData?.type !== "DelayRides" && {
        render: () => null,
        width: 0,
        className: "hidden",
      }),
    },

    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Booking) => (
        <div className="grid">
          {record.trackingUrl && (
            <Button
              type="link"
              style={{ padding: 0, fontSize: "11px", height: "20px" }}
              onClick={() => window.open(record?.trackingUrl, "_blank")}
            >
              Track
            </Button>
          )}
          <Button
            type="link"
            style={{ padding: 0, fontSize: "11px", height: "20px" }}
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>
          <Button
            type="link"
            style={{ padding: 0, fontSize: "11px", height: "20px" }}
            onClick={() => handleShowJSON(record)}
          >
            Show JSON
          </Button>
          <Button
            type="link"
            style={{ padding: 0, fontSize: "11px", height: "20px" }}
            onClick={() => handleUpdate(record)}
          >
            Update
          </Button>
        </div>
      ),
    },
  ];

  if (!propsData?.cxView) return columns;

  return columns.flatMap((column) => {
    if (column.key === "trigger" || column.key === "assignment") return [];
    if (column.key === "remark") {
      return [
        {
          title: "Payment Breakup",
          key: "paymentBreakup",
          render: (_: unknown, record: Booking) => (
            <PaymentBreakupCell record={record} />
          ),
        },
      ];
    }
    if (column.key === "actions") {
      return [
        {
          title: "Actions",
          key: "actions",
          render: (_: unknown, record: Booking) => (
            <div className="grid">
              {record.trackingUrl && (
                <Button
                  type="link"
                  style={{ padding: 0, fontSize: "11px", height: "20px" }}
                  onClick={() => window.open(record.trackingUrl, "_blank")}
                >
                  Track
                </Button>
              )}
              <Button
                type="link"
                style={{ padding: 0, fontSize: "11px", height: "20px" }}
                onClick={() => handleViewDetails(record)}
              >
                Details
              </Button>
            </div>
          ),
        },
      ];
    }
    return [column];
  });
};

// ─── NPS Tab:
export const NpsColumns = (activePartner?: string | null) => [
  {
    title: "Customer",
    key: "customer",
    render: (_: any, record: any) => {
      const source = getCustomerWatermarkSource(record, activePartner);
      return (
        <div
          style={{ fontSize: "13px", lineHeight: "1.4" }}
          className="w-[160px]"
        >
          <div style={{ fontWeight: 500 }}>{record?.userName || "-"}</div>
          <CopyHelper text={record?.mobile} />
          <div style={{ color: "#666", fontSize: "11px" }}>
            {record?.email || "-"}
          </div>
          <div style={{ color: "#aaa", fontSize: "11px" }}>
            <CopyHelper text={record?.bookingId} />
          </div>
          <span
            style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.4 }}
            className={
              source === "INDIGO" ? "text-indigo-700" : "text-orange-500"
            }
          >
            {source}
          </span>
        </div>
      );
    },
  },

  {
    title: "Rating",
    key: "rating",
    render: (_: any, record: any) => {
      const raw =
        record?.npsData?.rating ??
        record?.npsData?.RATING ??
        record?.npsData?.Rating;

      if (raw === null || raw === undefined || raw === "") {
        return <span style={{ color: "#ccc" }}>No Rating</span>;
      }

      return (
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1890ff" }}>
          {String(raw)}
        </div>
      );
    },
  },

  {
    title: "Tell Us More",
    key: "review",
    width: 180,
    render: (_: any, record: any) => {
      const review = record?.npsData?.review ?? record?.npsData?.REVIEW ?? "-";
      return (
        <div
          style={{ fontSize: "12px", width: "180px", wordBreak: "break-word" }}
        >
          {review}
        </div>
      );
    },
  },

  {
    title: "Tags",
    key: "pre_def_review",
    width: 180,
    render: (_: any, record: any) => {
      const tag =
        record?.npsData?.pre_def_review ??
        record?.npsData?.PRE_DEF_REVIEW ??
        "-";
      return (
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "12px",
            background: "#f0f5ff",
            color: "#2f54eb",
            fontSize: "11px",
            wordBreak: "break-word",
            whiteSpace: "normal",
          }}
        >
          {tag}
        </span>
      );
    },
  },

  {
    title: "Partner",
    key: "partner_name",
    render: (_: any, record: any) => {
      const partnerName =
        record?.npsData?.partner_name ??
        record?.npsData?.PARTNER_NAME ??
        record?.cabPartner ??
        "-";
      return (
        <div style={{ fontSize: "12px", fontWeight: 600 }}>{partnerName}</div>
      );
    },
  },

  {
    title: "Review Time",
    key: "createdAt",
    render: (_: any, record: any) => {
      const date = record?.npsData?.createdAt ?? record?.npsData?.CREATEDAT;
      return (
        <div style={{ fontSize: "11px", color: "#555" }}>
          {date ? formatDateValue(date) : "—"}
        </div>
      );
    },
  },

  // {
  //   title: "Remarks",
  //   key: "remark",
  //   render: (_: any, record: Booking) => <RemarksCell booking={record} />,
  // },
];
