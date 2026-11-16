import { useState } from "react";
// import { message } from "antd";
import { CUSTOM_GENERIC_CREATE } from "../../../config/customerCare/operationsApicall";

// ─── Constants (same as CustomerLogs to stay in sync) ────────────────────────
const FIXED_TABLE = "customer_support_logs";

const DROPDOWN_FIELDS: Record<string, { label: string; value: string }[]> = {

  paymentHold: [
    { label: "Yes", value: "1" },
    { label: "No", value: "0" },
  ],
  paidBy: [
    { label: "Partner", value: "Partner" },
    { label: "Ashu", value: "Ashu" },
    { label: "Mojoboxx", value: "Mojoboxx" },
  ],
  actionStatus: [
    { label: "Open", value: "open" },
    { label: "Close", value: "close" },
    { label: "InProgress", value: "Inprogress" },
  ],
  finalReport: [
  { label: "Cab Not Available", value: "cab not available" },
  { label: "Driver No Show", value: "driver no show" },
  { label: "Customer No Show", value: "customer no show" },
  { label: "Alternative Provided", value: "alternative provided" },
  { label: "Normal Complaint", value: "normal complaint" },
],
  cabPartner: [
    "TRAVELVIP",
    "QUICKRIDE",
    "GOZOCABS",
    "SIGNATURE",
    "WTICABS",
    "MEGA",
    "GOAMILES",
    "TAXIBAZAAR",
    "EVERA",
    "CARZONRENT",
    "REFEX",
    "MERU",
    "KANGAROOCARS",
    "SIG-SNAPPY",
    "SIG-Evera",
    "COMMUTEC",
    "SHOFFR",
    "BETMOBILITY",
    "BLUECAB",
    "TAXIDA",
    "VOZI",
    "ONDC",
    "MILODRIVE",
    "GRELCABS",
    "SIG-PLUSHMILES",
    "SIG-BLUSKY",
    "SIG-GOGREEN",
    "SIG-PVryde",
    "SIG-MANNTOURS",
    "SIG-NANDIMOBILITY",
  ].map((v) => ({ label: v, value: v })),
};

// Normalize key to match DROPDOWN_FIELDS keys
// const normalizeKey = (key: string) =>
//   key.toLowerCase().replace(/[\s_-]/g, "");

const normalizeKey = (key: string) => key;

const AMOUNT_FIELDS = [
  "bookingAmount",
  "alternativeCabProviderAmount",
  "refundAmount",
  "paymentHold",
];

// Fields shown in the form (order matters)
const FORM_FIELDS = [
  "bookingId",
  "customerNumber",
  "cabPartner",
  "bookingPartner",
  "bookingAmount",
  "agentName",
  "complaints",
  "inquiry",
  "resolution",
  "complaintsVia",
  "alternativeCabProviderAmount",
  "refundAmount",
  "paidBy",
  "paymentHold",
  "actionStatus",
  "finalReport",
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface CreateLogModalProps {
  open: boolean;
  partner: string; 
  initialData?: Record<string, any>;
  onClose: () => void;
//   onSuccess?: () => void; 
onSuccess?: (bookingId: string, logData: Record<string, any>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const CreateLogModal = ({
  open,
  partner,
  initialData = {},
  onClose,
  onSuccess,
}: CreateLogModalProps) => {
  //   const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [formData, setFormData] = useState<Record<string, any>>(() =>
    FORM_FIELDS.reduce(
      (acc, key) => {
        const val = initialData[key];
        acc[key] =
          val !== undefined && val !== ""
            ? val
            : AMOUNT_FIELDS.includes(key)
              ? "0"
              : "NA";
        return acc;
      },
      {} as Record<string, any>,
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset form when modal opens with new data
  // (caller should unmount/remount or use key prop to reset)

  if (!open) return null;

if (showSuccess) return (
  <div
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }}
  >
    <div
      style={{
        background: "#fff", borderRadius: 16, padding: "40px 48px",
        textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", minWidth: 340,
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
        Log Created Successfully!
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        Booking <b>{formData.bookingId}</b> log has been created successfully.
      </div>
      <button
        onClick={() => { setShowSuccess(false); onClose(); }}
        style={{
          padding: "10px 32px", borderRadius: 8, border: "none",
          background: "#2563eb", color: "#fff", fontSize: 14,
          fontWeight: 700, cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  </div>
);


  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const excludeFields = ["id", "createdAt", "updatedAt", "partnerName"];
      //   const cleanData = Object.fromEntries(
      //     Object.entries(formData)
      //       .filter(([k, v]) => v !== "" && v !== undefined && !excludeFields.includes(k))
      //       .map(([k, v]) => {
      //         if (typeof v === "string" && /\d{4}-\d{2}-\d{2}T/.test(v)) {
      //           return [k, new Date(v).toISOString().slice(0, 19).replace("T", " ")];
      //         }
      //         return [k, v];
      //       }),
      //   );

      const DROPDOWN_KEYS = [
        "paymentHold",
        "paidBy",
        "actionStatus",
        "cabPartner",
      ];

      const cleanData = Object.fromEntries(
        Object.entries(formData)
          .filter(([k]) => !excludeFields.includes(k))
          .filter(([k, v]) => {
            // Dropdown field hai aur value select nahi ki — skip karo
            if (
              DROPDOWN_KEYS.includes(k) &&
              (v === "" || v === "NA" || v === undefined)
            )
              return false;
            return true;
          })
          .map(([k, v]) => {
            if (v === "" || v === undefined || v === null) {
              return [k, AMOUNT_FIELDS.includes(k) ? "0" : "NA"];
            }
            if (typeof v === "string" && /\d{4}-\d{2}-\d{2}T/.test(v)) {
              return [
                k,
                new Date(v as string)
                  .toISOString()
                  .slice(0, 19)
                  .replace("T", " "),
              ];
            }
            return [k, v];
          }),
      );

      await CUSTOM_GENERIC_CREATE(partner || "mojo", {
        table: FIXED_TABLE,
        data: cleanData,
      });
      //   message.success(`Log created successfully for ${formData.bookingId}`);

    //   message.success(`Log created for ${formData.bookingId}`);
    //     onSuccess?.();
    //   setShowSuccess(true);
    //   onSuccess?.(formData.bookingId);
      setShowSuccess(true);
      onSuccess?.(formData.bookingId, {
        ...cleanData,
        createdAt: new Date().toISOString(),
      });

    //   onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create log");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: 580,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
              ➕ Create Customer Log
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Booking details pre-filled — add complaint/inquiry details
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: 8,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 16,
              color: "#374151",
              lineHeight: "28px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {FORM_FIELDS.map((key) => {
              const dropdownOptions = DROPDOWN_FIELDS[normalizeKey(key)];
              const isPrefilled = Boolean(initialData[key]);

              return (
                <div
                  key={key}
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isPrefilled ? "#2563eb" : "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/_/g, " ")
                      .trim()}
                    {isPrefilled && (
                      <span
                        style={{ marginLeft: 4, fontSize: 9, color: "#10b981" }}
                      >
                        {/* ✓ auto-filled */}
                      </span>
                    )}
                  </label>
                  {dropdownOptions ? (
                    <select
                      value={formData[key] ?? ""}
                      onChange={(e) => set(key, e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select</option>
                      {dropdownOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData[key] ?? ""}
                      onChange={(e) => set(key, e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: isPrefilled ? "#bfdbfe" : "#e5e7eb",
                        background: isPrefilled ? "#eff6ff" : "#fff",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) =>
                        (e.target.style.borderColor = isPrefilled
                          ? "#bfdbfe"
                          : "#e5e7eb")
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                fontSize: 12,
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "8px 22px",
              borderRadius: 8,
              border: "none",
              background: submitting ? "#93c5fd" : "#2563eb",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving…" : "Create Log"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  padding: "7px 10px",
  fontSize: 12,
  outline: "none",
  color: "#111827",
  background: "#fff",
  transition: "border 0.15s",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

// ─── Mapping helper (exported so HomeCX can use it) ───────────────────────────
export const mapBookingToLogForm = (booking: any): Record<string, any> => ({
  bookingId: booking.bookingId
    ? booking.bookingId.startsWith("MJB")
      ? booking.bookingId
      : `MJB${booking.bookingId}`
    : "",
  customerNumber: booking.mobile || "",
  cabPartner: booking.cabPartner || "",
  bookingPartner: booking.partnerName || "",
  bookingAmount: String(booking.totalFare || booking.paid || ""),
  //   agentName: sessionStorage["userName"] || "",
  // mapBookingToLogForm mein:
  agentName:
    sessionStorage["userName"] ||
    sessionStorage["userEmail"] ||
    "Unknown Agent",
});

export default CreateLogModal;
