import { useState } from "react";
import { Button, message } from "antd";
import { Booking } from "../../config/customerCare/interfaceTypes"; 
import {
  CUSTOM_GENERIC_CREATE,
  CUSTOM_GENERIC_UPDATE,
  CUSTOM_GENERIC_TABLE,
} from "../../config/customerCare/operationsApicall";


interface AssignmentCellProps {
  booking: Booking;
  assignment: any; 
  onAssigned: (bookingId: string, record: any) => void;
  onCompleted: (bookingId: string) => void;
}

export const AssignmentCell = ({
  booking,
  assignment,
  onAssigned,
  onCompleted,
}: AssignmentCellProps) => {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const agentName = sessionStorage["userName"] || "Unknown";
  const partner = booking?.partnerName?.toLowerCase() || "indigo";

  const isAssigned = !!assignment;
  const isMyAssignment = assignment?.executive_name === agentName;
  const isCompleted = assignment?.status === "COMPLETE";

  // Assign to Me

// const handleAssign = async () => {
//   setLoading(true);
//   try {
//     await CUSTOM_GENERIC_CREATE(partner, {
//       table: "customer_care",
//       data: {
//         bookingId: booking.bookingId,
//         executive_name: agentName,
//         status: "WIP",
//       },
//     });

//     // Create ke baad fresh record fetch karo (id lene ke liye)
//     const resp: any = await CUSTOM_GENERIC_TABLE(partner, {
//       table: "customer_care",
//       filters: { bookingId: booking.bookingId },
//       page: 1,
//       limit: 1,
//     });

//     const freshRecord = resp?.data?.[0] || null;

//     if (freshRecord) {
//       messageApi.success("Assigned successfully!");
//       onAssigned(booking.bookingId, freshRecord); // ← id ke saath
//     }
//   } catch (err) {
//     messageApi.error("Failed to assign!");
//     console.error(err);
//   } finally {
//     setLoading(false);
//   }
// };

const handleAssign = async () => {
  setLoading(true);
  try {
    // Pehle check karo koi existing record hai ya nahi
    const checkResp: any = await CUSTOM_GENERIC_TABLE(partner, {
      table: "customer_care",
      filters: { bookingId: booking.bookingId },
      page: 1,
      limit: 1,
    });

    const existingRecord = checkResp?.data?.[0] || null;

    if (existingRecord) {
      //  check is record is exist or not  — do  UPDATE  (COMPLETE → WIP)
      await CUSTOM_GENERIC_UPDATE(partner, {
        table: "customer_care",
        id: existingRecord.id,
        data: {
          status: "WIP",
          executive_name: agentName,
        },
      });

      // Fresh record fetch karo
      const freshResp: any = await CUSTOM_GENERIC_TABLE(partner, {
        table: "customer_care",
        filters: { bookingId: booking.bookingId },
        page: 1,
        limit: 1,
      });
      const freshRecord = freshResp?.data?.[0] || null;
      if (freshRecord) {
        messageApi.success("Re-assigned successfully!");
        onAssigned(booking.bookingId, freshRecord);
      }
    } else {
      // if there is no record then, create new record 
      await CUSTOM_GENERIC_CREATE(partner, {
        table: "customer_care",
        data: {
          bookingId: booking.bookingId,
          executive_name: agentName,
          status: "WIP",
        },
      });

      // Fresh record fetch 
      const freshResp: any = await CUSTOM_GENERIC_TABLE(partner, {
        table: "customer_care",
        filters: { bookingId: booking.bookingId },
        page: 1,
        limit: 1,
      });
      const freshRecord = freshResp?.data?.[0] || null;
      if (freshRecord) {
        messageApi.success("Assigned successfully!");
        onAssigned(booking.bookingId, freshRecord);
      }
    }
  } catch (err) {
    messageApi.error("Failed to assign!");
    console.error(err);
  } finally {
    setLoading(false);
  }
};


  // Mark Completed

const handleComplete = async () => {
  if (!assignment?.id) return;
  setLoading(true);
  try {
    await CUSTOM_GENERIC_UPDATE(partner, {
      table: "customer_care",
      id: assignment.id,
      data: { status: "COMPLETE" }, 
    });
    messageApi.success("Marked as completed!");
    onCompleted(booking.bookingId); 
  } catch (err) {
    messageApi.error("Failed to complete!");
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      {contextHolder}
      <div style={{ fontSize: "11px", lineHeight: "1.6", minWidth: 130 }}>
        {/* Status Badge */}
        {isAssigned ? (
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 600,
                background: isCompleted ? "#d1fae5" : "#fef3c7",
                color: isCompleted ? "#065f46" : "#92400e",
                marginBottom: 4,
              }}
            >
              {isCompleted ? "✅ Completed" : "🔄 WIP"}
            </span>
            <div style={{ color: "#555", fontSize: 10 }}>
              👤 {assignment.executive_name}
            </div>
          </div>
        ) : (
          <div style={{ color: "#9ca3af", fontSize: 10 }}>Not assigned</div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
          {/* Assign to Me — sirf tab dikhao jab not assigned ya completed ho */}
          {(!isAssigned || isCompleted) && (
            <Button
              size="small"
              type="primary"
              loading={loading}
              style={{ fontSize: 10, height: 22, padding: "0 8px" }}
              onClick={handleAssign}
            >
              Assign to Me
            </Button>
          )}

          {/* Complete — sirf tab dikhao jab assigned ho, mera assignment ho, aur WIP ho */}
          {isAssigned && isMyAssignment && !isCompleted && (
            <Button
              size="small"
              style={{
                fontSize: 10,
                height: 22,
                padding: "0 8px",
                background: "#10b981",
                color: "white",
                border: "none",
              }}
              loading={loading}
              onClick={handleComplete}
            >
              ✓ Complete
            </Button>
          )}
        </div>
      </div>
    </>
  );
};