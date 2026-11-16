// import PageMeta from "../../components/common/PageMeta";
// import { Card, Row, Col } from "antd";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip,
//   Legend,
//   XAxis,
//   YAxis,
//   BarChart,
//   Bar,
// } from "recharts";
// import { UseLineChart } from "../charts/LineChart";



// const COLORS = ["#4A90E2", "#E74C3C", "#F1C40F"];



// // Conversion
// const conversionData = [
//   { name: "Converted", value: 78.5 },
//   { name: "Cancelled", value: 21.5 },
// ];

// // Trip Type
// const tripTypeData = [
//   { name: "Arrival", value: 43.8 },
//   { name: "Departure", value: 56.2 },
// ];

// // Cab Type – Departure
// const departureCab = [
//   { name: "Hatchback", value: 10.1 },
//   { name: "Sedan", value: 81 },
//   { name: "SUV", value: 8.9 },
// ];

// // Cab Type – Arrival
// const arrivalCab = [
//   { name: "Hatchback", value: 14.1 },
//   { name: "Sedan", value: 75.8 },
//   { name: "SUV", value: 10.1 },
// ];

// // State wise
// const stateData = [
//   { state: "Karnataka", value: 18 },
//   { state: "Telangana", value: 17 },
//   { state: "Delhi (NCT)", value: 16 },
//   { state: "Maharashtra", value: 11 },
//   { state: "Tamil Nadu", value: 9 },
// ];

// // Avg Booking
// const avgBooking = [
//   { name: "Last 30 Days", value: 44 },
//   { name: "Last 14 Days", value: 45 },
//   { name: "Last 7 Days", value: 52 },
// ];


// const GraphsWrapper = ({ propsData }: any) => {
//   const type = propsData.type;

//   return (
//     <>
//       <PageMeta title={`${type} Analytics`} description="Static Analytics" />

//       <div className="p-4 space-y-6">

//         {/* GMV  */}
//         {type === "GMV" && (
//           <UseLineChart title={'Cumulative GMV Trend (Day-wise)'}/>
//         )}

//         {/*  CAB Type */}
//         {type === "CAB_TYPE" && (
//           <Row gutter={16}>
//             <Col span={12}>
//               <Card title="Departure Rides">
//                 <PieChart width={350} height={300}>
//                   <Pie data={departureCab} dataKey="value" label>
//                     {departureCab.map((_, i) => (
//                       <Cell key={i} fill={COLORS[i]} />
//                     ))}
//                   </Pie>
//                   <Legend />
//                 </PieChart>
//               </Card>
//             </Col>

//             <Col span={12}>
//               <Card title="Arrival Rides">
//                 <PieChart width={350} height={300}>
//                   <Pie data={arrivalCab} dataKey="value" label>
//                     {arrivalCab.map((_, i) => (
//                       <Cell key={i} fill={COLORS[i]} />
//                     ))}
//                   </Pie>
//                   <Legend />
//                 </PieChart>
//               </Card>
//             </Col>
//           </Row>
//         )}

//         {/* TRIP Type */}
//         {type === "TRIP_TYPE" && (
//           <>
//           <div className="flex gap-3">

//             <Card title="Conversion vs Cancellation">
//               <PieChart width={400} height={300}>
//                 <Pie data={conversionData} dataKey="value" label>
//                   {conversionData.map((_, i) => (
//                     <Cell key={i} fill={COLORS[i]} />
//                   ))}
//                 </Pie>
//                 <Legend />
//               </PieChart>
//             </Card>

//             <Card title="Breakup of Travel Type">
//               <PieChart width={400} height={300}>
//                 <Pie data={tripTypeData} dataKey="value" label>
//                   {tripTypeData.map((_, i) => (
//                     <Cell key={i} fill={COLORS[i]} />
//                   ))}
//                 </Pie>
//                 <Legend />
//               </PieChart>
//             </Card>
//                   </div>
//           </>
//         )}

//         {/*  STATE Wise */}
//         <Card title="State Wise – Ride Value" style={{marginBottom:"20px",marginTop : "20px"}}>
//           <BarChart width={800} height={300} data={stateData} layout="vertical">
//             <XAxis type="number" />
//             <YAxis dataKey="state" type="category" />
//             <Tooltip />
//             <Bar dataKey="value" fill="#4A90E2" />
//           </BarChart>
//         </Card>

//         {/*  Daily Avg */}

//         <Card title="Daily Average Booking" className="mt-4">
//           <BarChart width={600} height={300} data={avgBooking}>
//             <XAxis dataKey="name" />
//             <YAxis />
//             <Tooltip />
//             <Bar dataKey="value" fill="#F1C40F" />
//           </BarChart>
//         </Card>

//       </div>
//     </>
//   );
// };

// export default GraphsWrapper;



// import { useEffect, useRef, useState } from "react";
// import PageMeta from "../../components/common/PageMeta";
// import { Card, Row, Col, Spin, Empty, Button } from "antd";
// import { ReloadOutlined } from "@ant-design/icons";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip,
//   Legend,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   LabelList,
// } from "recharts";

// import {
//   GET_CUSTOM_BOOKING_STATISTICS,
//   GET_BOOKING_STATISTICSV2,
//   GET_LIVE_CITIES_LIST,
// } from "../../config/customerCare/operationsApicall";

// import { RangerPicker as DateRangePicker} from "../common/RangePicker";
// import { AvailablecabPartners } from "../../config/customerCare/constant";
// import dayjs from "dayjs";

// const COLORS = ["#4A90E2", "#E74C3C", "#F1C40F", "#2ECC71", "#9B59B6"];

// const GraphsWrapper = ({ propsData }: any) => {
//   const type = propsData.type;

//   const today = dayjs().format("YYYY-MM-DD");
//   const [dateRange, setDateRange] = useState<[string, string]>([today, today]);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Graph states
//   const [gmvData, setGmvData] = useState<any[]>([]);
//   const [departureCabData, setDepartureCabData] = useState<any[]>([]);
//   const [arrivalCabData, setArrivalCabData] = useState<any[]>([]);
//   const [conversionData, setConversionData] = useState<any[]>([]);
//   const [tripTypeData, setTripTypeData] = useState<any[]>([]);

//   // Top & bottom tabs
//   const [topStats, setTopStats] = useState<
//     { label: string; value: number }[]
//   >([]);
//   const [bottomStats, setBottomStats] = useState<
//     { label: string; value: string }[]
//   >([]);

//   // City & partner filters
//   const [cities, setCities] = useState<any[]>([]);
//   const [filteredCities, setFilteredCities] = useState<any[]>([]);
//   const [selectedCity, setSelectedCity] = useState<any | null>(null);

//   const [selectedCabPartner, setSelectedCabPartner] =
//     useState<string | null>(null);

//   const [open, setOpen] = useState(false);
//   const [citySearch, setCitySearch] = useState("");
//   const dropdownRef = useRef<HTMLDivElement | null>(null);

//   const getDate = (range: [string, string]) => {
//     setDateRange(range);
//   };

//   // ------------------ City list ------------------
//   useEffect(() => {
//     const fetchCities = async () => {
//       try {
//         const response: any[] = await GET_LIVE_CITIES_LIST();
//         const filtered = response.filter(
//           (obj) => obj.is_departure === 1 || obj.is_arrival === 1
//         );
//         setCities(filtered);
//         setFilteredCities(filtered);
//       } catch (e) {
//         console.log(e);
//       }
//     };
//     fetchCities();
//   }, []);

//   useEffect(() => {
//     const result = cities.filter((city) =>
//       city.name.toLowerCase().includes(citySearch.toLowerCase())
//     );
//     setFilteredCities(result);
//   }, [citySearch, cities]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (
//         dropdownRef.current &&
//         !dropdownRef.current.contains(event.target as Node)
//       ) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () =>
//       document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // ------------------ Main trigger ------------------
//   useEffect(() => {
//     fetchGraphData();
//   }, [type, dateRange, selectedCity, selectedCabPartner]);

//   // ------------------ Helpers ------------------
//   const mergeStats = (data: any[]) => {
//     return data.reduce(
//       (acc, curr) => {
//         acc.payment_initiated += Number(curr?.payment_initiated ?? 0);
//         acc.booking_confirmed += Number(curr?.booking_confirmed ?? 0);
//         acc.booking_cancelled += Number(curr?.booking_cancelled ?? 0);
//         acc.booking_completed += Number(curr?.booking_completed ?? 0);
//         acc.booking_failed += Number(curr?.booking_failed ?? 0);
//         acc.completed_gmv += Number(curr?.completed_gmv ?? 0);
//         acc.completed_base_fare += Number(curr?.completed_base_fare ?? 0);
//         acc.total_refund_amount += Number(curr?.total_refund_amount ?? 0);
//         acc.refund_count += Number(curr?.refund_count ?? 0);
//         return acc;
//       },
//       {
//         payment_initiated: 0,
//         booking_confirmed: 0,
//         booking_cancelled: 0,
//         booking_completed: 0,
//         booking_failed: 0,
//         completed_gmv: 0,
//         completed_base_fare: 0,
//         total_refund_amount: 0,
//         refund_count: 0,
//       }
//     );
//   };

//   // ------------------ TOP TABS API ------------------
//   const fetchTopTabsData = async () => {
//     let query: any = {
//       date: dateRange[0],
//       endDate: dateRange[1],
//     };

//     if (selectedCabPartner) {
//       query.groupByCabPartner = true;
//       query.cabPartner = selectedCabPartner;
//     }

//     if (selectedCity) {
//       query.groupByCityCode = true;
//       query.cityCode = selectedCity.code;
//     }

//     const respon: any = await GET_BOOKING_STATISTICSV2("indigo", query);

//     const merged = mergeStats(Array.isArray(respon) ? respon : []);

//     setTopStats([
//       { label: "Payment Initiated", value: merged.payment_initiated || 0 },
//       { label: "Booking Confirmed", value: merged.booking_confirmed || 0 },
//       { label: "Booking Cancelled", value: merged.booking_cancelled || 0 },
//       { label: "Booking Completed", value: merged.booking_completed || 0 },
//       { label: "Booking Failed", value: merged.booking_failed || 0 },
//       {
//         label: "Total Refund Amount",
//         value: Number(merged.total_refund_amount || 0),
//       },
//       { label: "Refund Count", value: merged.refund_count || 0 },
//     ]);

//     setBottomStats([
//       {
//         label: "BASE FARE GMV",
//         value: Number(merged.completed_base_fare || 0).toFixed(2),
//       },
//       {
//         label: "TOTAL GMV",
//         value: Number(merged.completed_gmv || 0).toFixed(2),
//       },
//       {
//         label: "indigo Share 2.5%",
//         value: ((merged.completed_base_fare || 0) * 0.025).toFixed(2),
//       },
//       {
//         label: "indigo Share 5%",
//         value: ((merged.completed_base_fare || 0) * 0.05).toFixed(2),
//       },
//     ]);
//   };

//   // ------------------ MAIN FETCH ------------------
//   const fetchGraphData = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       await fetchTopTabsData();

//       if (type === "GMV") await fetchGMVData();
//       else if (type === "CAB_TYPE") await fetchCabTypeData();
//       else if (type === "TRIP_TYPE") await fetchTripTypeData();
//     } catch (err: any) {
//       console.error(err);
//       setError("Failed to fetch data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------------------ GMV ------------------
//   const fetchGMVData = async () => {
//     let query: any = {
//       reportType: "conversion",
//       from: dateRange[0],
//       to: dateRange[1],
//       timeField: "createdAt",
//     };

//     if (selectedCabPartner) query.cabPartner = selectedCabPartner;
//     if (selectedCity) query.cityCode = selectedCity.code;

//     const response = await GET_CUSTOM_BOOKING_STATISTICS("indigo", query);

//     const data = Array.isArray(response) ? response : [];

//     const formattedData = data.map((item: any) => ({
//       date: item.date,
//       converted: item.converted || 0,
//       cancelled: item.cancelled || 0,
//       conversion_percentage: parseFloat(item.conversion_percentage || "0"),
//     }));

//     formattedData.sort(
//       (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
//     );

//     setGmvData(formattedData);
//   };

//   // ------------------ CAB TYPE ------------------
//   const fetchCabTypeData = async () => {
//     let query: any = {
//       reportType: "vehicleSplit",
//       from: dateRange[0],
//       to: dateRange[1],
//       timeField: "createdAt",
//     };

//     if (selectedCabPartner) query.cabPartner = selectedCabPartner;
//     if (selectedCity) query.cityCode = selectedCity.code;

//     const response = await GET_CUSTOM_BOOKING_STATISTICS("indigo", query);

//     const data = Array.isArray(response) ? response : [];

//     const departure = data
//       .filter((i: any) => i.travelType === "departure")
//       .map((i: any) => ({
//         name: i.vehicleType,
//         value: i.count,
//       }));

//     const arrival = data
//       .filter((i: any) => i.travelType === "arrival")
//       .map((i: any) => ({
//         name: i.vehicleType,
//         value: i.count,
//       }));

//     setDepartureCabData(departure);
//     setArrivalCabData(arrival);
//   };

//   // ------------------ TRIP TYPE ------------------
//   const fetchTripTypeData = async () => {
//     let baseQuery: any = {
//       from: dateRange[0],
//       to: dateRange[1],
//       timeField: "createdAt",
//     };

//     if (selectedCabPartner) baseQuery.cabPartner = selectedCabPartner;
//     if (selectedCity) baseQuery.cityCode = selectedCity.code;

//     const conversionResponse = await GET_CUSTOM_BOOKING_STATISTICS(
//       "indigo",
//       { ...baseQuery, reportType: "conversion" }
//     );

//     const arr = Array.isArray(conversionResponse)
//       ? conversionResponse
//       : [];

//     const totalConverted = arr.reduce(
//       (s: number, i: any) => s + (i.converted || 0),
//       0
//     );
//     const totalCancelled = arr.reduce(
//       (s: number, i: any) => s + (i.cancelled || 0),
//       0
//     );

//     setConversionData([
//       { name: "Converted", value: totalConverted },
//       { name: "Cancelled", value: totalCancelled },
//     ]);

//     const travelTypeResponse = await GET_CUSTOM_BOOKING_STATISTICS(
//       "indigo",
//       { ...baseQuery, reportType: "travelType" }
//     );

//     const tarr = Array.isArray(travelTypeResponse)
//       ? travelTypeResponse
//       : [];

//     const totalArrival = tarr
//       .filter((i: any) => i.travelType === "arrival")
//       .reduce((s: number, i: any) => s + (i.totalBookings || 0), 0);

//     const totalDeparture = tarr
//       .filter((i: any) => i.travelType === "departure")
//       .reduce((s: number, i: any) => s + (i.totalBookings || 0), 0);

//     setTripTypeData([
//       { name: "Arrival", value: totalArrival },
//       { name: "Departure", value: totalDeparture },
//     ]);
//   };

//   // ------------------ UI ------------------
//   return (
//     <>
//       <PageMeta title={`${type} Analytics`} description="Dynamic Analytics" />

//       <div className="p-4 space-y-6">
//         {/* Filters */}
//         <div className="w-full p-6 bg-gray-50 rounded-xl">
//           <div className="flex flex-wrap gap-6 items-end">
//             {/* Date */}
//             <div>
//               < DateRangePicker
//                 updateDate={[dateRange[0], dateRange[1]]}
//                 selectedRange={getDate}
//               />
//               <p className="text-[12px] mt-1">
//                 {dateRange[0]} → {dateRange[1]}
//               </p>
//             </div>
//            {/* <DateRangePicker
//               updateDate={[dateRange[0], dateRange[1]]}
//               selectedRange={getDate}
//             /> */}
//             {/* <p className="text-[12px]">
//               {`Selected Range : ${dateRange[0]} to ${dateRange[1]}`}
//             </p>
//           <Button 
//             icon={<ReloadOutlined />} 
//             onClick={fetchGraphData}
//             loading={loading}

//           >
//             Refresh
//           </Button> */}

//             {/* City */}
//             <div ref={dropdownRef} className="relative w-56">
//               <p className="text-xs mb-1 text-gray-600">City</p>
//               <div
//                 className="rounded-xl px-3 py-2.5 text-sm cursor-pointer bg-white border h-10 flex justify-between items-center"
//                 onClick={() => setOpen((p) => !p)}
//               >
//                 <span className="truncate">
//                   {selectedCity?.name || "Select city"}
//                 </span>
//                 <span className="text-xs">▼</span>
//               </div>

//               {open && (
//                 <div className="absolute z-30 w-full bg-white border mt-1 rounded-xl shadow-lg overflow-hidden">
//                   <input
//                     type="text"
//                     placeholder="Search city..."
//                     className="w-full px-3 py-2 text-sm border-b outline-none"
//                     value={citySearch}
//                     onChange={(e) =>
//                       setCitySearch(e.target.value)
//                     }
//                   />
//                   <ul className="max-h-52 overflow-auto">
//                     {filteredCities.map((city) => (
//                       <li
//                         key={city.id}
//                         className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
//                         onClick={() => {
//                           setSelectedCity(city);
//                           setOpen(false);
//                           setCitySearch("");
//                         }}
//                       >
//                         {city.name}
//                       </li>
//                     ))}
//                     {filteredCities.length === 0 && (
//                       <li className="px-3 py-2 text-sm text-gray-400">
//                         No city found
//                       </li>
//                     )}
//                   </ul>
//                 </div>
//               )}
//             </div>

//             {/* Cab partner */}
//             <div className="w-48">
//               <p className="text-xs mb-1 text-gray-600">Cab Partner</p>
//               <select
//                 className="rounded-xl px-3 py-2.5 w-full text-sm bg-white border h-10"
//                 value={selectedCabPartner || ""}
//                 onChange={(e) =>
//                   setSelectedCabPartner(
//                     e.target.value || null
//                   )
//                 }
//               >
//                 <option value="">All Partners</option>
//                 {AvailablecabPartners.map((p) => (
//                   <option key={p} value={p}>
//                     {p}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <Button
//               icon={<ReloadOutlined />}
//               onClick={fetchGraphData}
//               loading={loading}
//               className="ml-auto"
//             >
//               Refresh
//             </Button>
//           </div>
//         </div>

//         {/* Top / Bottom tabs */}
//         {topStats.length > 0 && (
//           <>
//             <div className="flex flex-wrap gap-4">
//               {topStats.map((item, i) => (
//                 <div
//                   key={i}
//                   className="flex-1 min-w-[140px] max-w-[200px] rounded-2xl bg-slate-50 p-5 shadow-sm border"
//                 >
//                   <p className="text-xs font-medium text-gray-600 uppercase">
//                     {item.label}
//                   </p>
//                   <p className="text-xl font-bold mt-1 text-gray-900">
//                     {item.label === "Total Refund Amount"
//                       ? item.value.toFixed(2)
//                       : item.value}
//                   </p>
//                 </div>
//               ))}
//             </div>

//             <div className="flex flex-wrap gap-4">
//               {bottomStats.map((item, i) => (
//                 <div
//                   key={i}
//                   className="flex-1 min-w-[160px] rounded-2xl bg-indigo-50 p-6 shadow-sm border"
//                 >
//                   <p className="text-xs font-medium text-gray-600 uppercase">
//                     {item.label}
//                   </p>
//                   <p className="text-2xl font-bold mt-2 text-gray-900">
//                     {item.value}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}

//         {error && !loading && (
//           <Card>
//             <div style={{ color: "red" }}>{error}</div>
//           </Card>
//         )}

//         {loading ? (
//           <div className="text-center py-10">
//             <Spin size="large" />
//           </div>
//         ) : (
//           <>
//             {/* GMV */}
//             {type === "GMV" && (
//               <Card title="Clicks Stack Graph (Day-wise)">
//                 {gmvData.length === 0 ? (
//                   <Empty />
//                 ) : (
//                   <ResponsiveContainer
//                     width="100%"
//                     height={420}
//                   >
//                     <BarChart
//                       data={gmvData}
//                       margin={{
//                         top: 20,
//                         right: 40,
//                         left: 10,
//                         bottom: 60,
//                       }}
//                     >
//                       <CartesianGrid strokeDasharray="3 3" />
//                       <XAxis
//                         dataKey="date"
//                         angle={-45}
//                         textAnchor="end"
//                         height={70}
//                       />
//                       <YAxis yAxisId="left" />
//                       <YAxis
//                         yAxisId="right"
//                         orientation="right"
//                         domain={[0, 100]}
//                       />
//                       <Tooltip />
//                       <Legend />

//                       <Bar
//                         yAxisId="left"
//                         dataKey="converted"
//                         stackId="a"
//                         fill="#5c5f66"
//                         name="Converted"
//                       >
//                         <LabelList
//                           dataKey="converted"
//                           position="center"
//                           fill="#fff"
//                         />
//                       </Bar>

//                       <Bar
//                         yAxisId="left"
//                         dataKey="cancelled"
//                         stackId="a"
//                         fill="#7b1d1d"
//                         name="Cancelled"
//                       >
//                         <LabelList
//                           dataKey="cancelled"
//                           position="center"
//                           fill="#fff"
//                         />
//                       </Bar>

//                       <Bar
//                         yAxisId="right"
//                         dataKey="conversion_percentage"
//                         stackId="b"
//                         fill="#2ECC71"
//                         name="Conversion %"
//                         barSize={14}
//                       >
//                         <LabelList
//                           dataKey="conversion_percentage"
//                           position="top"
//                           formatter={(v: any) => `${v}%`}
//                           fill="#2ECC71"
//                         />
//                       </Bar>
//                     </BarChart>
//                   </ResponsiveContainer>
//                 )}
//               </Card>
//             )}

//             {/* CAB TYPE */}
//             {type === "CAB_TYPE" && (
//               <Row gutter={16}>
//                 <Col xs={24} lg={12}>
//                   <Card title="Departure Rides">
//                     {departureCabData.length === 0 ? (
//                       <Empty />
//                     ) : (
//                       <ResponsiveContainer
//                         width="100%"
//                         height={300}
//                       >
//                         <PieChart>
//                           <Pie
//                             data={departureCabData}
//                             dataKey="value"
//                             nameKey="name"
//                             cx="50%"
//                             cy="50%"
//                             label
//                             outerRadius={90}
//                           >
//                             {departureCabData.map(
//                               (_: any, i: number) => (
//                                 <Cell
//                                   key={i}
//                                   fill={
//                                     COLORS[
//                                       i % COLORS.length
//                                     ]
//                                   }
//                                 />
//                               )
//                             )}
//                           </Pie>
//                           <Tooltip />
//                           <Legend />
//                         </PieChart>
//                       </ResponsiveContainer>
//                     )}
//                   </Card>
//                 </Col>

//                 <Col xs={24} lg={12}>
//                   <Card title="Arrival Rides">
//                     {arrivalCabData.length === 0 ? (
//                       <Empty />
//                     ) : (
//                       <ResponsiveContainer
//                         width="100%"
//                         height={300}
//                       >
//                         <PieChart>
//                           <Pie
//                             data={arrivalCabData}
//                             dataKey="value"
//                             nameKey="name"
//                             cx="50%"
//                             cy="50%"
//                             label
//                             outerRadius={90}
//                           >
//                             {arrivalCabData.map(
//                               (_: any, i: number) => (
//                                 <Cell
//                                   key={i}
//                                   fill={
//                                     COLORS[
//                                       i % COLORS.length
//                                     ]
//                                   }
//                                 />
//                               )
//                             )}
//                           </Pie>
//                           <Tooltip />
//                           <Legend />
//                         </PieChart>
//                       </ResponsiveContainer>
//                     )}
//                   </Card>
//                 </Col>
//               </Row>
//             )}

//             {/* TRIP TYPE */}
//             {type === "TRIP_TYPE" && (
//               <div className="flex gap-3 flex-wrap">
//                 <Card
//                   title="Conversion vs Cancellation"
//                   style={{
//                     flex: 1,
//                     minWidth: 350,
//                   }}
//                 >
//                   {conversionData.length === 0 ? (
//                     <Empty />
//                   ) : (
//                     <ResponsiveContainer
//                       width="100%"
//                       height={300}
//                     >
//                       <PieChart>
//                         <Pie
//                           data={conversionData}
//                           dataKey="value"
//                           nameKey="name"
//                           cx="50%"
//                           cy="50%"
//                           label
//                           outerRadius={90}
//                         >
//                           {conversionData.map(
//                             (_: any, i: number) => (
//                               <Cell
//                                 key={i}
//                                 fill={
//                                   COLORS[
//                                     i % COLORS.length
//                                   ]
//                                 }
//                               />
//                             )
//                           )}
//                         </Pie>
//                         <Tooltip />
//                         <Legend />
//                       </PieChart>
//                     </ResponsiveContainer>
//                   )}
//                 </Card>

//                 <Card
//                   title="Breakup of Travel Type"
//                   style={{
//                     flex: 1,
//                     minWidth: 350,
//                   }}
//                 >
//                   {tripTypeData.length === 0 ? (
//                     <Empty />
//                   ) : (
//                     <ResponsiveContainer
//                       width="100%"
//                       height={300}
//                     >
//                       <PieChart>
//                         <Pie
//                           data={tripTypeData}
//                           dataKey="value"
//                           nameKey="name"
//                           cx="50%"
//                           cy="50%"
//                           label
//                           outerRadius={90}
//                         >
//                           {tripTypeData.map(
//                             (_: any, i: number) => (
//                               <Cell
//                                 key={i}
//                                 fill={
//                                   COLORS[
//                                     i % COLORS.length
//                                   ]
//                                 }
//                               />
//                             )
//                           )}
//                         </Pie>
//                         <Tooltip />
//                         <Legend />
//                       </PieChart>
//                     </ResponsiveContainer>
//                   )}
//                 </Card>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </>
//   );
// };

// export default GraphsWrapper;



import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Card, Spin, Empty, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
  Tooltip,
  Legend,
} from "recharts";

import {
  GET_CUSTOM_BOOKING_STATISTICS,
  GET_BOOKING_STATISTICSV2,
  GET_BOOKING_DAILY_COUNTS,
  GET_LIVE_CITIES_LIST,
} from "../../config/customerCare/operationsApicall";

import { RangerPicker as DateRangePicker } from "../common/RangePicker";
import { AvailablecabPartners } from "../../config/customerCare/constant";
import dayjs from "dayjs";

// const COLORS = ["#4A90E2", "#E74C3C", "#F1C40F", "#2ECC71", "#9B59B6"];

const GraphsWrapper = ({ propsData }: any) => {
  const type = propsData.type;

  const today = dayjs().format("YYYY-MM-DD");
  const [dateRange, setDateRange] = useState<[string, string]>([today, today]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Naya state: Kaunsa tab currently active hai (Default: Converted)
  const [activeTab, setActiveTab] = useState<string>("converted");

  // Chart data aur totals ka state
  const [chartData, setChartData] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    total_confirmed_fare: 0,
    total_Booking: 0,
    base_gmv: 0,
    total_gmv: 0,
    cancelled: 0,
    converted: 0,
    conversion_percentage: 0,
  });

  // Filters state
  const [cities, setCities] = useState<any[]>([]);
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any | null>(null);
  const [selectedCabPartner, setSelectedCabPartner] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const getDate = (range: [string, string]) => {
    setDateRange(range);
  };

  // City list API
  // useEffect(() => {
  //   const fetchCities = async () => {
  //     try {
  //       const response: any[] = await GET_LIVE_CITIES_LIST();
  //       const filtered = response.filter(
  //         (obj) => obj.is_departure === 1 || obj.is_arrival === 1
  //       );
  //       setCities(filtered);
  //       setFilteredCities(filtered);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   };
  //   fetchCities();
  // }, []);

  useEffect(() => {
  const fetchCities = async () => {
    try {
      const response: any[] = await GET_LIVE_CITIES_LIST("indigo");
      const mapped = response.map((obj) => ({
        ...obj,
        name: `${obj.sourceCity} - ${obj.airportCode} (${obj.terminalId})`,
        code: obj.airportCode,
      }));
      setCities(mapped);
      setFilteredCities(mapped);
    } catch (e) {
      console.log(e);
    }
  };
  fetchCities();
}, []);

  useEffect(() => {
    const result = cities.filter((city) =>
      city.name.toLowerCase().includes(citySearch.toLowerCase())
    );
    setFilteredCities(result);
  }, [citySearch, cities]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Main trigger
  useEffect(() => {
    if (type === "GMV") {
      fetchGraphData();
    }
  }, [type, dateRange, selectedCity, selectedCabPartner]);

  // ------------------ MAIN API FETCH (MERGED LOGIC) ------------------
  const fetchGraphData = async () => {
    setLoading(true);
    setError(null);

    // 1. Stats & Daily API ke liye
    let statsQuery: any = {
      date: dateRange[0],
      endDate: dateRange[1],
    };
    if (selectedCabPartner) {
      statsQuery.groupByCabPartner = true;
      statsQuery.cabPartner = selectedCabPartner;
    }
    if (selectedCity) {
      statsQuery.groupByCityCode = true;
      statsQuery.cityCode = selectedCity.code;
    }

    // 2. Conversion API ke liye
    let customQuery: any = {
      from: dateRange[0],
      to: dateRange[1],
      timeField: "createdAt",
      reportType: "conversion",
    };
    if (selectedCabPartner) customQuery.cabPartner = selectedCabPartner;
    if (selectedCity) customQuery.cityCode = selectedCity.code;

    // 3. Nayi API - Fare Searches ke liye
    let fareSearchQuery: any = {
      from: dateRange[0],
      to: dateRange[1],
      reportType: "seven_day_fare_search_conversion",
    };
    if (selectedCabPartner) fareSearchQuery.cabPartner = selectedCabPartner;
    if (selectedCity) fareSearchQuery.cityCode = selectedCity.code;

    try {
      // Charo APIs ko ek sath call kiya
      const [statsRes, dailyRes, conversionRes, fareSearchRes] = await Promise.all([
        GET_BOOKING_STATISTICSV2("indigo", statsQuery),
        GET_BOOKING_DAILY_COUNTS("indigo", statsQuery),
        GET_CUSTOM_BOOKING_STATISTICS("indigo", customQuery),
        GET_CUSTOM_BOOKING_STATISTICS("indigo", fareSearchQuery), // Nayi API yahan call hui
      ]);

      const statsData = Array.isArray(statsRes) ? statsRes : [];
      const dailyData = Array.isArray(dailyRes) ? dailyRes : [];
      const convData = Array.isArray(conversionRes) ? conversionRes : [];
      const fareSearchData = Array.isArray(fareSearchRes) ? fareSearchRes : []; // Naya Data Array

      const dateMap: any = {};

      let startDateLoop = dayjs(dateRange[0]);
      let endDateLoop = dayjs(dateRange[1]);

      while (startDateLoop.isBefore(endDateLoop) || startDateLoop.isSame(endDateLoop, 'day')) {
        const dateString = startDateLoop.format("YYYY-MM-DD");
        dateMap[dateString] = {
          date: dateString,
          total_confirmed_fare: 0,
          total_Booking: 0,
          base_gmv: 0,
          total_gmv: 0,
          cancelled: 0,
          converted: 0,
          conversion_percentage: 0,
        };
        startDateLoop = startDateLoop.add(1, "day"); // Ek din aage badhao
      }

      const initDate = (d: string) => {
        if (!dateMap[d]) {
          dateMap[d] = {
            date: d,
            total_confirmed_fare: 0,
            total_Booking: 0,
            base_gmv: 0,
            total_gmv: 0,
            cancelled: 0,
            converted: 0,
            conversion_percentage: 0,
          };
        }
      };

      // 1. STATS API se ab sirf Booking nikalenge
      statsData.forEach((item: any) => {
        const targetDate = item.date || item.day || dateRange[0];
        initDate(targetDate);
        dateMap[targetDate].total_Booking += Number(item.booking_confirmed || item.total_bookings || 0);
      });

      // 2. DAILY COUNTS API se GMV nikalna
      dailyData.forEach((item: any) => {
        const targetDate = item.date || item.day || dateRange[0];
        initDate(targetDate);
        dateMap[targetDate].base_gmv += Number(item.base_fare_gmv || item.base_gmv || 0);
        dateMap[targetDate].total_gmv += Number(item.total_gmv || 0);
      });

      // 3. CONVERSION API
      convData.forEach((item: any) => {
        const targetDate = item.date || item.day || dateRange[0];
        initDate(targetDate);
        dateMap[targetDate].cancelled += Number(item.cancelled || 0);
        dateMap[targetDate].converted += Number(item.converted || 0);
        dateMap[targetDate].conversion_percentage = parseFloat(item.conversion_percentage || "0");
      });

      // 4. FARE SEARCHES API (Naya Logic)
      fareSearchData.forEach((item: any) => {
        const targetDate = item.date || item.day || dateRange[0];
        initDate(targetDate);
        // Fare searches ko Total Confirmed Fare variable me dal diya
        dateMap[targetDate].total_confirmed_fare += Number(item.fare_searches || 0);
      });

      // Date ke hisab se sort kiya
      const mergedArray = Object.values(dateMap).sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setChartData(mergedArray);

      // Har tab ka total calculate kiya
      const calculatedTotals: any = mergedArray.reduce(
        (acc: any, curr: any) => {
          acc.total_confirmed_fare += curr.total_confirmed_fare || 0;
          acc.total_Booking += curr.total_Booking || 0;
          acc.base_gmv += curr.base_gmv || 0;
          acc.total_gmv += curr.total_gmv || 0;
          acc.cancelled += curr.cancelled || 0;
          acc.converted += curr.converted || 0;
          return acc;
        },
        {
          total_confirmed_fare: 0,
          total_Booking: 0,
          base_gmv: 0,
          total_gmv: 0,
          cancelled: 0,
          converted: 0,
          conversion_percentage: 0,
        }
      );

      // Overall average conversion % logic
      if (calculatedTotals.converted + calculatedTotals.cancelled > 0) {
        calculatedTotals.conversion_percentage =
          (calculatedTotals.converted /
            (calculatedTotals.converted + calculatedTotals.cancelled)) *
          100;
      }

      setTotals(calculatedTotals);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ UI Configs ------------------
  // Tabs array mapped for easy rendering
  const tabConfig = [
    { key: "total_confirmed_fare", label: "Fare Serach ", format: (v: number) => `₹${v.toFixed(2)}`, color: "#4A90E2" },
    { key: "total_Booking", label: "Total Booking", format: (v: number) => v, color: "#8E44AD" },
    { key: "converted", label: "Converted", format: (v: number) => v, color: "#2ECC71" },
    { key: "cancelled", label: "Cancelled", format: (v: number) => v, color: "#E74C3C" },
    { key: "conversion_percentage", label: "Conversion %", format: (v: number) => `${v.toFixed(2)}%`, color: "#16A085" },
    { key: "base_gmv", label: "Base GMV", format: (v: number) => `₹${v.toFixed(2)}`, color: "#E67E22" },
    { key: "total_gmv", label: "Total GMV", format: (v: number) => `₹${v.toFixed(2)}`, color: "#D35400" },
  ];

  // Active tab ki details nikalna graph color aur formatting ke liye
  const activeTabData = tabConfig.find(t => t.key === activeTab);

  return (
    <>
      <PageMeta title={`${type} Analytics`} description="Dynamic Analytics" />

      <div className="p-4 space-y-6">
        {/* Filters */}

        <div className="w-full p-5 bg-gray-50 rounded-xl">
          <div className="flex flex-wrap items-end gap-6">

            {/* 1. Date Range */}
            <div className="flex flex-col">
              <label className="text-xs mb-1 text-gray-600 font-medium">Date Range</label>
              <div className="h-10 flex items-center">
                <DateRangePicker updateDate={[dateRange[0], dateRange[1]]} selectedRange={getDate} />
              </div>
            </div>

            {/* 2. City Dropdown */}
            <div ref={dropdownRef} className="relative w-56 flex flex-col">
              <label className="text-xs mb-1 text-gray-600 font-medium">City</label>
              <div
                className="rounded-xl px-3 py-2 text-sm cursor-pointer bg-white border h-10 flex justify-between items-center"
                onClick={() => setOpen((p) => !p)}
              >
                <span className="truncate">{selectedCity?.name || "Select city"}</span>
                <span className="text-xs">▼</span>
              </div>
              {open && (
                <div className="absolute top-[60px] z-30 w-full bg-white border rounded-xl shadow-lg overflow-hidden">
                  <input
                    type="text"
                    placeholder="Search city..."
                    className="w-full px-3 py-2 text-sm border-b outline-none"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                  <ul className="max-h-52 overflow-auto">
                    {filteredCities.map((city) => (
                      <li
                        key={city.id}
                        className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setSelectedCity(city);
                          setOpen(false);
                          setCitySearch("");
                        }}
                      >
                        {city.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 3. Cab Partner */}
            <div className="w-48 flex flex-col">
              <label className="text-xs mb-1 text-gray-600 font-medium">Cab Partner</label>
              <select
                className="rounded-xl px-3 py-2 w-full text-sm bg-white border h-10 outline-none"
                value={selectedCabPartner || ""}
                onChange={(e) => setSelectedCabPartner(e.target.value || null)}
              >
                <option value="">All Partners</option>
                {AvailablecabPartners.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 4. Refresh Button */}
            <Button icon={<ReloadOutlined />} onClick={fetchGraphData} loading={loading} className="ml-auto h-10 rounded-xl font-medium">
              Refresh
            </Button>

          </div>
        </div>

        {/* CLICKABLE TABS (Cards) - All in ONE LINE & Smaller Size */}
        <div className="flex flex-nowrap w-full overflow-x-auto gap-3 pb-2 scrollbar-hide">
          {tabConfig.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              // Width ko thoda kam kiya (min-w-[120px]), padding kam ki (p-4), aur shrink hone se roka (shrink-0) taaki ek line me aaye
              className={`flex-1 shrink-0 min-w-[130px] rounded-xl p-4 shadow-sm border cursor-pointer transition-all duration-200 
                ${activeTab === tab.key
                  ? 'bg-blue-50 border-blue-400 transform scale-[1.02]'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-500'}`}>
                {tab.label}
              </p>
              <p className="text-lg font-extrabold mt-1 text-gray-800">
                {tab.format(totals[tab.key as keyof typeof totals] || 0)}
              </p>
            </div>
          ))}
        </div>

        {error && !loading && <Card className="border-red-200"><div className="text-red-500 font-medium">{error}</div></Card>}

        {loading ? (
          <div className="text-center py-20"><Spin size="large" /></div>
        ) : (
          <>
            {/* DYNAMIC GRAPH - Sirf selected tab ka data dikhayega */}
            {type === "GMV" && (
              <Card
                title={<span className="font-semibold text-gray-700">Day-wise Trend: {activeTabData?.label}</span>}
                className="shadow-sm border-gray-100 rounded-xl"
              >
                {chartData.length === 0 ? (
                  <Empty description="No data available" className="py-10" />
                ) : (
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 30, right: 30, left: 0, bottom: 20 }}
                    >
                      {/* Dotted lines REMOVED (stroke="none" aur vertical={false}) */}
                      <CartesianGrid vertical={false} horizontal={false} stroke="none" />

                      {/* Date seedhi ki (angle hataya) */}
                      <XAxis
                        dataKey="date"
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        dy={10}
                      // Angle hataya gaya hai taaki dates seedhi (horizontal) dikhein
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />

                      <Tooltip
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                      <Bar
                        dataKey={activeTab}
                        fill={activeTabData?.color || "#5c5f66"}
                        name={activeTabData?.label}
                        barSize={45} // Bar ki thickness thodi theek ki hai
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey={activeTab}
                          position="top"
                          formatter={(v: any) =>
                            activeTab === "conversion_percentage" ? `${v}%` : v
                          }
                          fill={activeTabData?.color || "#4b5563"}
                          fontSize={13}
                          fontWeight={700}
                          offset={8}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default GraphsWrapper;