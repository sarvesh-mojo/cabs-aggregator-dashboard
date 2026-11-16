import React from "react";

interface Props {
  data: {
    status: string;
    record: any;
    tabtype: string;
  };
}

const RideStatus: React.FC<Props> = ({ data }) => {
  const { status, record, tabtype } = data;

  // MAIN STATUS COLOR
  let textColor = "green";
  if (status === "CANCELLED" || status === "CAB_BOOKING_FAILED")
    textColor = "red";
  else if (status === "PENDING") textColor = "orange";
  else if (status === "PREBOOK") textColor = "blue";

  if (tabtype != "DelayRides" && tabtype != "Next2hrBookings") {
    return (
      <div style={{ fontSize: "11px", lineHeight: "1.4", width: "70px" }}>
        <div className="font-bold" style={{ color: textColor }}>
          {status?.replace(/_/g, " ")}
        </div>
      </div>
    );
  }

  // LOGIC MESSAGE + INDICATOR COLOR
  // const bookingInfo = getBookingStatusInfo(record, record.pickupTime);
  const bookingInfo = record?.etaDelay ?? {};

  bookingInfo.color == "yellow" && (bookingInfo.color = "#ffd100");

//   const getEtaColor = (msg: string = "") => {
//   const lowerMsg = msg.toLowerCase();

//   if (lowerMsg.includes("not assigned")) {
//     return "red";
//   }

//   if (lowerMsg.includes("assigned")) {
//     return "orange";
//   }

//   if (lowerMsg.includes("arrived") || lowerMsg.includes("reached")) {
//     return "#ffd100"; 
//   }

//   return "green";
// };

// const etaColor = getEtaColor(bookingInfo.msg);

  // TRIANGLE INDICATOR STYLE
  const triangleStyle = {
    width: 0,
    height: 0,
    borderRight: "7px solid transparent",
    borderLeft: "7px solid transparent",
    borderBottom: `13px solid ${bookingInfo.color}`,
    display: bookingInfo.color  === "green" ? "none" : "inline-block",
    marginRight: "6px",
  };

  // PROGRESS VALUE
  // const percent = record?.tripProgress || 0;
  // const barWidth = `${percent}%`;
  // const stops = [0, 25, 50, 75, 100];

  return (
    <div style={{ fontSize: "13px", lineHeight: "1.4", width: "170px" }}>
      {/* MAIN STATUS */}
      <div className="font-bold" style={{ color: textColor }}>
        {status?.replace(/_/g, " ")}
      </div>

      {/* TRIANGLE INDICATOR + MESSAGE */}
      <div className="mt-1 flex items-center">
        <span style={triangleStyle}></span>
        <span style={{ fontSize: "11px", color: bookingInfo.color }}>
          {bookingInfo.msg}
        </span>
      </div>

      {/* TRIP % */}
      {/* <div className="mt-2" style={{ color: "#777" }}>
        <b>Trip:</b> {percent}%
      </div> */}

      {/* PROGRESS BAR - disable for some times  */ }
      {/* {percent >= 1 && (
        <div className="w-full bg-gray-200 h-2 rounded mt-1 relative">
          <div
            className="h-2 rounded"
            style={{ width: barWidth, background: "#4b9cff" }}
          ></div> */}

          {/* DOT MARKERS */}
          {/* {stops.map((s) => (
            <div
              key={s}
              style={{
                position: "absolute",
                left: `${s}%`,
                top: "1px",
                width: "6px",
                height: "6px",
                background: "#555",
                borderRadius: "50%",
                transform: "translateX(-3px)",
              }}
            ></div> */}
          {/* ))} */}
        {/* </div> */}
      {/* )} */}

      {/* ETA */}
      <div className="mt-1" style={{ color: "brown" }}>
        <b>ETA:</b>{" "}
        {record?.eta?.duration
          ? (() => {
              const mins = parseInt(record.eta.duration);
              const etaTime = new Date(Date.now() + mins * 60000);

              const formattedTime = etaTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return `${formattedTime}`;
            })()
          : "0 mins"}
        {record?.eta?.distance ? ` (${record.eta.distance})` : ""}
      </div>
    </div>
  );
};

export default RideStatus;

// export const getBookingStatusInfo = (bookingData: any, pickuptime: string) => {
//   const now: any = new Date();
//   const pickup: any = new Date(pickuptime);
//   const diffMinutes = (pickup - now) / (1000 * 60);

//   // --------------------------
//   // 1️⃣ ETA PARSE
//   // --------------------------
//   let etaTime: any = null;

//   if (bookingData?.eta?.duration) {
//     const etaMinutes = parseInt(bookingData.eta.duration); // "12 mins" → 12
//     etaTime = new Date();
//     etaTime.setMinutes(etaTime.getMinutes() + etaMinutes);
//   }

//   // --------------------------
//   // 2️⃣ ETA BASED LOGIC
//   // --------------------------
//   if (etaTime) {
//     if (etaTime > pickup) {
//       return {
//         msg: "ETA beyond pickup time. Contact customer for confirmation.",
//         color: "red",
//         tailwind: "bg-red-600",
//       };
//     }

//     const minutesDiff = (pickup - etaTime) / (1000 * 60);

//     if (minutesDiff >= 15) {
//       return {
//         msg: "ETA within safe window (15 min buffer). Proceed normally.",
//         color: "green",
//         tailwind: "bg-green-500",
//       };
//     }

//     if (etaTime < pickup) {
//       return {
//         msg: "ETA before pickup, coordinate with driver to avoid delay.",
//         color: "yellow",
//         tailwind: "bg-yellow-500",
//       };
//     }
//   }

//   // --------------------------
//   // 3️⃣ EXISTING LOGIC
//   // --------------------------

//   if (bookingData?.cabReachedSource == 1) {
//     return {
//       msg: "Cab Reached at pickup location.",
//       color: "green",
//       tailwind: "bg-green-500",
//     };
//   }

//   if (diffMinutes < 120 && diffMinutes > 60 && bookingData?.cabAssigned != 1) {
//     return {
//       msg: "Driver not assigned before 120 mins of pickup time.",
//       color: "blue",
//       tailwind: "bg-blue-500",
//     };
//   }

//   if (diffMinutes <= 60 && bookingData?.cabAssigned != 1) {
//     return {
//       msg: "Driver not assigned before 60 mins of pickup time.",
//       color: "red",
//       tailwind: "bg-red-600",
//     };
//   }

//   if (
//     diffMinutes < 120 &&
//     diffMinutes > 40 &&
//     bookingData?.cabLeftForPickup == 0 &&
//     bookingData?.cabAssigned == 1
//   ) {
//     return {
//       msg: "Driver assigned but no tracking received.",
//       color: "orange",
//       tailwind: "bg-orange-500",
//     };
//   }

//   if (
//     diffMinutes <= 40 &&
//     bookingData?.cabLeftForPickup == 0 &&
//     bookingData?.cabAssigned == 1
//   ) {
//     return {
//       msg: "Driver assigned but no Left for pickup before 40 mins.",
//       color: "red",
//       tailwind: "bg-red-600",
//     };
//   }

//   if (bookingData?.cabAssigned == 1 && bookingData?.cabLeftForPickup == 0) {
//     return {
//       msg: "Driver assigned.",
//       color: "orange",
//       tailwind: "bg-orange-500",
//     };
//   }

//   return {
//     msg: "",
//     color: "transparent",
//     tailwind: "bg-transparent",
//   };
// };
