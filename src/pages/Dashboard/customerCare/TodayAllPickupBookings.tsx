import BookingTableWrapper from "../../../components/customerCare/BookingTableWrapper";
// import { store } from "../../../Redux/store";

const TodayAllPickups = () => {
  return (
    <>
    <BookingTableWrapper propsData={{'type':'TodayAllPickups'}}/>
    </>
  );
};

export default TodayAllPickups;




// import React, { useEffect, useState } from "react";
// import { Button, Modal, Descriptions } from "antd";
// import DataTable from "../../../components/customerCare/DataTable";
// import { GETBOOKING_LOGS } from "../../../config/customerCare/operationsApicall";
// import ConditionalTab from "../../../components/customerCare/ConditionalTab";
// import { STATUS_TABS } from "../../../config/customerCare/constant";
// import {
//   Booking,
//   BookingsProps,
// } from "../../../config/customerCare/interfaceTypes";

// const TodayAllPickups: React.FC<BookingsProps> = () => {
//   const [BookingData, setBookingData] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [search, setSearch] = useState<string>("");
//   const [totalRecords, setTotalRecords] = useState<number>(0);
//   const [activeTab, setActiveTab] = useState<string>("ixigo");
//   const [RideactiveTab, setRideActiveTab] = useState("all");

//   const [pagination, setPagination] = useState({
//     current: 1,
//     pageSize: 10,
//   });

//   const [modalVisible, setModalVisible] = useState(false);
//   const [jsonModalVisible, setJsonModalVisible] = useState(false);
//   const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

//   const [dateRange, setDateRange] = useState<[string, string]>(() => {
//     const today = new Date().toISOString().split("T")[0];
//     return [today, today];
//   });

//   const [hours, setHours] = useState<number>(24);
//   const [paymentType, setPaymentType] = useState("");
//   const [partner, setPartner] = useState("");
//   const [selectedStatus, setSelectedStatus] =
//     useState<string>("BOOKING_CONFIRMED");

//   const columns = [
//     {
//       title: "Booking ID",
//       key: "bookingId",
//       render: (_: any, record: Booking) => (
//         <div style={{ fontSize: "10px", lineHeight: "1.4" }} className="w-18">
//           <div>{record.bookingId}</div>
//         </div>
//       ),
//     },
//     {
//       title: "Customer",
//       key: "customer",
//       render: (_: any, record: Booking) => (
//         <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
//           <div style={{ fontWeight: 500 }}>{record.userName}</div>
//           <div>{record.mobile}</div>
//           <div style={{ color: "#666" }}>{record.email}</div>
//         </div>
//       ),
//     },
//     {
//       title: "Timing",
//       key: "pickup",
//       render: (_: any, record: Booking) => (
//         <div style={{ fontSize: "13px", lineHeight: "1.4" }} className="w-[130px]">
//           <div>
//             <b>Pickup : </b>
//             {new Date(record.pickupTime).toLocaleString()}
//           </div>
//           <div className="mt-2" style={{ color: "#777" }}>
//             <b>BookingTime : </b>
//             {new Date(record.bookingTime).toLocaleString()}
//           </div>
//         </div>
//       ),
//     },
//     {
//       title: "Locations",
//       key: "location",
//       render: (_: any, record: Booking) => (
//         <div style={{ fontSize: "11px", lineHeight: "1.4" }} className="w-[150px]">
//           <div>
//             <b>Pickup : </b>
//             {record.sourceAddress}
//           </div>
//           <div className="mt-3" style={{ color: "#777" }}>
//             <b>Drop : </b>
//             {record.destinationAddress}
//           </div>
//         </div>
//       ),
//     },
//     {
//       title: "Status",
//       key: "status",
//       render: (_: any, record: Booking) => {
//         let color = "green";
//         if (record.status === "CANCELLED") color = "red";
//         else if (record.status === "PENDING") color = "orange";

//         return (
//           <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
//             <div className="font-bold" style={{ color }}>
//               {record.status.replace(/_/g, " ")}
//             </div>
//             <div className="mt-2" style={{ color: "#777" }}>
//               <b>Trip:</b> {record.tripPercentage || "0"}%
//             </div>
//             <div className="mt-1" style={{ color: "#777" }}>
//               <b>ETA:</b> {record.eta || "0 mins"}
//             </div>
//           </div>
//         );
//       },
//     },
//     {
//       title: "Fare / Payment",
//       key: "fare",
//       render: (_: any, record: Booking) => (
//         <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
//           <div style={{ fontWeight: 500 }}>₹ {record.totalFare}</div>
//           <div>PAID : {record.paid || record.totalFare}</div>
//           <div>REMAINING : {record.remaining || 0}</div>
//         </div>
//       ),
//     },
//     {
//       title: "Partner",
//       key: "partner",
//       render: (_: any, record: Booking) => (
//         <div style={{ fontSize: "11px", lineHeight: "1.4" }}>
//           <div style={{ fontWeight: 700 }}>{record.cabPartner}</div>

//           {record.driverName && (
//             <div className="mt-3 mb-1">
//               <b>Driver:</b> {record.driverName}
//             </div>
//           )}
//           {record.driverMobile && (
//             <div className="mb-1">
//               <b>D-Mobile:</b> {record.driverMobile}
//             </div>
//           )}
//           {record.vehicleNumber && (
//             <div className="mb-1">
//               <b>Vehicle No:</b> {record.vehicleNumber}
//             </div>
//           )}
//           {record.otp && (
//             <div>
//               <b>OTP:</b> {record.otp}
//             </div>
//           )}
//         </div>
//       ),
//     },
//     {
//       title: "Driver Status",
//       key: "cabStatus",
//       render: (_: any, record: Booking) => {
//         const yesNo = (val: number) =>
//           val === 1 ? (
//             <span style={{ color: "green" }}>Yes</span>
//           ) : (
//             <span style={{ color: "red" }}>No</span>
//           );

//         return (
//           <div style={{ fontSize: "11px", lineHeight: "1.6" }}>
//             <div>
//               <b>Assigned:</b> {yesNo(record.assigned)}
//             </div>
//             <div>
//               <b>Left:</b> {yesNo(record.left)}
//             </div>
//             <div>
//               <b>Reached:</b> {yesNo(record.reached)}
//             </div>
//             <div>
//               <b>Started:</b> {yesNo(record.started)}
//             </div>
//             <div>
//               <b>End:</b> {yesNo(record.end)}
//             </div>
//           </div>
//         );
//       },
//     },
//     {
//       title: "Actions",
//       key: "actions",
//       render: (_: any, record: Booking) => (
//         <div className="grid">
//           {record.trackingUrl && (
//             <Button
//               type="link"
//               style={{ padding: 0, fontSize: "11px" }}
//               onClick={() => window.open(record.trackingUrl!, "_blank")}
//             >
//               Track Ride
//             </Button>
//           )}

//           <Button
//             type="link"
//             style={{ padding: 0, fontSize: "11px" }}
//             onClick={() => handleViewDetails(record)}
//           >
//             View Details
//           </Button>

//           <Button
//             type="link"
//             style={{ padding: 0, fontSize: "11px" }}
//             onClick={() => handleShowJSON(record)}
//           >
//             Show JSON
//           </Button>

//           <Button
//             type="link"
//             style={{ padding: 0, fontSize: "11px" }}
//             onClick={() => handleUpdate(record)}
//           >
//             Update
//           </Button>
//         </div>
//       ),
//     },
//   ];

//   // Fetching data
//   useEffect(() => {
//     fetchData(pagination.current, pagination.pageSize);
//   }, [
//     search,
//     activeTab,
//     pagination.current,
//     pagination.pageSize,
//     dateRange,
//     selectedStatus,
//     hours,
//     partner,
//     RideactiveTab,
//   ]);

//   const fetchData = async (page = 1, limit = 10) => {
//     setLoading(true);

//     let tabFilters: any = {};

//     if (activeTab === "active") tabFilters.activeRides = "true";
//     if (activeTab === "completed") tabFilters.status = "completed";
//     if (activeTab === "cancelled") tabFilters.status = "cancelled";

//     const today = new Date().toISOString().split("T")[0];

//     try {
//       const bodyPayload: any = {
//         bookingId: search,
//         page,
//         limit,
//         startHour: 1,
//         endHour: 23,
//         status: selectedStatus,
//         startDate: today,
//         endDate: today,
//         ...tabFilters,
//       };

//       if (partner) {
//         bodyPayload.cabPartner = partner;
//       }

//       const LogsResp: any = await GETBOOKING_LOGS(bodyPayload);

//       setBookingData(LogsResp?.bookings);
//       setTotalRecords(LogsResp?.totalRecords);

//       setPagination((prev) => ({
//         ...prev,
//         total: LogsResp?.totalRecords,
//       }));
//     } catch (err) {
//       console.log(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleTabChange = (tab: string) => {
//     setRideActiveTab(tab);
//   };

//   const handleTableChange = (pagination: any) => {
//     setPagination(pagination);
//   };

//   const handleViewDetails = (record: Booking) => {
//     setSelectedBooking(record);
//     setModalVisible(true);
//   };

//   const handleUpdate = (record: Booking) => {
    // const { selectedPartner } = store.getState().operationStore;
    // let IdentifyPartner = record?.trackingUrl?.includes("ixigo")
      // ? "ixigo"
      // : record?.trackingUrl?.includes("indigo")
        // ? "indigo"
        // : selectedPartner;
    // window.location.href = `/dashboard/customerCare/HandleBooking?bookingId=${IdentifyPartner}-${record?.bookingId}`;
//   };

//   const handleShowJSON = (record: Booking) => {
//     setSelectedBooking(record);
//     setJsonModalVisible(true);
//   };

//   const handleFilters = (values: any) => {
//     setHours(values.hours);
//     setPaymentType(values.paymentType);
//     setPartner(values.partner);
//   };

//   return (
//     <div className="p-2 mt-3">
//       <ConditionalTab
//         BookingData={BookingData}
//         activeTab={activeTab}
//         STATUS_TABS={STATUS_TABS}
//         totalRecords={totalRecords}
//         onChangeTab={setActiveTab}
//         onChangeDateRange={setDateRange}
//         onChangeStatus={setSelectedStatus}
//         dateRange={dateRange}
//         selectedStatus={selectedStatus}
//         hours={hours}
//         paymentType={paymentType}
//         partner={partner}
//         onApplyFilters={handleFilters}
//       />

//       <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        

//         <div className="flex border rounded-md overflow-hidden text-xs">
//           {[
//             { key: "all", title: "All Bookings", count: BookingData?.length },
//             // { key: "all", title: "All Bookings", count: totalAll },
//             { key: "active", title: "Active Rides", count: BookingData?.length },
//             // { key: "active", title: "Active Rides", count: totalActive },
//             { key: "completed", title: "Completed", count: BookingData?.length },
//             // { key: "completed", title: "Completed", count: totalCompleted },
//             { key: "cancelled", title: "Cancelled", count: BookingData?.length },
//             // { key: "cancelled", title: "Cancelled", count: totalCancelled },
//           ].map((tab) => (
//             <div
//               key={tab.key}
//               onClick={() => handleTabChange(tab.key)}
//               className={`flex-1 text-center py-1 cursor-pointer rounded-md border-[0.7px] border-gray-100 ${RideactiveTab === tab.key ? "bg-orange-600 text-white" : "bg-white"}`}>
//               <div className="font-semibold">{tab.title}</div>
//               <div className="text-xs">
//                 {tab.count} {tab.key === "completed" ? "trips" : "bookings"}
//               </div>
//             </div>
//           ))}
//         </div>

        
//         <DataTable
//           title={`${activeTab.toUpperCase()} Bookings`}
//           columns={columns}
//           dataSource={BookingData}
//           loading={loading}
//           pagination={{
//             ...pagination,
//             showTotal: (total) => `Total ${total} bookings`,
//           }}
//           onChange={handleTableChange}
//           showSearch
//           onSearch={setSearch}
//         />
//       </div>

//       {/* Booking Details Modal */}
//       <Modal
//         open={modalVisible}
//         title="Booking Details"
//         footer={null}
//         onCancel={() => setModalVisible(false)}
//         width={800}
//       >
//         {selectedBooking ? (
//           <Descriptions bordered column={2} size="small">
//             {Object.entries(selectedBooking).map(([key, value]) => (
//               <Descriptions.Item label={key} key={key}>
//                 {typeof value === "object"
//                   ? JSON.stringify(value, null, 2)
//                   : String(value)}
//               </Descriptions.Item>
//             ))}
//           </Descriptions>
//         ) : (
//           <p>No data available.</p>
//         )}
//       </Modal>

//       {/* JSON Modal */}
//       <Modal
//         open={jsonModalVisible}
//         title="Booking JSON"
//         footer={null}
//         onCancel={() => setJsonModalVisible(false)}
//         width={800}
//       >
//         <pre
//           style={{
//             background: "#f8f8f8",
//             padding: "10px",
//             borderRadius: "4px",
//           }}
//         >
//           {JSON.stringify(selectedBooking, null, 2)}
//         </pre>
//       </Modal>
//     </div>
//   );
// };

// export default TodayAllPickups;
