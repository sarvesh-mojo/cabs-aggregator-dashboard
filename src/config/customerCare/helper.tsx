import { Flex, Spin } from "antd";
import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";

interface BookingType {
  pickupTime: string;
  [key: string]: any;
}

interface BookingResp {
  bookings: BookingType[];
}

// dayjs.extend(utc);

export const AscendingPickupTime = (resp: BookingResp): BookingResp => {
  if (resp?.bookings?.length) {
    resp.bookings.sort((a, b) => {
      return (
        new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime()
      );
    });
  }
  return resp;
};

const getBookingCreatedTimestamp = (booking: BookingType): number => {
  const raw =
    booking?.createdAt ??
    booking?.created_at ??
    booking?.createdAtIst ??
    booking?.bookingTime ??
    booking?.pickupTime ??
    "";
  const time = new Date(String(raw)).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** Search results — newest created booking first (no extra API call). */
export const sortBookingsByRecentCreated = (resp: BookingResp): BookingResp => {
  if (resp?.bookings?.length) {
    resp.bookings.sort(
      (a, b) => getBookingCreatedTimestamp(b) - getBookingCreatedTimestamp(a),
    );
  }
  return resp;
};

/** Signature tab — API window from now through the next 4 hours. */
export const getSignatureNext4HrApiWindow = () => {
  const now = dayjs();
  const end = now.add(4, "hour");
  return {
    startDate: now.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
    startHour: now.hour(),
    endHour: end.hour(),
  };
};

/** Signature tab — keep only pickups between now and now + 4 hours. */
export const filterSignatureNext4HrRides = <T extends { pickupTime?: string }>(
  bookings: T[],
): T[] => {
  const now = Date.now();
  const until = now + 4 * 60 * 60 * 1000;
  return bookings.filter((booking) => {
    if (!booking?.pickupTime) return false;
    const pickup = new Date(
      String(booking.pickupTime).replace("Z", "+05:30"),
    ).getTime();
    if (Number.isNaN(pickup)) return false;
    return pickup >= now && pickup <= until;
  });
};

export const formatDateValue = (date?: string) => {
  if (!date) return "-";

  // return dayjs(date).format("YYYY-MM-DD HH:mm:ss");

  return date.replace("T", " ").replace(".000Z", "");
};

export const formatRemarksDate = (date?: string) => {
  if (!date) return "-";

  return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
};

// components/AnalyticsLoader.tsx
export const AnalyticsLoader = ({ height = "h-[100px]" }) => (
  <div
    className={`animate-pulse bg-white rounded-xl shadow p-4 w-full ${height} text-center`}
  >
    <div className="h-4 bg-gray-200 rounded w-40 mb-4 mx-auto"></div>
    <p>Please wait, Loading....</p>
    <div className="mx-auto w-15 mt-5">
      <Flex align="center" gap="middle">
        {/* <Spin size="small" />
    <Spin /> */}
    
        <Spin size="large" />
      </Flex>
    </div>
  </div>
);

