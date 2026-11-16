interface TimelineStep {
  event: string;
  time: string;
}

export interface BookingsProps {
  propsData: { 'type': string }
}

// Define the types for the Booking Data and Pagination
export interface Booking {
  bookingId: string;
  userName: string;
  mobile: string;
  email: string;
  pickupTime: string;
  bookingTime: string;
  status: any;
  totalFare: number;
  paid: number;
  remaining: number;
  cabPartner: string;
  driverName: string;
  driverMobile: string;
  vehicleNumber: string;
  otp: string;
  tripPercentage: string;
  assigned: number;
  left: number;
  reached: number;
  started: number;
  end: number;
  trackingUrl: string;
  cancellationReason?: string | null;
  [key: string]: any; // To handle any other fields dynamically
}

export interface HandleBookingInterface {
  bookingId: string;
  partnerId: string;
  mobile: string;
  rideType: string;
  cabType: string;
  fuelType: string;
  cabPartner: string;
  driverName: string;
  driverMobile: string;
  vehicleName: string;
  vehicleNumber: string;
  otp: string;
  tripPercentage: string;
  assigned: number;
  left: number;
  reached: number;
  started: number;
  end: number;
  trackingUrl: string;
  timeline: TimelineStep[];
  sourceName: string;
  destinationName: string;
  bookingTime: string;
  verificationOtp: string;
  baseFare: number;
  prepaidAmount: number;
  cancellationFee: number;
  extraPerKm: number;
  totalDistance: number;
  [key: string]: any;
}

export interface NpsRecordsPayload {
  page: number;
  limit: number;
  search?: string;
  startDT: string;
  endDT: string;
}

export interface SpocMessagePayload {
  bookingId: string;
  type: string;
  cabPartner: string;
}