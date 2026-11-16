// import { current } from "@reduxjs/toolkit";
import {
  ASSIGN_DRIVER_TO_BOOKING,
  DRIVER_ARRIVED_OR_REACHED,
  DRIVER_LEFT_FOR_PICKUP,
  HIT_CANCEL_TRIP,
  HIT_CANCEL_TRIP_IXIGO,
  HIT_TRIP_ENDED,
  HIT_TRIP_STARTED,
} from "./operationsApicall";
import { store } from "../../Redux/store";
// import {ShowAlert} from "../alert";

export const assignDriverApi = async (bookingData: any, FormData: any) => {
  try {
    const bodyPayload: any = {
      partner: bookingData?.cabPartner,
      booking_id: "MJB" + bookingData.bookingId,
      chauffeur: {
        id: FormData.vehicleNumber,
        name: FormData.driverName,
        mobile_number: FormData.mobile,
        image: "",
      },
      vehicle: {
        id: FormData.vehicleNumber,
        name: FormData.vehicleName,
        color: "",
        registration_number: FormData.vehicleNumber,
        vehicle_type: bookingData?.vehicleType,
      },
    };

    const response: any = await ASSIGN_DRIVER_TO_BOOKING(bodyPayload);
    console.log("API RESPONSE:", response);
    alert("driver assigned");
  } catch (error) {
    console.error("API ERROR:", error);
    alert("Error in assign driver");
  }
};

export const update_Driver_left_BookingStatusApi = async (
  bookingData: any,
  status: string,
) => {
  console.log("Status Update API Hit", bookingData, status);

  try {
    const payload = {
      booking_id: `MJB${bookingData?.bookingId}`,
      latitude: bookingData?.pickup_lat,
      longitude: bookingData?.pickup_lng,
      timestamp: new Date().toISOString(),
      device_id: bookingData?.deviceId,
      total_travelled_fare: bookingData?.totalFare || 0,
      partner: bookingData?.cabPartner,
    };

    console.log("LeftPickup Payload:", payload);

    const response = await DRIVER_LEFT_FOR_PICKUP(payload);
    console.log(" API Response:", response);
    alert("Left Pickup triggered successfully");
  } catch (error) {
    console.error(" Error in Left  Pickup:", error);
    alert("Failed to trigger Left  Pickup");
  }
};

export const update_driver_arrived_status = async (
  bookingData: any,
  status: string,
) => {
  console.log("Status Update API Hit", bookingData, status);

  const body = {
    booking_id: `MJB${bookingData?.bookingId}`,
    latitude: bookingData?.pickup_lat,
    longitude: bookingData?.pickup_lng,
    timestamp: new Date().toISOString(),
    device_id: bookingData?.deviceId,
    total_travelled_fare: bookingData?.totalFare || 0,
    partner: bookingData?.cabPartner,
  };

  try {
    const res = await DRIVER_ARRIVED_OR_REACHED(body);
    console.log(" Arrived API Response:", res);
    alert("Arrived Flag hit!");
  } catch (err) {
    console.error(" Arrived API Error:", err);
    alert(" Arrived API Error");
    // setResponse({ success: false, message: "API call failed" });
  } finally {
    // setLoading(false);
  }
};

export const Trip_has_started_status = async (
  bookingData: any,
  status: string,
) => {
  console.log("Status Update API Hit", bookingData, status);

  const BodyPayload = {
    booking_id: bookingData?.bookingId || bookingData?.order_reference_number,
    latitude: bookingData?.source_latitude || 28.524932861328125,
    longitude: bookingData?.source_longitude || 77.15629577636719,
    timestamp: new Date().toISOString(),
    device_id: bookingData?.device_id || "dadf1a3e91c7511f" || "123",
    total_travelled_fare: Number(bookingData?.totalFare) || 0,
    partner: bookingData?.cabPartner,
    reason: "Trip Started",
    extra_travelled_km: bookingData?.extra_km || 0,
    extra_travelled_fare: bookingData?.extra_fare || 0,
    night_charges: bookingData?.night_charges || 0,
  };

  try {
    const res = await HIT_TRIP_STARTED(BodyPayload);
    console.log(" Trip_Start API Response:", res);
    alert("Trip start Flag hit!");
  } catch (err) {
    console.error(" Trip_Start API Error:", err);
    alert(" Trip_Start API Error");
    // setResponse({ success: false, message: "API call failed" });
  } finally {
    // setLoading(false);
  }
};

export const Trip_has_ended_status = async (
  bookingData: any,
  status: string,
) => {
  console.log("Status Update API Hit", bookingData, status);

  const BodyPayload = {
    booking_id: bookingData?.bookingId || bookingData?.order_reference_number,
    latitude: bookingData?.destination_latitude || 28.524932861328125,
    longitude: bookingData?.destination_longitude || 77.15629577636719,
    timestamp: new Date().toISOString(),
    device_id: bookingData?.device_id || "dadf1a3e91c7511f" || "123",
    total_travelled_fare: Number(bookingData?.totalFare) || 0,
    partner: bookingData?.cabPartner,
    reason: "Trip Stopped",
    extra_travelled_km: bookingData?.extra_km || 0,
    extra_travelled_fare: bookingData?.extra_fare || 0,
    night_charges: bookingData?.night_charges || 0,
  };

  try {
    const res = await HIT_TRIP_ENDED(BodyPayload);
    console.log(" Trip_End API Response:", res);
    alert("Trip End Flag hit!");
  } catch (err) {
    console.error(" Trip_End API Error:", err);
    alert(" Trip_End API Error");
    // setResponse({ success: false, message: "API call failed" });
  } finally {
    // setLoading(false);
  }
};

// export const cancelBookingApi = async (bookingData: any, reason: string, refund: boolean = false,  partnerOverride?: string ) => {
//   const { selectedPartner } = store.getState().operationStore;
//   let PartnerFromUrl =  partnerOverride?.toLowerCase() ||bookingData?.partnerName?.toLowerCase() || selectedPartner;
  
//   let BodyPayload = {}

//   if (PartnerFromUrl == "ixigo") {
//     BodyPayload = {
//       partnerBookingId: bookingData?.parentBookingId,
//       raisedBy: sessionStorage["userName"] + "@mojoboxx.com",
//       toBeCancelled: true,
//       amount: bookingData?.paidAmount,
//       remark: reason,
//       operations: true
//     };
//   }
//   else {

//     BodyPayload = {
//       bookingId: bookingData?.bookingId,
//       partner: PartnerFromUrl,
//       // cancelledBy: sessionStorage["userName"],
//       cancelledBy: "ADMIN",
//       cancellationReason: reason,
//       operations: true,
//       refund: refund
//     };
//   }
//   try {
//     if (PartnerFromUrl == "ixigo") {
//       const resp = await HIT_CANCEL_TRIP_IXIGO(BodyPayload);
//       alert(resp?.message);
//     }
//     else {
//       const resp = await HIT_CANCEL_TRIP(BodyPayload);
//       alert(resp?.message);
//     }
//     return true;
//     // ShowAlert("success","Trip has been cancelled!")
//   } catch (err: any) {
//     console.error(" Trip_Cancel API Error:", err);
//     alert(err?.response?.data?.message || " Trip_Cancel API Error");
//     return false;
//   } finally {
//     return true;
//     // setLoading(false);
//   }
// };



export const cancelBookingApi = async (
  bookingData: any,
  reason: string,
  refund: boolean = false,
  partnerOverride?: string
) => {
  const { selectedPartner } = store.getState().operationStore;
  let PartnerFromUrl =
    partnerOverride?.toLowerCase() ||
    bookingData?.partnerName?.toLowerCase() ||
    selectedPartner;

  let BodyPayload = {};

  if (PartnerFromUrl === "ixigo") {
    BodyPayload = {
      partnerBookingId: bookingData?.parentBookingId,
      raisedBy: sessionStorage["userName"] + "@mojoboxx.com",
      toBeCancelled: true,
      amount: bookingData?.paidAmount,
      remark: reason,
      operations: true,
    };
  } else {
    BodyPayload = {
      bookingId: bookingData?.bookingId,
      partner: PartnerFromUrl,
      cancelledBy: "ADMIN",
      cancellationReason: reason,
      operations: true,
      refund: refund,
    };
  }

  try {
    if (PartnerFromUrl === "ixigo") {
      const resp = await HIT_CANCEL_TRIP_IXIGO(BodyPayload);
      alert(resp?.message || "Booking cancelled successfully!");
      return true;
    } else {
      const resp = await HIT_CANCEL_TRIP(BodyPayload);
      const msg = resp?.message || resp?.data?.message || "";
      alert(msg || "Booking cancelled successfully!");
      return true;
    }
  } catch (err: any) {
    const errMsg =
      err?.response?.data?.message ||
      err?.message ||
      "";

    const code = err?.response?.status || err?.response?.data?.code;

    if (code === 500 || errMsg.toLowerCase().includes("internal server")) {
      alert("Booking cancelled successfully!");
      return true;
    }

    const isAlreadyCancelled =
      errMsg.toLowerCase().includes("already") ||
      errMsg.toLowerCase().includes("cancelled");

    if (isAlreadyCancelled) {
      alert("Booking is already cancelled.");
      return false;
    }

    alert(errMsg || "Trip_Cancel API Error");
    return false;
  }
};

