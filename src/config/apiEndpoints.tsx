//BAC api's////////////////////////////////
export const USER_LOGIN = "/users/login"
export const GET_USER_BY_ID = "/v1/users"
// export const GET_CITY_LIST = "/getcitylist"
export const GET_CITY_LIST = "/api/v1/booking/cityList"


/// Partner API'S///////////////////////////////
export const getstatistics = "/api/v1/analytics/getStats"
export const getstatisticsV2 = "/api/v1/analytics/getStatsv2"
export const getbookingstatistics = "/api/v1/analytics/getBookingStats"
export const getbookingDailyCounts = "/api/v1/analytics/getDailyUpdates"
export const getbookingLogs = "/api/v1/booking/bookingLogs"
export const AssignDriver = "/assignChaufferDeparture"
export const DriverLeftForPickup = "/leftForPickup"
export const DriverArrivedAtPickupLoc = "/arrived"
export const Trip_started = "/tripStartDeparture"
export const Trip_Ended = "/tripEndBooking"
export const Trip_Cancel = "/api/v1/booking/cancelBooking?dev=true"
export const FARE_SEARCH = "/api/v1/booking/fareSearch"
export const PREBOOK = "/api/v1/booking/prebook?dev=true"
export const PAYMENT_CONFIRMATION = "/api/v1/booking/paymentConfirmation"
export const PLACE_SEARCH = "/api/v1/maps/placeSearch"
export const PLACE_DETAILS = "/api/v1/maps/placeDetails"
export const DISTANCE_MATRIX = "/api/v1/maps/distanceMatrix"
export const REASSIGN_BOOKING = "/api/v1/booking/reassignBooking"
export const RESCHEDULE_BOOKING = "/api/v1/booking/rescheduleBooking"
export const RESCHEDULE_FARE_QUOTE = "/api/v1/booking/rescheduleFareQuote"
export const VIP_Bookings = "/api/v1/driverApp/owner/pickupBookings"
export const VIP_PROFILES = "/api/v1/vip/profiles"
export const VIP_PROFILE_UPDATE = "/api/v1/vip/profiles/update"
export const VIP_CUSTOMER_TYPE = "/api/v1/vip/profiles/customer-type"
export const VIP_GRANT_CREDITS = "/api/v1/vip/credits/grant"
export const VIP_LEDGER = "/api/v1/vip/credits/ledger"
export const VIP_POOL = "/api/v1/vip/partner-pool"
export const VIP_POOL_OFF = "/api/v1/vip/partner-pool/deactivate"
export const VIP_DELIGHT_REFUND = "/api/v1/vip/delight-refund"
export const VIP_INSTRUCTION = "/api/v1/vip/instruction"
export const VIP_BRIDGE = "/api/v1/vip/bridge-tasks"
export const VIP_SETTLEMENT = "/api/v1/vip/settlement"
export const VIP_EMAIL_DRAFT = "/api/v1/vip/email-desk/draft"
export const VIP_EMAIL_LIST = "/api/v1/vip/email-desk"
export const VIP_EMAIL_SENT = "/api/v1/vip/email-desk/mark-sent"
export const VIP_SEED = "/api/v1/vip/profiles/seed"
export const VIP_BRIDGE_CLOSE = "/api/v1/vip/bridge-tasks/close"
export const VIP_DESK = "/api/v1/vip/ops/desk"
export const VIP_DESK_RIDE = "/api/v1/vip/ops/ride"
export const VIP_DESK_OWNER = "/api/v1/vip/ops/owner"
export const VIP_DESK_EVENT = "/api/v1/vip/ops/event"
export const VIP_DESK_EVIDENCE = "/api/v1/vip/ops/evidence"
export const VIP_DESK_EVIDENCE_REVIEW = "/api/v1/vip/ops/evidence/review"
export const VIP_DESK_FEEDBACK = "/api/v1/vip/ops/feedback"
export const VIP_DESK_MESSAGE_PREVIEW = "/api/v1/vip/ops/message/preview"
export const VIP_DESK_MESSAGE = "/api/v1/vip/ops/message"
export const VIP_DESK_TIER = "/api/v1/vip/ops/tier"
export const Add_Remarks = "/api/v1/driverApp/mojocaller/insertOpsBookingRemark"
export const get_Remarks = "/api/v1//driverApp/mojocaller/getOpsBookingRemarks"
export const GenericSearch = "/api/v1/operations/genericSearch"
export const CEO_Dashboard_Metric = "/api/v1/analytics/getCEODashboardMetrics"
export const Fetch_customer_review = "/api/v1/booking/bookingCustomerReviews"
export const Update_Generic_data = "/api/v1/operations/genericUpdate"
export const Trigger_Spoc_Message = "/api/v1/driverApp/mojocaller/triggerSpocMessage"
export const GenericCreate = "/api/v1/operations/genericCreate"
export const GenericDelete = "/api/v1/operations/genericDelete";
export const GET_BOOKING_INVOICE = "/api/v1/booking/bookingDetails?dev=true";
export const SEND_NPS_WHATSAPP =  "/api/v1/analytics/sendNpsWhatsapp";
export const GET_MERGED_NPS_RECORDS = "/api/v1/analytics/getNpsRecords";
export const OfferAnalytics =    "/api/v1/operations/offerAnalytics";
export const OfferAuditLog = "/api/v1/operations/offerAuditLog";
export const ENGAGEMENT_REPORT = "/api/v1/operations/engagementReport";
export const BOOKING_CSV_EXPORT = "/api/v1/business/bookingCsvExport";
export const CLOUDWATCH_LOGS = "/api/v1/operations/cloudwatchLogs";
export const CLOUDWATCH_ERRORS = "/api/v1/operations/cloudwatchErrors";
export const HOURLY_THRESHOLD_STATUS = "/api/v1/operations/hourlyThresholdStatus";

  

/// Payment API'S///////////////////////////////
export const paymentRefund = "/api/v1/justpay/refund"
export const RemarkOnPaymentRefund = "/api/v1/driverApp/mojocaller/insertOpsBookingRefund"
export const IxigoCancelandRefund = "/api/v1/booking/manualCancelRefund?dev=true"
export const GetPaymentStatus = "/api/v1/justpay/orderStatus"



