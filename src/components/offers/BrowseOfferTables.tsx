// import { useState, useEffect, useCallback } from "react";
// import { CUSTOM_GENERIC_TABLE } from "../../config/customerCare/operationsApicall";
// import { OFFER_TABLES, getPageNumbers } from "../../utils/aioOfferHelpers";

// interface BrowseOfferTablesProps {
//   partner: string;
// }

// export function BrowseOfferTables({ partner }: BrowseOfferTablesProps) {
//   const storedTable =
//     localStorage.getItem("aio_selected_offer_table") || "offers";
//   const [selectedTable, setSelectedTable] = useState(storedTable);
//   const [searchKey, setSearchKey] = useState("");
//   const [searchValue, setSearchValue] = useState("");
//   const [tableData, setTableData] = useState<any[]>([]);
//   const [columns, setColumns] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [statusMsg, setStatusMsg] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [limit, setLimit] = useState(20);
//   const [totalCount, setTotalCount] = useState(0);
//   const [totalPages, setTotalPages] = useState(0);

//   const activeLabel =
//     OFFER_TABLES.find((t) => t.value === selectedTable)?.label ||
//     selectedTable;

//   const loadData = useCallback(
//     async (page = currentPage, pageLimit = limit) => {
//       if (!selectedTable || !partner) return;

//       setLoading(true);
//       setStatusMsg("");

//       const filters: Record<string, string> = {};
//       if (searchKey && searchValue) {
//         filters[searchKey] = searchValue;
//       }

//       try {
//         const res = await CUSTOM_GENERIC_TABLE(partner, {
//           table: selectedTable,
//           filters,
//           page,
//           limit: pageLimit,
//         });

//         const dataArray = res.code === 200 && Array.isArray(res.data) ? res.data : [];
//         setTableData(dataArray);
//         setColumns(dataArray.length > 0 ? Object.keys(dataArray[0]) : []);

//         if (res.pagination) {
//           setTotalCount(res.pagination.totalCount || 0);
//           setTotalPages(res.pagination.totalPages || 0);
//           setCurrentPage(res.pagination.page || page);
//           setLimit(res.pagination.limit || pageLimit);
//         } else {
//           setTotalCount(dataArray.length);
//           setTotalPages(1);
//         }

//         setStatusMsg(
//           dataArray.length > 0
//             ? `Loaded ${dataArray.length} records from ${selectedTable}`
//             : "No data found",
//         );
//       } catch (err: any) {
//         setStatusMsg(
//           `Error: ${err?.response?.data?.message || "Failed to load data"}`,
//         );
//         setTableData([]);
//         setColumns([]);
//       } finally {
//         setLoading(false);
//       }
//     },
//     [selectedTable, partner, searchKey, searchValue, currentPage, limit],
//   );

//   useEffect(() => {
//     localStorage.setItem("aio_selected_offer_table", selectedTable);
//   }, [selectedTable]);

//   useEffect(() => {
//     if (partner && selectedTable) {
//       loadData(1);
//     }
//   }, [partner, selectedTable]);

//   const onTableChange = (table: string) => {
//     setSelectedTable(table);
//     setCurrentPage(1);
//     setSearchKey("");
//     setSearchValue("");
//     setTableData([]);
//     setColumns([]);
//   };

//   const handleSearch = () => {
//     setCurrentPage(1);
//     loadData(1);
//   };

//   const pageNumbers = getPageNumbers(totalPages, currentPage);

//   return (
//     <div>
//       <div className="flex gap-2 mb-4 flex-wrap border-b pb-3">
//         {OFFER_TABLES.map((t) => (
//           <button
//             key={t.value}
//             type="button"
//             onClick={() => onTableChange(t.value)}
//             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
//               selectedTable === t.value
//                 ? "bg-orange-500 text-white shadow"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Table
//           </label>
//           <select
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={selectedTable}
//             onChange={(e) => onTableChange(e.target.value)}
//           >
//             {OFFER_TABLES.map((t) => (
//               <option key={t.value} value={t.value}>
//                 {t.label}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Filter Column
//           </label>
//           <input
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={searchKey}
//             onChange={(e) => setSearchKey(e.target.value)}
//             placeholder="e.g. offer_id"
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Filter Value
//           </label>
//           <input
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={searchValue}
//             onChange={(e) => setSearchValue(e.target.value)}
//             placeholder="Enter value"
//           />
//         </div>
//         <button
//           type="button"
//           onClick={handleSearch}
//           disabled={!selectedTable || loading}
//           className="p-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 h-[42px]"
//         >
//           {loading ? "Loading..." : "Search"}
//         </button>
//       </div>

//       {statusMsg && (
//         <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
//           {statusMsg}
//         </div>
//       )}

//       {tableData.length > 0 ? (
//         <>
//           <div className="mb-2 text-sm text-gray-600">
//             Table: <strong>{selectedTable}</strong> — Showing{" "}
//             {tableData.length} records • Total: {totalCount}
//           </div>
//           <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   {columns.map((col) => (
//                     <th
//                       key={col}
//                       className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
//                     >
//                       {col}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {tableData.map((row, idx) => (
//                   <tr key={idx} className="hover:bg-gray-50">
//                           {/* Edit button pehle */}
//       {/* <td className="px-4 py-3">
//         <button
//           type="button"
//           onClick={() => console.log("Edit clicked", row)}
//           className="px-4 py-1.5 text-sm font-semibold text-white bg-orange-400 rounded hover:bg-orange-500 transition-colors duration-150"
//         >
//           Edit
//         </button>
//       </td> */}
//                     {columns.map((col) => (
//                       <td
//                         key={col}
//                         className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate"
//                         title={String(row[col] ?? "")}
//                       >
//                         {row[col] !== null && row[col] !== undefined
//                           ? String(row[col])
//                           : "-"}
//                       </td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
//             <div className="text-sm text-gray-600">
//               Page {currentPage} of {totalPages || 1} |{" "}
//               {(currentPage - 1) * limit + 1}–
//               {Math.min(currentPage * limit, totalCount)} of {totalCount}
//             </div>
//             <div className="flex items-center gap-1">
//               <button
//                 type="button"
//                 onClick={() => loadData(currentPage - 1)}
//                 disabled={currentPage <= 1}
//                 className="px-3 py-1 border rounded text-sm disabled:opacity-40"
//               >
//                 ← Prev
//               </button>
//               {pageNumbers.map((page, idx) =>
//                 page === "..." ? (
//                   <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
//                     ...
//                   </span>
//                 ) : (
//                   <button
//                     key={page}
//                     type="button"
//                     onClick={() => loadData(page as number)}
//                     className={`px-3 py-1 border rounded text-sm ${
//                       page === currentPage
//                         ? "bg-orange-500 text-white border-orange-500"
//                         : "hover:bg-gray-50"
//                     }`}
//                   >
//                     {page}
//                   </button>
//                 ),
//               )}
//               <button
//                 type="button"
//                 onClick={() => loadData(currentPage + 1)}
//                 disabled={currentPage >= totalPages}
//                 className="px-3 py-1 border rounded text-sm disabled:opacity-40"
//               >
//                 Next →
//               </button>
//             </div>
//             <div className="flex items-center gap-2 text-sm">
//               <span className="text-gray-600">Per page:</span>
//               <select
//                 value={limit}
//                 onChange={(e) => {
//                   const newLimit = parseInt(e.target.value, 10);
//                   setLimit(newLimit);
//                   loadData(1, newLimit);
//                 }}
//                 className="border rounded p-1"
//               >
//                 {[10, 20, 50, 100].map((n) => (
//                   <option key={n} value={n}>
//                     {n}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </>
//       ) : (
//         !loading && (
//           <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
//             <p>No data to display for {activeLabel}.</p>
//             <p className="text-sm mt-1">Adjust filters or click Search.</p>
//           </div>
//         )
//       )}

//       {loading && tableData.length === 0 && (
//         <div className="text-center py-12 text-gray-500">Loading data...</div>
//       )}
//     </div>
//   );
// }

// import { useState, useEffect, useCallback } from "react";
// import {
//   CUSTOM_GENERIC_TABLE,
//   // CUSTOM_GENERIC_UPDATE,
// } from "../../config/customerCare/operationsApicall";
// import { OFFER_TABLES, getPageNumbers } from "../../utils/aioOfferHelpers";

// interface BrowseOfferTablesProps {
//   partner: string;
//   onEditOffer: (row: any) => void;
//   // onRegisterRefresh: (fn: () => void) => void;

// }

// export function BrowseOfferTables({ partner, onEditOffer }: BrowseOfferTablesProps) {
//   const storedTable =
//     localStorage.getItem("aio_selected_offer_table") || "offers";
//   const [selectedTable, setSelectedTable] = useState(storedTable);
//   const [searchKey, setSearchKey] = useState("");
//   const [searchValue, setSearchValue] = useState("");
//   const [tableData, setTableData] = useState<any[]>([]);
//   const [columns, setColumns] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [statusMsg, setStatusMsg] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [limit, setLimit] = useState(20);
//   const [totalCount, setTotalCount] = useState(0);
//   const [totalPages, setTotalPages] = useState(0);
//   const [statusFilter, setStatusFilter] = useState("active");

//   // ---- Edit Modal State (CabManagement jaisa) ----
//   // const [isModalOpen, setIsModalOpen] = useState(false);
//   // const [formData, setFormData] = useState<any>({});

//   const activeLabel =
//     OFFER_TABLES.find((t) => t.value === selectedTable)?.label || selectedTable;

//   const loadData = useCallback(
//     async (page = currentPage, pageLimit = limit) => {
//       if (!selectedTable || !partner) return;

//       setLoading(true);
//       setStatusMsg("");

//       const filters: Record<string, string> = {};
//       if (searchKey && searchValue) {
//         filters[searchKey] = searchValue;
//       }
//       // filters["status"] = statusFilter;

//       try {
//         const res = await CUSTOM_GENERIC_TABLE(partner, {
//           table: selectedTable,
//           filters,
//           page,
//           limit: pageLimit,
//         });

//         const dataArray =
//           res.code === 200 && Array.isArray(res.data) ? res.data : [];
//         setTableData(dataArray);
//         setColumns(dataArray.length > 0 ? Object.keys(dataArray[0]) : []);

//         if (res.pagination) {
//           setTotalCount(res.pagination.totalCount || 0);
//           setTotalPages(res.pagination.totalPages || 0);
//           setCurrentPage(res.pagination.page || page);
//           setLimit(res.pagination.limit || pageLimit);
//         } else {
//           setTotalCount(dataArray.length);
//           setTotalPages(1);
//         }

//         setStatusMsg(
//           dataArray.length > 0
//             ? `Loaded ${dataArray.length} records from ${selectedTable}`
//             : "No data found",
//         );
//       } catch (err: any) {
//         setStatusMsg(
//           `Error: ${err?.response?.data?.message || "Failed to load data"}`,
//         );
//         setTableData([]);
//         setColumns([]);
//       } finally {
//         setLoading(false);
//       }
//     },
//     [selectedTable, partner, searchKey, searchValue, currentPage, limit,statusFilter ],
//   );

//   useEffect(() => {
//     localStorage.setItem("aio_selected_offer_table", selectedTable);
//   }, [selectedTable]);

//   useEffect(() => {
//     if (partner && selectedTable) {
//       loadData(1);
//     }
//   }, [partner, selectedTable]);

// //   const loadDataRef = useRef(loadData);
// // useEffect(() => {
// //   loadDataRef.current = loadData;
// // }, [loadData]);

//   useEffect(() => {
//   // onRegisterRefresh(() => loadData(1));
//    onRegisterRefresh(() => loadDataRef.current(1));
// }, []);

//   const onTableChange = (table: string) => {
//     setSelectedTable(table);
//     setCurrentPage(1);
//     setSearchKey("");
//     setSearchValue("");
//     setTableData([]);
//     setColumns([]);
//      setStatusFilter("active");
//   };

//   const handleSearch = () => {
//     setCurrentPage(1);
//     loadData(1);
//   };

//   // Edit button click — row data form mein load karo
//   // const handleEditClick = (row: any) => {
//   //   setFormData(row);
//   //   setIsModalOpen(true);
//   // };

//   // Submit
//   // const handleSubmit = async () => {
//   //   try {
//   //     const excludeFields = ["id", "createdAt", "updatedAt", "partnerName"];

//   //     const cleanData = Object.fromEntries(
//   //       Object.entries(formData)
//   //         .filter(
//   //           ([key, value]) =>
//   //             value !== "" &&
//   //             value !== undefined &&
//   //             !excludeFields.includes(key),
//   //         )
//   //         .map(([key, value]) => {
//   //           // ISO date string ko proper format mein convert karo
//   //           if (
//   //             typeof value === "string" &&
//   //             value.includes("T") &&
//   //             value.includes("Z")
//   //           ) {
//   //             const date = new Date(value as string);
//   //             if (!isNaN(date.getTime())) {
//   //               return [key, date.toISOString().slice(0, 19).replace("T", " ")];
//   //             }
//   //           }
//   //           return [key, value];
//   //         }),
//   //     );

//   //     await CUSTOM_GENERIC_UPDATE(partner, {
//   //       table: selectedTable,
//   //       id: formData.id,
//   //       data: cleanData,
//   //     });

//   //     setIsModalOpen(false);
//   //     loadData(currentPage);
//   //   } catch (err) {
//   //     console.error("Update failed:", err);
//   //   }
//   // };

//   const pageNumbers = getPageNumbers(totalPages, currentPage);

//   return (
//     <div>
//       {/* ===== EDIT MODAL — CabManagement jaisa ===== */}
//       {/* {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
//           <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-auto">
//             <h2 className="text-xl font-bold mb-4">Update Record</h2>

//             {Object.keys(formData)
//               .filter((key) => !["createdAt", "updatedAt"].includes(key))
//               .map((key) => (
//                 <div key={key} className="mb-3">
//                   <label className="text-sm font-medium text-gray-700">
//                     {key}
//                   </label>
//                     {key === "status" ? (
//         <select
//           value={formData[key] || "active"}
//           onChange={(e) =>
//             setFormData((prev: any) => ({ ...prev, [key]: e.target.value }))
//           }
//           className="w-full p-2 border rounded mt-1"
//         >
//           <option value="active">active</option>
//           <option value="expired">expired</option>
//         </select>
//       ) : (
//         <input
//           type="text"
//           value={
//             formData[key] !== null && formData[key] !== undefined
//               ? String(formData[key])
//               : ""
//           }
//           onChange={(e) =>
//             setFormData((prev: any) => ({ ...prev, [key]: e.target.value }))
//           }
//           className="w-full p-2 border rounded mt-1"
//         />
//         )}
//                 </div>
//               ))}

//             <div className="flex justify-end gap-2 mt-4">
//               <button
//                 onClick={() => setIsModalOpen(false)}
//                 className="px-4 py-2 bg-gray-400 text-white rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleSubmit}
//                 className="px-4 py-2 bg-blue-600 text-white rounded"
//               >
//                 Submit
//               </button>
//             </div>
//           </div>
//         </div>
//       )} */}

//       {/* ===== TABLE TABS ===== */}
//       <div className="flex gap-2 mb-4 flex-wrap border-b pb-3">
//         {OFFER_TABLES.map((t) => (
//           <button
//             key={t.value}
//             type="button"
//             onClick={() => onTableChange(t.value)}
//             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
//               selectedTable === t.value
//                 ? "bg-orange-500 text-white shadow"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             {t.label}
//           </button>
//         ))}
//       </div>

//       {/* ===== FILTERS ===== */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Table
//           </label>
//           <select
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={selectedTable}
//             onChange={(e) => onTableChange(e.target.value)}
//           >
//             {OFFER_TABLES.map((t) => (
//               <option key={t.value} value={t.value}>
//                 {t.label}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Filter Column
//           </label>
//           <input
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={searchKey}
//             onChange={(e) => setSearchKey(e.target.value)}
//             placeholder="e.g. offer_id"
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Status
//           </label>
//           <select
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//           >
//             <option value="active">Active</option>
//             <option value="expired">Expired</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Filter Value
//           </label>
//           <input
//             className="w-full p-2 border border-gray-300 rounded-lg"
//             value={searchValue}
//             onChange={(e) => setSearchValue(e.target.value)}
//             placeholder="Enter value"
//           />
//         </div>
//         <button
//           type="button"
//           onClick={handleSearch}
//           disabled={!selectedTable || loading}
//           className="p-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 h-[42px]"
//         >
//           {loading ? "Loading..." : "Search"}
//         </button>
//       </div>

//       {statusMsg && (
//         <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
//           {statusMsg}
//         </div>
//       )}

//       {/* ===== DATA TABLE ===== */}
//       {tableData.length > 0 ? (
//         <>
//           <div className="mb-2 text-sm text-gray-600">
//             Table: <strong>{selectedTable}</strong> — Showing {tableData.length}{" "}
//             records • Total: {totalCount}
//           </div>
//           <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   {/* ACTION header */}
//                   {selectedTable === "offers" && (
//                   <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
//                     Action
//                   </th>
//                   )}
//                   {columns.map((col) => (
//                     <th
//                       key={col}
//                       className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
//                     >
//                       {col}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {tableData.map((row, idx) => (
//                   <tr key={idx} className="hover:bg-gray-50">
//                     {/* Edit Button */}
//                     {selectedTable === "offers" && (
//                     <td className="px-4 py-3">
//                       <button
//                         type="button"
//                         // onClick={() => handleEditClick(row)}
//                         onClick={() => onEditOffer(row)}
//                         className="px-4 py-1.5 text-sm font-semibold text-white bg-orange-400 rounded hover:bg-orange-500 transition-colors"
//                       >
//                         Edit
//                       </button>
//                     </td>
//                     )}
//                     {columns.map((col) => (
//                       <td
//                         key={col}
//                         className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate"
//                         title={String(row[col] ?? "")}
//                       >
//                         {row[col] !== null && row[col] !== undefined
//                           ? String(row[col])
//                           : "-"}
//                       </td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* ===== PAGINATION ===== */}
//           <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
//             <div className="text-sm text-gray-600">
//               Page {currentPage} of {totalPages || 1} |{" "}
//               {(currentPage - 1) * limit + 1}–
//               {Math.min(currentPage * limit, totalCount)} of {totalCount}
//             </div>
//             <div className="flex items-center gap-1">
//               <button
//                 type="button"
//                 onClick={() => loadData(currentPage - 1)}
//                 disabled={currentPage <= 1}
//                 className="px-3 py-1 border rounded text-sm disabled:opacity-40"
//               >
//                 ← Prev
//               </button>
//               {pageNumbers.map((page, idx) =>
//                 page === "..." ? (
//                   <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
//                     ...
//                   </span>
//                 ) : (
//                   <button
//                     key={page}
//                     type="button"
//                     onClick={() => loadData(page as number)}
//                     className={`px-3 py-1 border rounded text-sm ${
//                       page === currentPage
//                         ? "bg-orange-500 text-white border-orange-500"
//                         : "hover:bg-gray-50"
//                     }`}
//                   >
//                     {page}
//                   </button>
//                 ),
//               )}
//               <button
//                 type="button"
//                 onClick={() => loadData(currentPage + 1)}
//                 disabled={currentPage >= totalPages}
//                 className="px-3 py-1 border rounded text-sm disabled:opacity-40"
//               >
//                 Next →
//               </button>
//             </div>
//             <div className="flex items-center gap-2 text-sm">
//               <span className="text-gray-600">Per page:</span>
//               <select
//                 value={limit}
//                 onChange={(e) => {
//                   const newLimit = parseInt(e.target.value, 10);
//                   setLimit(newLimit);
//                   loadData(1, newLimit);
//                 }}
//                 className="border rounded p-1"
//               >
//                 {[10, 20, 50, 100].map((n) => (
//                   <option key={n} value={n}>
//                     {n}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </>
//       ) : (
//         !loading && (
//           <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
//             <p>No data to display for {activeLabel}.</p>
//             <p className="text-sm mt-1">Adjust filters or click Search.</p>
//           </div>
//         )
//       )}

//       {loading && tableData.length === 0 && (
//         <div className="text-center py-12 text-gray-500">Loading data...</div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import {
  CUSTOM_GENERIC_TABLE,
  CUSTOM_GENERIC_DELETE,
  GET_OFFER_ANALYTICS,
  GET_OFFER_AUDIT_LOG,
} from "../../config/customerCare/operationsApicall";
import { BROWSE_TABS,ANALYTICS_TABLE_VALUE,AUDIT_LOG_TABLE_VALUE,
 getPageNumbers, defaultAnalyticsDateRange,buildAuditDiffRows,OfferAuditLogRow, } from "../../utils/aioOfferHelpers";

interface BrowseOfferTablesProps {
  partner: string;
  onEditOffer: (row: any) => void;
  onEditRule: (row: any) => void;
  onEditLimit: (row: any) => void;
  refreshTrigger: number;
}

export function BrowseOfferTables({
  partner,
  onEditOffer,
  onEditRule,
  onEditLimit,
  refreshTrigger,
}: BrowseOfferTablesProps) {
  const storedTable =
    localStorage.getItem("aio_selected_offer_table") || "offers";
  const [selectedTable, setSelectedTable] = useState(storedTable);
  const [searchKey, setSearchKey] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active");

    // ===== NEW: Analytics tab filters (date range instead of column/value) =====
  const defaultRange = defaultAnalyticsDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  // ===== NEW: Audit Log tab filter (offer_id) + diff modal state =====
  const [auditOfferId, setAuditOfferId] = useState("");
  const [selectedAuditRow, setSelectedAuditRow] =
    useState<OfferAuditLogRow | null>(null);
 
 
  const isAnalyticsTab = selectedTable === ANALYTICS_TABLE_VALUE;
  const isAuditLogTab = selectedTable === AUDIT_LOG_TABLE_VALUE;   

   const activeLabel =
    BROWSE_TABS.find((t) => t.value === selectedTable)?.label || selectedTable;
 
  const loadData = useCallback(
    async (page = currentPage, pageLimit = limit) => {
      if (!selectedTable || !partner) return;
      setLoading(true);
      setStatusMsg("");

  // const activeLabel =
  //   OFFER_TABLES.find((t) => t.value === selectedTable)?.label || selectedTable;

  // const loadData = useCallback(
  //   async (page = currentPage, pageLimit = limit) => {
  //     if (!selectedTable || !partner) return;
  //     setLoading(true);
  //     setStatusMsg("");

      // ===== NEW: ANALYTICS TAB — separate API, separate response shape =====
      if (selectedTable === ANALYTICS_TABLE_VALUE) {
        try {
          const res = await GET_OFFER_ANALYTICS(partner, {
            from_date: fromDate,
            to_date: toDate,
            page,
            limit: pageLimit,
          });
          const dataArray =
            res?.code === 200 && Array.isArray(res.data) ? res.data : [];
          setTableData(dataArray);
          setColumns(dataArray.length > 0 ? Object.keys(dataArray[0]) : []);
          if (res?.pagination) {
            setTotalCount(res.pagination.totalCount || 0);
            setTotalPages(res.pagination.totalPages || 0);
            setCurrentPage(res.pagination.page || page);
            setLimit(res.pagination.limit || pageLimit);
          } else {
            setTotalCount(dataArray.length);
            setTotalPages(1);
            setCurrentPage(page);
          }
          setStatusMsg(
            dataArray.length > 0
              ? `Loaded ${dataArray.length} records from offer analytics`
              : "No data found",
          );
        } catch (err: any) {
          setStatusMsg(
            `Error: ${err?.response?.data?.message || "Failed to load analytics"}`,
          );
          setTableData([]);
          setColumns([]);
        } finally {
          setLoading(false);
        }
        return;
      }

            // ===== NEW: AUDIT LOG TAB — separate API, nested old_data/new_data =====
      if (selectedTable === AUDIT_LOG_TABLE_VALUE) {
        try {
          const params: Record<string, any> = { page, limit: pageLimit };
          if (auditOfferId.trim()) {
            params.offer_id = auditOfferId.trim();
          }
          const res = await GET_OFFER_AUDIT_LOG(partner, params);
          const dataArray =
            res?.code === 200 && Array.isArray(res.data) ? res.data : [];
          setTableData(dataArray);
          // columns yahan use nahi hote (audit log ka apna fixed table render hai),
          // lekin state ko clean rakhne ke liye reset kar rahe hain
          setColumns([]);
          if (res?.pagination) {
            setTotalCount(res.pagination.totalCount || 0);
            setTotalPages(res.pagination.totalPages || 0);
            setCurrentPage(res.pagination.page || page);
            setLimit(res.pagination.limit || pageLimit);
          } else {
            setTotalCount(dataArray.length);
            setTotalPages(1);
            setCurrentPage(page);
          }
          setStatusMsg(
            dataArray.length > 0
              ? `Loaded ${dataArray.length} records from audit log`
              : "No data found",
          );
        } catch (err: any) {
          setStatusMsg(
            `Error: ${err?.response?.data?.message || "Failed to load audit log"}`,
          );
          setTableData([]);
          setColumns([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      

      const filters: Record<string, string> = {};
      if (searchKey && searchValue) {
        filters[searchKey] = searchValue;
      }
      try {
        const res = await CUSTOM_GENERIC_TABLE(partner, {
          table: selectedTable,
          filters,
          page,
          limit: pageLimit,
        });
        const dataArray =
          res.code === 200 && Array.isArray(res.data) ? res.data : [];
        setTableData(dataArray);
        setColumns(dataArray.length > 0 ? Object.keys(dataArray[0]) : []);
        if (res.pagination) {
          setTotalCount(res.pagination.totalCount || 0);
          setTotalPages(res.pagination.totalPages || 0);
          setCurrentPage(res.pagination.page || page);
          setLimit(res.pagination.limit || pageLimit);
        } else {
          setTotalCount(dataArray.length);
          setTotalPages(1);
        }
        setStatusMsg(
          dataArray.length > 0
            ? `Loaded ${dataArray.length} records from ${selectedTable}`
            : "No data found",
        );
      } catch (err: any) {
        setStatusMsg(
          `Error: ${err?.response?.data?.message || "Failed to load data"}`,
        );
        setTableData([]);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    },
    [
      selectedTable,
      partner,
      searchKey,
      searchValue,
      currentPage,
      limit,
      statusFilter,
      fromDate,
      toDate,
      auditOfferId,
    ],
  );

  useEffect(() => {
    localStorage.setItem("aio_selected_offer_table", selectedTable);
  }, [selectedTable]);

  // useEffect(() => {
  //   if (partner && selectedTable && refreshTrigger > 0) {
  //     loadData(1);
  //   }
  // }, [partner, selectedTable, loadData]);
  // useEffect(() => {
  //   // console.log("refreshTrigger changed:", refreshTrigger);
  //   if (partner && selectedTable && refreshTrigger > 0) {
  //     // console.log("calling loadData from refreshTrigger");
  //     loadData(1);
  //   }
  // }, [refreshTrigger]);
  // useEffect(() => {
  //   if (partner && selectedTable) {
  //     loadData(1);
  //   }
  // }, [partner, selectedTable]);

  // useEffect(() => {
  //   if (partner && selectedTable && refreshTrigger > 0) {
  //     loadData(1);
  //   }
  // }, [refreshTrigger]);

  useEffect(() => {
    if (!partner || !selectedTable) return;

    loadData(1);
  }, [refreshTrigger, partner, selectedTable]);

  const onTableChange = (table: string) => {
    setSelectedTable(table);
    setCurrentPage(1);
    setSearchKey("");
    setSearchValue("");
    setTableData([]);
    setColumns([]);
    setStatusFilter("active");
      if (table === ANALYTICS_TABLE_VALUE) {
      const range = defaultAnalyticsDateRange
      ();
      setFromDate(range.from);
      setToDate(range.to);
    }
     if (table === AUDIT_LOG_TABLE_VALUE) {
      setAuditOfferId("");
    }
    setSelectedAuditRow(null);
  };

  const handleDelete = async (row: any) => {
    const id = row.id ?? row._id;

    if (!id) {
      alert("Record id not found");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this record?`,
    );

    if (!confirmed) return;

    try {
      await CUSTOM_GENERIC_DELETE(partner, {
        table: selectedTable,
        id,
      });

      alert("Record deleted successfully");

      loadData(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete record");
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData(1);
  };

  const pageNumbers = getPageNumbers(totalPages, currentPage);
    // ===== NEW: diff rows for the currently open audit modal =====
  const diffRows = selectedAuditRow
    ? buildAuditDiffRows(selectedAuditRow.old_data, selectedAuditRow.new_data)
    : [];

  return (
    <div>
      
      
      {/* ===== TABLE TABS ===== */}
      <div className="flex gap-2 mb-4 flex-wrap border-b pb-3">
        {BROWSE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onTableChange(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedTable === t.value
                ? "bg-orange-500 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== FILTERS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Table
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={selectedTable}
            onChange={(e) => onTableChange(e.target.value)}
          >
            {BROWSE_TABS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
          {isAnalyticsTab ? (
          <>
            {/* ===== NEW: ANALYTICS FILTERS (date range) ===== */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div />
          </>
        ) : isAuditLogTab ? (
          <>
          {/* ===== NEW: AUDIT LOG FILTER (offer_id) ===== */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer ID
              </label>
              <input
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={auditOfferId}
                onChange={(e) => setAuditOfferId(e.target.value)}
                placeholder="e.g. MEXMEX90"
              />
            </div>
            <div />
            <div />
          </>
        ) : (
          <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter Column
          </label>
          <input
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            placeholder="e.g. offer_id"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter Value
          </label>
          <input
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Enter value"
          />
        </div>
          </>
        )}
        <button
          type="button"
          onClick={handleSearch}
          disabled={!selectedTable || loading}
          className="p-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 h-[42px]"
        >
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {statusMsg && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
          {statusMsg}
        </div>
      )}

      {/* ===== DATA TABLE ===== */}
      {tableData.length > 0 ? (
        <>
          <div className="mb-2 text-sm text-gray-600">
            Table: <strong>{selectedTable}</strong> — Showing {tableData.length}{" "}
            records • Total: {totalCount}
          </div>

           {isAuditLogTab ? (
            /* ===== NEW: AUDIT LOG TABLE (fixed columns + View Changes) ===== */
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Table
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Offer ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Action Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Changed By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(tableData as OfferAuditLogRow[]).map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedAuditRow(row)}
                          className="px-3 py-1.5 text-sm font-semibold text-white bg-orange-400 rounded hover:bg-orange-500 transition-colors"
                        >
                          View Changes
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {row.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {row.table_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {row.offer_id}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            row.action === "CREATE"
                              ? "bg-green-100 text-green-700"
                              : row.action === "DELETE"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {row.changed_by}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                        title={row.created_at}
                      >
                        {row.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (

          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {(selectedTable === "offers" ||
                    selectedTable === "offer_rules" ||
                    selectedTable === "offer_limits") && (
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      Action
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {(selectedTable === "offers" ||
                      selectedTable === "offer_rules" ||
                      selectedTable === "offer_limits") && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(selectedTable === "offers" ||
                            selectedTable === "offer_rules" ||
                            selectedTable === "offer_limits") && (
                            <button
                              type="button"
                              // onClick={() => onEditOffer(row)}
                              onClick={() => {
                                if (selectedTable === "offers") {
                                  onEditOffer(row);
                                } else if (selectedTable === "offer_rules") {
                                  onEditRule(row);
                                } else {
                                  onEditLimit(row);
                                }
                              }}
                              className="px-4 py-1.5 text-sm font-semibold text-white bg-orange-400 rounded hover:bg-orange-500 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        {row[col] !== null && row[col] !== undefined
                          ? String(row[col])
                          : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* ===== PAGINATION ===== */}
          <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1} |{" "}
              {(currentPage - 1) * limit + 1}–
              {Math.min(currentPage * limit, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              {pageNumbers.map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => loadData(page as number)}
                    className={`px-3 py-1 border rounded text-sm ${page === currentPage ? "bg-orange-500 text-white border-orange-500" : "hover:bg-gray-50"}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => loadData(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value, 10);
                  setLimit(newLimit);
                  loadData(1, newLimit);
                }}
                className="border rounded p-1"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        !loading && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <p>No data to display for {activeLabel}.</p>
            <p className="text-sm mt-1">Adjust filters or click Search.</p>
          </div>
        )
      )}

      {loading && tableData.length === 0 && (
        <div className="text-center py-12 text-gray-500">Loading data...</div>
      )}
      {/* ===== NEW: AUDIT LOG DIFF MODAL (Key / Old / New) ===== */}
      {selectedAuditRow && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAuditRow(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Change Details — {selectedAuditRow.offer_id}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Table: <strong>{selectedAuditRow.table_name}</strong> •
                  Action: <strong>{selectedAuditRow.action}</strong> • By:{" "}
                  <strong>{selectedAuditRow.changed_by}</strong> •{" "}
                  {selectedAuditRow.created_at}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditRow(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
              >
                ×
              </button>
            </div>
 
            <div className="overflow-y-auto p-4">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-1/4">
                      Key
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-[37.5%]">
                      Old
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase w-[37.5%]">
                      New
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {diffRows.map((d) => (
                    <tr
                      key={d.key}
                      className={d.changed ? "bg-yellow-50" : ""}
                    >
                      <td className="px-4 py-2 text-sm font-medium text-gray-700 align-top break-all">
                        {d.key}
                      </td>
                      <td
                        className={`px-4 py-2 text-sm align-top break-all ${
                          d.changed
                            ? "text-red-600 line-through decoration-red-300"
                            : "text-gray-600"
                        }`}
                      >
                        {d.oldVal}
                      </td>
                      <td
                        className={`px-4 py-2 text-sm align-top break-all ${
                          d.changed
                            ? "text-green-700 font-semibold"
                            : "text-gray-600"
                        }`}
                      >
                        {d.newVal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
 
            <div className="p-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditRow(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
