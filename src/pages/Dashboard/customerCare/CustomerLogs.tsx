// import React from 'react'

// const CustomerLogs = () => {
//   return (
//     <div>CustomerLogs</div>
//   )
// }

// export default CustomerLogs

// import { useState, useEffect } from "react";
// import PageMeta from "../../../components/common/PageMeta";
// import { PartnerTab } from "../../../components/common/PartnerTab";
// import {
//   CUSTOM_GENERIC_TABLE,
//   CUSTOM_GENERIC_UPDATE,
//   CUSTOM_GENERIC_CREATE,
// } from "../../../config/customerCare/operationsApicall";
// import { GenericTablePayload } from "../../../config/types";
// import { useSelector } from "react-redux";

// const FIXED_TABLE = "customer_support_logs";

// const CustomerLogs = () => {
//   const OperationstoreData = useSelector((state: any) => state?.operationStore);

//   const [fromDate, setFromDate] = useState<string>("");
//   const [toDate, setToDate] = useState<string>("");

//   const [filterInputs, setFilterInputs] = useState<Record<string, any>>({});
//   const [responseData, setResponseData] = useState<any[]>([]);
//   const [tableKeys, setTableKeys] = useState<string[]>([]);

//   const [currentPage, setCurrentPage] = useState<number>(1);
//   const [totalRecords, setTotalRecords] = useState<number>(0);
//   const limit = 20;

//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const [activeRow, setActiveRow] = useState<string | null | number>(null);

//   const [SelectedPartner, setSelectedPartner] = useState<string>(
//     OperationstoreData?.ReportSelectedPartner
//   );

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [formData, setFormData] = useState<any>({});

//   // Sync partner from redux store
//   useEffect(() => {
//     setSelectedPartner(OperationstoreData?.ReportSelectedPartner);
//   }, [OperationstoreData?.ReportSelectedPartner]);

//   // Reset when partner changes
//   useEffect(() => {
//     setCurrentPage(1);
//     setFilterInputs({});
//     setResponseData([]);
//     setTableKeys([]);
//     setTotalRecords(0);
//   }, [SelectedPartner]);

//   const handleSearch = async (
//     page = 1,
//     overrideFilters?: Record<string, any>,
//     overridePartner?: string
//   ) => {
//     setLoading(true);
//     setError(null);
//     setCurrentPage(page);

//     try {
//       const payload: Record<string, any> = {
//         table: FIXED_TABLE,
//         limit,
//         page,
//       };

//       if (fromDate) payload["from"] = fromDate;
//       if (toDate) payload["to"] = toDate;

//       let activeFilters: Record<string, any> = {};
//       if (overrideFilters) {
//         activeFilters = overrideFilters;
//       } else {
//         Object.keys(filterInputs).forEach((key) => {
//           if (filterInputs[key] !== "" && filterInputs[key] !== undefined) {
//             activeFilters[key] = filterInputs[key];
//           }
//         });
//       }
//       payload["filters"] = activeFilters;

//       const partnerToUse = overridePartner || SelectedPartner;

//       const res = await CUSTOM_GENERIC_TABLE(
//         partnerToUse,
//         payload as GenericTablePayload
//       );

//       let dataArray: any[] = [];
//       let count = 0;

//       if (res.code === 200 && Array.isArray(res.data)) {
//         dataArray = res.data;
//         count =
//           res.pagination?.totalCount !== undefined
//             ? res.pagination.totalCount
//             : dataArray.length;
//       } else if (res.data) {
//         dataArray = Array.isArray(res.data) ? res.data : [res.data];
//         count = dataArray.length;
//       }

//       setResponseData(dataArray);
//       setTotalRecords(count);

//       if (dataArray.length > 0) {
//         const excludeKeys = [
//           "id", "_id", "createdAt", "updatedAt",
//           "desktop_logo_url", "mobile_logo_url",
//           "image_url", "mobile_app_url",
//         ];
//         const newKeys = Object.keys(dataArray[0]).filter(
//           (k) => !excludeKeys.includes(k)
//         );
//         setTableKeys((prev) => Array.from(new Set([...prev, ...newKeys])));
//       }
//     } catch (err: any) {
//       console.error(err);
//       setError(
//         err.response
//           ? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
//           : err.message || "An error occurred"
//       );
//       setResponseData([]);
//       setTotalRecords(0);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (key: string, value: string) => {
//     setFilterInputs((prev) => ({ ...prev, [key]: value }));
//   };

//   const handlePageChange = (newPage: number) => {
//     if (newPage > 0 && newPage <= Math.ceil(totalRecords / limit)) {
//       handleSearch(newPage);
//     }
//   };

//   const appliedFilters = Object.entries(filterInputs).filter(
//     ([_, val]) => val !== "" && val !== undefined
//   );
//   if (fromDate) appliedFilters.push(["From Date", fromDate]);
//   if (toDate) appliedFilters.push(["To Date", toDate]);

//   return (
//     <div>
//       <PageMeta
//         title="Customer Logs"
//         description="View and Filter Customer Support Logs"
//       />

//       <div className="bg-white p-6 mx-auto max-w-full rounded-xl shadow-lg mt-0">
//         <h2 className="text-2xl font-bold mb-4 text-gray-800">Customer Logs</h2>

//         <PartnerTab />

//         {/* Top Controls: Date Range & Buttons */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
//           {/* From Date */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               From Date
//             </label>
//             <input
//               type="date"
//               className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//               value={fromDate}
//               onChange={(e) => setFromDate(e.target.value)}
//             />
//           </div>

//           {/* To Date */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               To Date
//             </label>
//             <input
//               type="date"
//               className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//               value={toDate}
//               onChange={(e) => setToDate(e.target.value)}
//             />
//           </div>

//           {/* Empty col for spacing */}
//           <div />

//           {/* Buttons */}
//           <div>
//             <button
//               onClick={() => handleSearch(1)}
//               disabled={loading}
//               className={`w-full p-2 rounded-lg text-white font-medium shadow transition-colors h-[42px] ${
//                 loading
//                   ? "bg-gray-400 cursor-not-allowed"
//                   : "bg-blue-600 hover:bg-blue-700"
//               }`}
//             >
//               {loading ? "Loading..." : "Search"}
//             </button>
//             <button
//               onClick={() => {
//                 setIsEditMode(false);
//                 setFormData({});
//                 setIsModalOpen(true);
//               }}
//               className="w-full p-2 mt-2 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700"
//             >
//               + Create
//             </button>
//           </div>
//         </div>

//         {/* Applied Filters */}
//         {appliedFilters.length > 0 && (
//           <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg flex flex-wrap gap-2 items-center">
//             <span className="text-sm font-semibold text-blue-800 mr-2">
//               Applied Filters:
//             </span>
//             {appliedFilters.map(([key, val]) => (
//               <span
//                 key={key}
//                 className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700 shadow-sm"
//               >
//                 <span className="font-bold">{key}:</span> {val}
//               </span>
//             ))}
//           </div>
//         )}

//         {/* Error */}
//         {error && (
//           <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
//             <strong>Error:</strong> {error}
//           </div>
//         )}

//         {/* Dynamic Filters */}
//         {tableKeys.length > 0 && (
//           <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
//             <div className="flex justify-between items-center mb-3">
//               <h3 className="text-sm uppercase font-bold text-gray-500 tracking-wider">
//                 Dynamic Filters
//               </h3>
//               <button
//                 onClick={() => handleSearch(1)}
//                 className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded hover:bg-indigo-700 transition shadow-sm"
//               >
//                 Apply Filters
//               </button>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
//               {tableKeys.map((key) => (
//                 <div key={key}>
//                   <label
//                     className="block text-xs font-medium text-gray-600 mb-1 truncate"
//                     title={key}
//                   >
//                     {key}
//                   </label>
//                   <input
//                     type="text"
//                     className="w-full p-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
//                     placeholder={`Filter ${key}...`}
//                     value={filterInputs[key] || ""}
//                     onChange={(e) => handleInputChange(key, e.target.value)}
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter") handleSearch(1);
//                     }}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Results Table */}
//         {responseData.length > 0 ? (
//           <>
//             <div className="flex justify-between items-center mb-2 px-1">
//               <div className="text-sm text-gray-600">
//                 Total Records:{" "}
//                 <span className="font-bold text-gray-900">{totalRecords}</span>
//                 <span className="mx-2">|</span>
//                 Page:{" "}
//                 <span className="font-bold text-gray-900">{currentPage}</span>{" "}
//                 of {Math.ceil(totalRecords / limit) || 1}
//               </div>
//             </div>

//             <div className="overflow-x-auto border border-gray-200 rounded-t-lg shadow-sm">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
//                       Action
//                     </th>
//                     {Object.keys(responseData[0] || {}).map((key) => (
//                       <th
//                         key={key}
//                         className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
//                       >
//                         {key}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {responseData.map((row, idx) => (
//                     <tr
//                       key={idx}
//                       onClick={() => setActiveRow(idx)}
//                       className={`cursor-pointer transition-colors ${
//                         activeRow === idx ? "bg-blue-100" : "hover:bg-gray-50"
//                       }`}
//                     >
//                       <td className="px-4 py-3 whitespace-nowrap text-sm">
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setIsEditMode(true);
//                             setFormData(row);
//                             setIsModalOpen(true);
//                           }}
//                           className="px-3 py-1 bg-yellow-500 text-white rounded"
//                         >
//                           Edit
//                         </button>
//                       </td>
//                       {Object.keys(row).map((key) => (
//                         <td
//                           key={`${idx}-${key}`}
//                           className="px-4 py-3 whitespace-nowrap text-sm text-gray-700"
//                         >
//                           {typeof row[key] === "object" ? (
//                             <span
//                               title={JSON.stringify(row[key])}
//                               className="text-xs text-gray-500 cursor-help underline decoration-dotted"
//                             >
//                               {Array.isArray(row[key]) ? "[Array]" : "{Object}"}
//                             </span>
//                           ) : (
//                             String(row[key]?.toString().substring(0, 100)) +
//                             (String(row[key]).length > 100 ? "..." : "")
//                           )}
//                         </td>
//                       ))}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination */}
//             <div className="bg-gray-50 px-4 py-3 border-x border-b border-gray-200 rounded-b-lg flex items-center justify-between sm:px-6">
//               <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
//                 <p className="text-sm text-gray-700">
//                   Showing{" "}
//                   <span className="font-medium">
//                     {(currentPage - 1) * limit + 1}
//                   </span>{" "}
//                   to{" "}
//                   <span className="font-medium">
//                     {Math.min(currentPage * limit, totalRecords)}
//                   </span>{" "}
//                   of <span className="font-medium">{totalRecords}</span> results
//                 </p>
//                 <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
//                   <button
//                     onClick={() => handlePageChange(currentPage - 1)}
//                     disabled={currentPage === 1}
//                     className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
//                       currentPage === 1
//                         ? "text-gray-300 cursor-not-allowed"
//                         : "text-gray-500 hover:bg-gray-50"
//                     }`}
//                   >
//                     &lt; Prev
//                   </button>
//                   <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
//                     {currentPage}
//                   </span>
//                   <button
//                     onClick={() => handlePageChange(currentPage + 1)}
//                     disabled={currentPage >= Math.ceil(totalRecords / limit)}
//                     className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
//                       currentPage >= Math.ceil(totalRecords / limit)
//                         ? "text-gray-300 cursor-not-allowed"
//                         : "text-gray-500 hover:bg-gray-50"
//                     }`}
//                   >
//                     Next &gt;
//                   </button>
//                 </nav>
//               </div>
//             </div>
//           </>
//         ) : (
//           !loading &&
//           !error && (
//             <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
//               <p>No data to display. Click Search to load customer logs.</p>
//             </div>
//           )
//         )}

//         {/* Create / Edit Modal */}
//         {isModalOpen && (
//           <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
//             <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-auto">
//               <h2 className="text-xl font-bold mb-4">
//                 {isEditMode ? "Update Record" : "Create Record"}
//               </h2>

//               {(isEditMode ? Object.keys(formData) : tableKeys)
//                 .filter((key) => !["createdAt", "updatedAt"].includes(key))
//                 .map((key) => (
//                   <div key={key} className="mb-3">
//                     <label className="text-sm font-medium text-gray-700">{key}</label>
//                     <input
//                       type="text"
//                       value={formData[key] || ""}
//                       onChange={(e) =>
//                         setFormData((prev: any) => ({
//                           ...prev,
//                           [key]: e.target.value,
//                         }))
//                       }
//                       className="w-full p-2 border rounded mt-1"
//                     />
//                   </div>
//                 ))}

//               <div className="flex justify-end gap-2 mt-4">
//                 <button
//                   onClick={() => setIsModalOpen(false)}
//                   className="px-4 py-2 bg-gray-400 text-white rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={async () => {
//                     try {
//                       const excludeFields = ["id", "createdAt", "updatedAt", "partnerName"];
//                       const cleanData = Object.fromEntries(
//                         Object.entries(formData)
//                           .filter(
//                             ([key, value]) =>
//                               value !== "" &&
//                               value !== undefined &&
//                               !excludeFields.includes(key)
//                           )
//                           .map(([key, value]) => {
//                             if (
//                               typeof value === "string" &&
//                               value.includes("T") &&
//                               value.includes("Z")
//                             ) {
//                               return [
//                                 key,
//                                 new Date(value)
//                                   .toISOString()
//                                   .slice(0, 19)
//                                   .replace("T", " "),
//                               ];
//                             }
//                             return [key, value];
//                           })
//                       );

//                       if (isEditMode) {
//                         await CUSTOM_GENERIC_UPDATE(SelectedPartner, {
//                           table: FIXED_TABLE,
//                           id: formData.id,
//                           data: cleanData,
//                         });
//                       } else {
//                         await CUSTOM_GENERIC_CREATE(SelectedPartner, {
//                           table: FIXED_TABLE,
//                           data: cleanData,
//                         });
//                       }

//                       setIsModalOpen(false);
//                       handleSearch(currentPage);
//                     } catch (err) {
//                       console.error(err);
//                     }
//                   }}
//                   className="px-4 py-2 bg-blue-600 text-white rounded"
//                 >
//                   Submit
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CustomerLogs;

import { useState, useEffect, useCallback, useRef } from "react";
import PageMeta from "../../../components/common/PageMeta";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_UPDATE,
  CUSTOM_GENERIC_CREATE,
} from "../../../config/customerCare/operationsApicall";
import { GenericTablePayload } from "../../../config/types";
import { useSelector } from "react-redux";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { RangerPicker } from "../../../components/common/RangePicker";
import { SaveDateRange } from "../../../Redux/slices/operationSlice";
import { useDispatch } from "react-redux";
// import { SearchBooking } from "../../../components/common/SearchBooking";

// ─── Constants
const FIXED_TABLE = "customer_support_logs";
const PAGE_LIMIT = 20;

const DEFAULT_FORM_FIELDS = [
  "bookingId",
  "customerNumber",
  "complaints",
  "inquiry",
  "resolution",
  "agentName",
  "cabPartner",
  "complaintsVia",
  "bookingPartner",
  "bookingAmount",
  "alternativeCabProviderAmount",
  "refundAmount",
  "paidBy",
  "paymentHold",
    "actionStatus",
];

const EXCLUDE_KEYS = [
  "id",
  "_id",
  "desktop_logo_url",
  "mobile_logo_url",
  "image_url",
  "mobile_app_url",
];

const DROPDOWN_FIELDS: Record<string, { label: string; value: string }[]> = {
  payment_hold: [
    { label: "Yes", value: "1" },
    { label: "No", value: "0" },
  ],

  paid_by: [
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

  cab_partner: [
    { label: "TRAVELVIP", value: "TRAVELVIP" },
    { label: "QUICKRIDE", value: "QUICKRIDE" },
    { label: "GOZOCABS", value: "GOZOCABS" },
    { label: "SIGNATURE", value: "SIGNATURE" },
    { label: "WTICABS", value: "WTICABS" },
    { label: "MEGA", value: "MEGA" },
    { label: "GOAMILES", value: "GOAMILES" },
    { label: "TAXIBAZAAR", value: "TAXIBAZAAR" },
    { label: "EVERA", value: "EVERA" },
    { label: "CARZONRENT", value: "CARZONRENT" },
    { label: "REFEX", value: "REFEX" },
    { label: "MERU", value: "MERU" },
    { label: "KANGAROOCARS", value: "KANGAROOCARS" },
    { label: "SIG-SNAPPY", value: "SIG-SNAPPY" },
    { label: "SIG-Evera", value: "SIG-Evera" },
    { label: "COMMUTEC", value: "COMMUTEC" },
    { label: "SHOFFR", value: "SHOFFR" },
    { label: "BETMOBILITY", value: "BETMOBILITY" },
    { label: "BLUECAB", value: "BLUECAB" },
    { label: "TAXIDA", value: "TAXIDA" },
    { label: "ONDC", value: "ONDC" },
    { label: "MILODRIVE", value: "MILODRIVE" },
    { label: "GRELCABS", value: "GRELCABS" },
    { label: "SIG-PLUSHMILES", value: "SIG-PLUSHMILES" },
    { label: "SIG-BLUSKY", value: "SIG-BLUSKY" },
    { label: "SIG-GOGREEN", value: "SIG-GOGREEN" },
    { label: "SIG-PVryde", value: "SIG-PVryde" },
    { label: "SIG-MANNTOURS", value: "SIG-MANNTOURS" },
    { label: "SIG-NANDIMOBILITY", value: "SIG-NANDIMOBILITY" },
  ],
};

// const DATE_OPTIONS = [
//   { label: "Today", value: "today" },
//   { label: "Yesterday", value: "yesterday" },
//   { label: "Last 7 Days", value: "last7" },
//   { label: "Custom", value: "custom" },
// ];

// ─── Helpers
// const toISODate = (offset = 0) => {
//   const d = new Date();
//   d.setDate(d.getDate() + offset);
//   return d.toISOString().split("T")[0];
// };

const formatCell = (val: any): string => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object")
    return Array.isArray(val) ? "[Array]" : "{Object}";
  const str = String(val);
  return str.length > 80 ? str.substring(0, 80) + "…" : str;
};

const getStatusStyle = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("resolv") || s.includes("closed") || s.includes("done"))
    return { bg: "#e6f9f0", text: "#16a34a", border: "#bbf7d0" };
  if (s.includes("progress") || s.includes("pending") || s.includes("open"))
    return { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" };
  if (s.includes("escalat"))
    return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
  return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
};

const downloadCSV = (data: any[]) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((r) =>
    headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cx_report_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Search field options
// const SEARCH_FIELDS = [
//   { label: "Auto Detect", value: "auto" },
//   { label: "Mobile Number", value: "mobile_number" },
//   { label: "Booking ID", value: "booking_id" },
//   { label: "Customer Number", value: "customer_number" },
//   { label: "Agent Name", value: "agent_name" },
// ];

const resolveSearchFilter = (
  query: string,
  field: string,
): Record<string, string> => {
  if (field !== "auto") return { [field]: query.trim() };
  const q = query.trim();
  if (/^\d{10}$/.test(q)) return { mobile_number: q };
  if (/^[A-Za-z]{1,4}\d+/i.test(q)) return { booking_id: q };
  return { customer_number: q };
};

// const normalizeFieldKey = (key: string) =>
//   key
//     ?.toLowerCase()
//     ?.replace(/\s+/g, "_")
//     ?.replace(/-/g, "_");

const normalizeFieldKey = (key: string) => {
  const normalized = key
    ?.toLowerCase()
    ?.replace(/\s+/g, "")
    ?.replace(/-/g, "")
    ?.replace(/_/g, "");

  return FIELD_NAME_ALIASES[normalized] || normalized;
};

const FIELD_NAME_ALIASES: Record<string, string> = {
  paymenthold: "payment_hold",
  payment_hold: "payment_hold",
  payment_hold_status: "payment_hold",

  paidby: "paid_by",
  paid_by: "paid_by",

  cabpartner: "cab_partner",
  cab_partner: "cab_partner",

  actionstatus: "actionStatus",
  finalreport: "finalreport",
};

// ─── Sub-Components
const StatusBadge = ({ value }: { value: string }) => {
  const style = getStatusStyle(value);
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {value || "—"}
    </span>
  );
};

const CreateEditModal = ({
  open,
  isEdit,
  formData,
  setFormData,
  tableKeys,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  isEdit: boolean;
  formData: any;
  setFormData: (v: any) => void;
  tableKeys: string[];
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) => {
  if (!open) return null;

  // const fields = isEdit
  //   ? Object.keys(formData).filter(
  //       (k) => !["createdAt", "updatedAt"].includes(k),
  //     )
  //   : tableKeys.filter(
  //       (k) => !["createdAt", "updatedAt", "id", "_id"].includes(k),
  //     );

  // const fields = isEdit
  // ? Object.keys(formData).filter(
  //     (k) => !["createdAt", "updatedAt"].includes(k),
  //   )
  // : (tableKeys.length ? tableKeys : DEFAULT_FORM_FIELDS).filter(
  //     (k) => !["createdAt", "updatedAt", "id", "_id"].includes(k),
  //   );

  const fallbackFields = DEFAULT_FORM_FIELDS.filter(
    (k) => !["createdAt", "updatedAt", "id", "_id"].includes(k),
  );

  const dynamicFields = tableKeys.filter(
    (k) => !["createdAt", "updatedAt", "id", "_id"].includes(k),
  );

  const mergedFields = [...new Set([...fallbackFields, ...dynamicFields])];

  const fields = isEdit
    ? Object.keys(formData).filter(
        (k) => !["createdAt", "updatedAt"].includes(k),
      )
    : mergedFields;

  // const AuthstoreData = useSelector((state: any) => state?.authStore);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: 560,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              {isEdit ? "✏️ Update Record" : "➕ Create New Record"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {isEdit
                ? "Edit fields and save changes"
                : "Fill in details to add a new log"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 16,
              color: "#374151",
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            {fields.map((key) => (
              <div
                key={key}
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {key.replace(/_/g, " ")}
                </label>
                {/* <input
                  type="text"
                  value={formData[key] ?? ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({ ...p, [key]: e.target.value }))
                  }
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 13,
                    outline: "none",
                    transition: "border 0.15s",
                    color: "#111827",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                /> */}
                {/* {DROPDOWN_FIELDS[key] ? ( */}
                {DROPDOWN_FIELDS[normalizeFieldKey(key)] ? (
                  <select
                    value={formData[key] ?? ""}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        [key]: e.target.value,
                      }))
                    }
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 13,
                      outline: "none",
                      color: "#111827",
                      background: "#fff",
                    }}
                  >
                    <option value="">Select</option>

                    {/* {DROPDOWN_FIELDS[key].map((option) => ( */}
                    {/* {DROPDOWN_FIELDS[normalizeFieldKey(key)].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                      
                    ))} */}
                    {DROPDOWN_FIELDS[normalizeFieldKey(key)].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData[key] ?? ""}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        [key]: e.target.value,
                      }))
                    }
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 13,
                      outline: "none",
                      transition: "border 0.15s",
                      color: "#111827",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: "8px 24px",
              borderRadius: 8,
              border: "none",
              background: submitting ? "#93c5fd" : "#2563eb",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component
const CustomerLogs = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);

  const dispatch = useDispatch();

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return [today, today];
  });

  // const [searchValue, setSearchValue] = useState("");

  // const onSearch = (bookingId: string) => {
  //   setSearchValue(bookingId);
  //   handleSearch(1);
  // };

  // ── State ──
  // const [view, setView] = useState<"table" | "create">("table");
  const [selectedPartner, setSelectedPartner] = useState<string>(
    OperationstoreData?.ReportSelectedPartner ||  "all",
  );

  // const [searchQuery, setSearchQuery] = useState("");
  // const [searchQuery] = useState("");
  // // const [searchField, setSearchField] = useState("auto"); // auto | mobile_number | booking_id | customer_number
  // const [searchField] = useState("auto");
  // // const [datePreset, setDatePreset] = useState("today");
  // const [datePreset] = useState("today");

  const searchQuery = "";
  const searchField = "auto";
  const datePreset = "today";

  // const [fromDate, setFromDate] = useState(toISODate(0));
  // const [toDate, setToDate] = useState(toISODate(0));
  const fromDate = dateRange[0];
  const toDate = dateRange[1];
  // const [showCustomDate, setShowCustomDate] = useState(false);
  // const [showCustomDate] = useState(false);
  // const [view, setView] = useState<"table" | "create">("table");

  const [responseData, setResponseData] = useState<any[]>([]);
  const [tableKeys, setTableKeys] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [filterInputs, setFilterInputs] = useState<Record<string, any>>({});

  const abortRef = useRef<AbortController | null>(null);

  const AuthstoreData = useSelector((state: any) => state?.authStore);

  // Sync partner from redux
  useEffect(() => {
    const p = OperationstoreData?.ReportSelectedPartner;
    if (p && p !== selectedPartner) {
      setSelectedPartner(p);
      setCurrentPage(1);
      setResponseData([]);
      setTotalRecords(0);
    }
  }, [OperationstoreData?.ReportSelectedPartner]);
  const handleDateChange = (dates: any) => {
    if (dates) {
      const newRange: [string, string] = [dates[0], dates[1]];
      setDateRange(newRange);
      dispatch(SaveDateRange(newRange));
      // handleSearch(1);
    }
  };

  // ── Search (single API call) ──
  const handleSearch = useCallback(
    async (page = 1) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setCurrentPage(page);

      try {

        const dateFilter = {
          createdAt: {
            gte: `${fromDate} 00:00:00`,
            lte: `${toDate} 23:59:59`,
          },
        };

        const searchFilters = searchQuery
          ? resolveSearchFilter(searchQuery, searchField)
          : Object.fromEntries(
              Object.entries(filterInputs).filter(
                ([_, v]) => v !== "" && v !== undefined,
              ),
            );

        const payload: GenericTablePayload = {
          table: FIXED_TABLE,
          limit: PAGE_LIMIT,
          page,
          filters: {
            ...searchFilters, // booking ID / customer no filters
            ...dateFilter, // createdAt: { gte, lte }
          },
        };
        let dataArray: any[] = [];
        let count = 0;

        if (selectedPartner === "all" || selectedPartner === "") {
          const partnerList: string[] = AuthstoreData?.login_partners || [];

          // const res = await CUSTOM_GENERIC_TABLE(selectedPartner, payload);

          for (const p of partnerList) {
            try {
              const res = await CUSTOM_GENERIC_TABLE(p, payload);
              if (res.code === 200 && Array.isArray(res.data)) {
                dataArray = [...dataArray, ...res.data];
                count += res.pagination?.totalCount ?? res.data.length;
              }
            } catch (e) {
              console.error(`Error fetching for partner: ${p}`, e);
            }
          }
        } else {
          const res = await CUSTOM_GENERIC_TABLE(selectedPartner, payload);
          if (res.code === 200 && Array.isArray(res.data)) {
            dataArray = res.data;
            count = res.pagination?.totalCount ?? dataArray.length;
          } else if (res.data) {
            dataArray = Array.isArray(res.data) ? res.data : [res.data];
            count = dataArray.length;
          }
        }

        // if (res.code === 200 && Array.isArray(res.data)) {
        //   dataArray = res.data;
        //   count = res.pagination?.totalCount ?? dataArray.length;
        // } else if (res.data) {
        //   dataArray = Array.isArray(res.data) ? res.data : [res.data];
        //   count = dataArray.length;
        // }

        setResponseData(dataArray);
        setTotalRecords(count);

        if (dataArray.length > 0) {
          const keys = Object.keys(dataArray[0]).filter(
            (k) => !EXCLUDE_KEYS.includes(k),
          );
          setTableKeys(keys);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(
          err.response
            ? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
            : err.message || "An error occurred",
        );
        setResponseData([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    },
    // [selectedPartner, fromDate, toDate, searchQuery, searchField],
    [selectedPartner, fromDate, toDate, searchQuery, searchField, filterInputs],
  );
  useEffect(() => {
    if (selectedPartner) {
      handleSearch(1);
    }
    // }, [dateRange]);
  }, [selectedPartner,fromDate, toDate]);

  // ── Submit Create/Edit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const excludeFields = ["id", "createdAt", "updatedAt", "partnerName"];
      const cleanData = Object.fromEntries(
        Object.entries(formData)
          .filter(
            ([k, v]) =>
              v !== "" && v !== undefined && !excludeFields.includes(k),
          )
          .map(([k, v]) => {
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

      // if (isEditMode) {
      //   await CUSTOM_GENERIC_UPDATE(selectedPartner, {
      //     table: FIXED_TABLE,
      //     id: formData.id,
      //     data: cleanData,
      //   });
      // } else {
      //   await CUSTOM_GENERIC_CREATE(selectedPartner, {
      //     table: FIXED_TABLE,
      //     data: cleanData,
      //   });
      // }

      // setIsModalOpen(false);
      // setFormData({});
      // handleSearch(currentPage);
      if (isEditMode) {
        const res = await CUSTOM_GENERIC_UPDATE(selectedPartner, {
          table: FIXED_TABLE,
          id: formData.id || formData._id,
          data: cleanData,
        });

        console.log("Update Response:", res);
      } else {
        const res = await CUSTOM_GENERIC_CREATE(selectedPartner, {
          table: FIXED_TABLE,
          data: cleanData,
        });

        console.log("Create Response:", res);
      }

      // refresh latest data first
      await handleSearch(currentPage);

      // then close modal
      setIsModalOpen(false);
      setFormData({});
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status column key detection ──
  const statusKey = tableKeys.find((k) =>
    ["status", "Status", "resolution_status", "state"].includes(k),
  );

  const totalPages = Math.ceil(totalRecords / PAGE_LIMIT) || 1;

  const handleInputChange = (key: string, value: string) => {
    setFilterInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        marginTop: "-2%",
      }}
    >
      <PageMeta
        title="CX Team Manual Report"
        description="Customer Experience Logs & Reports"
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            // flexWrap: "wrap",
            flexWrap: "nowrap",
            overflowX: "auto",
            background: "#fff",
            borderRadius: 10,
            padding: "10px 14px",
            border: "1px solid #e8edf3",
            marginBottom: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <PartnerTab />
          <RangerPicker
            updateDate={[dateRange[0], dateRange[1]]}
            selectedRange={handleDateChange}
          />

          <button
            onClick={() => {
              setIsEditMode(false);
              setFormData({});
              setIsModalOpen(true);
            }}
            style={{
              background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "8px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
              paddingLeft: "15px",
              // width:"90px",
            }}
          >
            New Report
          </button>

          {/* Download CSV */}
          <button
            onClick={() => downloadCSV(responseData)}
            disabled={!responseData.length}
            style={{
              background: "#fff",
              color: responseData.length ? "#2563eb" : "#9ca3af",
              border: `1px solid ${responseData.length ? "#2563eb" : "#e5e7eb"}`,
              borderRadius: 7,
              padding: "7px 3px",
              fontWeight: 700,
              fontSize: 13,
              cursor: responseData.length ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              // width: "20px",
            }}
          >
            ⬇ Download CSV
          </button>

          {/* <SearchBooking onSearch={onSearch} /> */}

          {/* Booking ID */}
          <div>
            {/* <label className="block text-xs font-medium text-gray-600 mb-1">
      Booking ID
    </label> */}
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
              placeholder="Filter bookingId..."
              value={filterInputs["bookingId"] || ""}
              onChange={(e) => handleInputChange("bookingId", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
            />
          </div>
          {/* Customer Number */}
          <div>
            {/* <label className="block text-xs font-medium text-gray-600 mb-1">
      Customer Number
    </label> */}
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
              placeholder="Filter customerNo..."
              value={filterInputs["customerNumber"] || ""}
              onChange={(e) =>
                handleInputChange("customerNumber", e.target.value)
              }
              onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
            />
          </div>
          <div>
            <button
              onClick={() => handleSearch(1)}
              className="px-2 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded hover:bg-indigo-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "12px 18px",
              color: "#dc2626",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Table Section ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e8edf3",
            boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #f0f4f8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
              {datePreset === "today"
                ? "Total Records"
                : datePreset === "yesterday"
                  ? "Yesterday's Details"
                  : datePreset === "last7"
                    ? "Last 7 Days Details"
                    : `${fromDate} → ${toDate}`}
            </div>
            {totalRecords > 0 && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Total Entries:{" "}
                <span style={{ fontWeight: 700, color: "#2563eb" }}>
                  {totalRecords}
                </span>
              </div>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  color: "#6b7280",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    border: "2px solid #e5e7eb",
                    borderTopColor: "#2563eb",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Loading records…
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Table */}
          {!loading && responseData.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 800,
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {/* <th style={thStyle}>S.No.</th>
                    <th style={thStyle}>Action</th> */}
                    <th style={thStickyStyle(0)}>S.No.</th>
                    <th style={thStickyStyle(52)}>Action</th>
                    {Object.keys(responseData[0] || {}).map((key) => (
                      <th key={key} style={thStyle}>
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responseData.map((row, idx) => (
                    <tr
                      key={idx}
                      onClick={() =>
                        setActiveRow(idx === activeRow ? null : idx)
                      }
                      style={{
                        background:
                          activeRow === idx
                            ? "#eff6ff"
                            : idx % 2 === 0
                              ? "#fff"
                              : "#fafafa",
                        cursor: "pointer",
                        transition: "background 0.1s",
                        borderBottom: "1px solid #f0f4f8",
                      }}
                      onMouseEnter={(e) => {
                        if (activeRow !== idx)
                          e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (activeRow !== idx)
                          e.currentTarget.style.background =
                            idx % 2 === 0 ? "#fff" : "#fafafa";
                      }}
                    >
                      {/* S.No. */}
                      {/* <td style={{ ...tdStyle, color: "#9ca3af", fontWeight: 600 }}>
                        {(currentPage - 1) * PAGE_LIMIT + idx + 1}
                      </td> */}
                      <td
                        style={{
                          ...tdStickyStyle(0),
                          color: "#9ca3af",
                          fontWeight: 600,
                        }}
                      >
                        {(currentPage - 1) * PAGE_LIMIT + idx + 1}
                      </td>
                      {/* Action */}
                      {/* <td style={tdStyle}> */}
                      <td style={tdStickyStyle(52)}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditMode(true);
                            setFormData({ ...row });
                            setIsModalOpen(true);
                          }}
                          style={{
                            background: "#fffbeb",
                            color: "#d97706",
                            border: "1px solid #fde68a",
                            borderRadius: 6,
                            padding: "3px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#fef3c7";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fffbeb";
                          }}
                        >
                          Edit
                        </button>
                      </td>
                      {/* Data cells */}
                      {Object.keys(row).map((key) => (
                        <td key={`${idx}-${key}`} style={tdStyle}>
                          {key === statusKey ? (
                            <StatusBadge value={String(row[key] ?? "")} />
                          ) : (
                            <span title={String(row[key] ?? "")}>
                              {formatCell(row[key])}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && responseData.length === 0 && (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                No records found
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Click "View Reports" or "Filter" to load customer logs
              </div>
            </div>
          )}

          {/* ── Pagination ── */}
          {responseData.length > 0 && (
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #f0f4f8",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Showing{" "}
                <strong style={{ color: "#111827" }}>
                  {(currentPage - 1) * PAGE_LIMIT + 1}
                </strong>{" "}
                –{" "}
                <strong style={{ color: "#111827" }}>
                  {Math.min(currentPage * PAGE_LIMIT, totalRecords)}
                </strong>{" "}
                of <strong style={{ color: "#111827" }}>{totalRecords}</strong>{" "}
                results
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => handleSearch(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={paginationBtn(currentPage === 1)}
                >
                  ‹ Prev
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page =
                    Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handleSearch(page)}
                      style={{
                        ...paginationBtn(false),
                        background: page === currentPage ? "#2563eb" : "#fff",
                        color: page === currentPage ? "#fff" : "#374151",
                        borderColor:
                          page === currentPage ? "#2563eb" : "#e5e7eb",
                        fontWeight: page === currentPage ? 700 : 400,
                        minWidth: 34,
                      }}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleSearch(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  style={paginationBtn(currentPage >= totalPages)}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      <CreateEditModal
        open={isModalOpen}
        isEdit={isEditMode}
        formData={formData}
        setFormData={setFormData}
        tableKeys={tableKeys}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({});
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
};

// ─── Style helpers ─────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 13,
  color: "#374151",
  whiteSpace: "nowrap",
  maxWidth: 200,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const paginationBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "5px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: disabled ? "#f9fafb" : "#fff",
  color: disabled ? "#d1d5db" : "#374151",
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.1s",
});

const thStickyStyle = (left: number): React.CSSProperties => ({
  ...thStyle,
  position: "sticky",
  left,
  zIndex: 2,
  background: "#f8fafc",
});

const tdStickyStyle = (left: number): React.CSSProperties => ({
  ...tdStyle,
  position: "sticky",
  left,
  zIndex: 1,
  background: "inherit",
  boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
});

export default CustomerLogs;
