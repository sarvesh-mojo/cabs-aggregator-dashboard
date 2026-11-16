import React, { useEffect, useState } from "react";
import { Modal, Descriptions } from "antd";
import dayjs from "dayjs";

import DataTable from "../tables/DataTable";
import {
  GET_VIP_BOOKINGS,
  GETBOOKING_LOGS,
  GET_NPS_RECORDS,
} from "../../config/customerCare/operationsApicall";
import ConditionalTab from "../../components/customerCare/ConditionalTab";
import { STATUS_TABS } from "../../config/customerCare/constant";
import {
  Booking,
  BookingsProps,
} from "../../config/customerCare/interfaceTypes";
import { useDispatch, useSelector } from "react-redux";
import { SaveActivePartner } from "../../Redux/slices/operationSlice";
// import { AllCombineBookingResponse } from "../../config/types";
import BookingStatistics from "./BookingStatistics";
import { AscendingPickupTime, sortBookingsByRecentCreated } from "../../config/customerCare/helper";
import { DatatableColumns, NpsColumns, normalizeBookingRecords, resolveRemarkApiPartner } from "../tables/columns";
import { store } from "../../Redux/store";
import { dedupeBookingsById } from "../../utils/dedupeBookings"; 

const BookingTableWrapper: React.FC<BookingsProps> = ({ propsData }) => {
  const dispatch = useDispatch();
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const AuthstoreData = useSelector((state: any) => state?.authStore);

  const [BookingData, setBookingData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>(
    OperationstoreData?.selectedPartner ||
      (AuthstoreData?.login_partners?.length > 1
        ? "all"
        : AuthstoreData?.login_partners?.[0]) ||
      "mojo",
  );
  // const [pagination, setPagination] = useState<{
  //   current: number;
  //   pageSize: number;
  // }>({
  //   current: 1,
  //   pageSize: 10,
  // });
  const [pagination, setPagination] = useState<any>({
    current: 1,
    pageSize: 10,
    total: 0
    
  });
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [jsonModalVisible, setJsonModalVisible] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  

  // const [dateRange, setDateRange] = useState<[string, string]>(() => {
  //   if (OperationstoreData?.SelectedDateRange?.length === 2 && OperationstoreData.SelectedDateRange[0]) {
  //     return OperationstoreData.SelectedDateRange;
  //   }
  //   const today = new Date().toLocaleDateString("en-CA");
  //   return [today, today];
  // });

  // Sync dateRange when Redux data changes (e.g. after login or 1s delay)
  // useEffect(() => {
  //   if (OperationstoreData?.SelectedDateRange?.length === 2 && OperationstoreData.SelectedDateRange[0]) {
  //     setDateRange(OperationstoreData.SelectedDateRange);
  //   }
  // }, [OperationstoreData?.SelectedDateRange]);

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
  const today = new Date().toLocaleDateString("en-CA");
  return [today, today];
});

  const [hours, setHours] = useState<number>(24);
  const [paymentType, setPaymentType] = useState("");
  const [partner, setPartner] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<string>("BOOKING_CONFIRMED");
  const [journeyType, setJourneyType] = useState("");


  // Re-render component / api on every time these state change
  useEffect(() => {
    if (!activeTab) return;
    const controller = new AbortController();
    fetchData(pagination?.current, pagination?.pageSize, controller.signal);
    return () => controller.abort();
  }, [
    search,
    activeTab,
    pagination?.current,
    pagination?.pageSize,
    dateRange[0],
    dateRange[1],
    selectedStatus,
    hours,
    partner,
    journeyType,
  ]);

  // Reload live data in every 5 min
  useEffect(() => {
    if (!activeTab) return;
    const interval = setInterval(() => {
      fetchData(pagination?.current, pagination?.pageSize);
    }, 300000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async (
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal,
  ) => {
    setLoading(true);

    const isNpsTab = selectedStatus === "NPS";

    if (isNpsTab) {
      try {
        let pToHit = activeTab.toLowerCase() === "all" ? (AuthstoreData?.login_partners?.[0] || "mojo") : activeTab;
        const payload = {
          page: page,
          limit: limit,
          search: search || "",
          startDT: dateRange[0],
          endDT: dateRange[1]
        };

        const res: any = await GET_NPS_RECORDS(pToHit, payload);

        if (signal?.aborted) return;

        let rawRecords = [];
        let total = 0;
        const resData = res?.data || res;
        const paginationObj = resData?.pagination || res?.pagination;

        if (resData?.reviews && Array.isArray(resData.reviews)) {
          rawRecords = resData.reviews;
        } else if (resData?.data && Array.isArray(resData.data)) {
          rawRecords = resData.data;
        } else if (Array.isArray(resData)) {
          rawRecords = resData;
        }

        total = paginationObj?.totalCount || resData?.totalCount || res?.totalCount || resData?.totalRecords || rawRecords.length;

        // Add our robust key and map the data so columns don't break
        const mappedData = rawRecords.map((item: any, index: number) => ({
          ...item,
          key: String(item.id || item.ID || item.bookingId || item.BOOKINGID || `nps-row-${page}-${index}`),
          bookingId: item.bookingId || item.bookingid || item.BOOKINGID || "-",
          userName: item.customerName || item.CUSTOMERNAME || item.userName || "-",
          mobile: item.mobile || item.MOBILE || "-",
          email: item.email || item.EMAIL || "-",
          cabPartner: item.partnerName || item.partner_name || item.PARTNER_NAME || item.cabPartner || "-",
          trackingUrl: item.trackingUrl || item.tracking_url || "",
          opsRemarks: item.opsRemarks || item.ops_remarks || null,
          remarkCount: item.remarkCount || item.remark_count || 0,
          npsData: {
            ...item,
            rating: item.rating ?? item.RATING ?? null,
            review: item.review ?? item.REVIEW ?? "-",
            pre_def_review: item.pre_def_review ?? item.PRE_DEF_REVIEW ?? "-",
            createdAt: item.createdAt ?? item.CREATEDAT
          },
        }));

        setBookingData(mappedData);
        setTotalRecords(total);
        setPagination((prev: any) => ({ ...prev, current: page, pageSize: limit, total }));
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error(err);
        setBookingData([]);
        setTotalRecords(0);
        setPagination((prev: any) => ({ ...prev, total: 0 }));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
      return;
    }

    if (activeTab === "all") {
      limit = 10;
    }

    let startHour, endHour;

    const currentHour = new Date().getHours();
    const TodayDate = dayjs().format("YYYY-MM-DD");

    if (propsData?.type == "Next2hrBookings") {
      if (currentHour == 23) {
        endHour = 23;
      } else {
        endHour = (currentHour + 2) % 24;
      }
      startHour = currentHour;
    } else {
      if (hours === 24) {
        startHour = 0;
        endHour = 23;
      } else {
        startHour = currentHour;
        endHour = currentHour + hours;

        if (endHour >= 24) endHour = 23;
      }
    }

    if (propsData?.type === "TodayAllPickups") {
      startHour = 0;
      endHour = 23;
    }

    let startDate =
      propsData?.type === "Next2hrBookings" ||
        propsData?.type === "TodayAllPickups"
        ? TodayDate
        : dateRange[0];
    let endDate =
      propsData?.type === "Next2hrBookings" ||
        propsData?.type === "TodayAllPickups"
        ? TodayDate
        : dateRange[1];


    try {
      let bodyPayload: any = '';
      if (search) {
        bodyPayload = {
          bookingId: search,
          page,   
          limit,
        }
      } else {
        bodyPayload = {
          bookingId: '',
          page,
          limit,
          startHour,
          endHour,
          // status: (propsData?.type === "DelayRides") ? "BOOKING_CONFIRMED" :  selectedStatus,
          status: selectedStatus,
          startDate,
          endDate,
          ...(journeyType ? { journeyType: journeyType } : {}),
          ...(propsData?.type === "Next2hrBookings"
            ? { cabTripStarted: "false" }
            : ""),
          ...(propsData?.type === "ActiveRides" ? { activeRides: "true" } : ""),
          ...(propsData?.type === "DelayRides"
            ? { delay: "true" }
            : propsData?.type === "Next2hrBookings"
              ? { delay: "false" }
              : ""),
          ...(partner &&  partner.toLowerCase() != "all"
            ? { cabPartner: partner }
            : ""),
        };
      }

      let LogsResp: any = [];

      // If We have to show all partners bookings together
      // if (activeTab === "all") {
      //   const partnerList = AuthstoreData?.login_partners;
      //   let mergedBookings: any[] = [];
      //   let total = 0;

      //   let resp: AllCombineBookingResponse = {};

      //   for (const p of partnerList) {
      //     try {
      //       if (propsData?.type == "VIPBookings") {
      //         const QueryParams = {
      //           date: TodayDate,
      //           type: "vip",
      //         };

      //         resp = await GET_VIP_BOOKINGS(p, QueryParams);
      //       } else {
      //         resp = await GETBOOKING_LOGS(p, bodyPayload);
      //       }
      //       mergedBookings = [...mergedBookings, ...resp?.bookings];
      //       if (total < resp?.totalRecords) {
      //         total = resp?.totalRecords;
      //       }
      //       // total += resp?.totalRecords;
      //     } catch (err) {
      //       console.error(`Error fetching for partner ${p}`, err);
      //     }
      //   }

      //   LogsResp = {
      //     bookings: mergedBookings,
      //     totalRecords: total,
      //   };
      //   LogsResp = AscendingPickupTime(LogsResp);
      // }

      if (activeTab === "all") {
  const bacSubTabs = [
    "bac_agent",
    "bac_mb",
    "bac_yatra",
    "bac_corp",
    "bac_swiggy",
    "bac_agentic_chat_dev",
    "bac_agentic_chat",
  ];
  const partnerList = (AuthstoreData?.login_partners || []).filter(
    (p: string) => !bacSubTabs.includes(p),
  );

  let mergedBookings: any[] = [];
  let total = 0;

  //  Fetch enough records for current page
  const requiredRecords = page * limit;

  const results = await Promise.all(
    partnerList.map(async (p: string) => {
      try {
        if (propsData?.type == "VIPBookings") {
          return await GET_VIP_BOOKINGS(p, {
            date: TodayDate,
            type: "vip",
          });
        }
        return await GETBOOKING_LOGS(
          p,
          {
            ...bodyPayload,
            page: 1,
            limit: requiredRecords,
          },
          signal,
        );
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") throw err;
        console.error(`Error fetching for partner ${p}`, err);
        return null;
      }
    }),
  );

  if (signal?.aborted) return;

  results.forEach((resp: any) => {
    if (!resp) return;
    mergedBookings = [...mergedBookings, ...(resp?.bookings || [])];
    total += resp?.totalRecords || 0;
  });

  mergedBookings = dedupeBookingsById(mergedBookings);
  if (search) total = mergedBookings.length;

  const sorted = (search ? sortBookingsByRecentCreated : AscendingPickupTime)({
    bookings: mergedBookings,
  });

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

const sortedData = Array.isArray(sorted) ? sorted : sorted.bookings;

const paginatedData = sortedData.slice(startIndex, endIndex);

  setBookingData(normalizeBookingRecords(paginatedData));
  setTotalRecords(total);
  setPagination((prev: any) => ({
    ...prev,
    total,
  }));

  setLoading(false);
 return;
}

      // Call this api only in case of VIP bookings
      else if (propsData?.type == "VIPBookings") {
        const QueryParams = {
          date: TodayDate,
          type: "vip",
        };

        LogsResp = await GET_VIP_BOOKINGS(activeTab, QueryParams);
        LogsResp = search
          ? sortBookingsByRecentCreated(LogsResp)
          : AscendingPickupTime(LogsResp);
      } else {
        // Single partner request
        LogsResp = await GETBOOKING_LOGS(activeTab, bodyPayload, signal);
        LogsResp = search
          ? sortBookingsByRecentCreated(LogsResp)
          : AscendingPickupTime(LogsResp);
      }

      setBookingData(normalizeBookingRecords(LogsResp?.bookings));
      setTotalRecords(LogsResp?.totalRecords);
      setPagination((prev: any) => ({
        ...prev,
        total: LogsResp?.totalRecords,
      }));
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error(err);
      let dataresp = err?.response?.data;
      if (dataresp) {
        setBookingData(normalizeBookingRecords(dataresp?.data));
        setTotalRecords(0);
        setPagination((prev: any) => ({
          ...prev,
          total: 0,
        }));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleTableChange = (newPagination: any) => {
    setPagination((prev: any) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // View Details Modal
  const handleViewDetails = (record: Booking) => {
    setSelectedBooking(record);
    setModalVisible(true);
  };

  // Update Route
  const handleUpdate = (record: Booking) => {
    const { selectedPartner } = store.getState().operationStore;
    const fromBooking = resolveRemarkApiPartner(record, selectedPartner);
    let IdentifyPartner =
      fromBooking !== "not found"
        ? fromBooking
        : record?.trackingUrl?.includes("ixigo")
          ? "ixigo"
          : record?.trackingUrl?.includes("indigo")
            ? "indigo"
            : selectedPartner;
    if (IdentifyPartner === "all") IdentifyPartner = "indigo";

    window.location.href = `/dashboard/customerCare/HandleBooking?bookingId=${IdentifyPartner}-${record?.bookingId}`;
  };

  // Show JSON Modal
  const handleShowJSON = (record: Booking) => {
    setSelectedBooking(record);
    setJsonModalVisible(true);
  };

  const handleFilters = (values: any) => {
    setHours(values?.hours);
    setPaymentType(values?.paymentType);
    setPartner(values?.partner);
    // call API again here
    setJourneyType(values?.journeyType);
  };

  const isNpsTab = selectedStatus === "NPS";
  const columns = isNpsTab
    ? NpsColumns(activeTab)
    : DatatableColumns(
      { ...propsData, activePartner: activeTab },
      handleViewDetails,
      handleShowJSON,
      handleUpdate,
    );

  return (
    <div className="p-2 mt-3 ">
      <ConditionalTab
        BookingData={BookingData}
        activeTab={activeTab}
        STATUS_TABS={STATUS_TABS}
        totalRecords={totalRecords}
        onChangeTab={(tab) => {
          dispatch(SaveActivePartner(tab));
          setActiveTab(tab);
        }}
        onChangeDateRange={(range) => setDateRange(range)}
        onChangeStatus={(status) => setSelectedStatus(status)}
        dateRange={dateRange}
        selectedStatus={selectedStatus}
        hours={hours}
        paymentType={paymentType}
        partner={partner}
        journeyType={journeyType}
        onApplyFilters={handleFilters}
      />

      {propsData?.type !== "ActiveRides" && <BookingStatistics />}

      <div style={{ overflowX: "auto", width: "100%vw" }}>
        <DataTable
          title={`${activeTab?.toUpperCase()} Bookings`}
          columns={columns}
          dataSource={BookingData}
          loading={loading}
          rowKey={isNpsTab ? "key" : undefined}
          pagination={{
            ...pagination,
            total: totalRecords,
            showTotal: (total) => `Total ${total} 
            ${isNpsTab ? "NPS records" : "bookings"}`,
          }}
          onChange={handleTableChange}
          showSearch
          onSearch={setSearch}
        />
      </div>

      {/* Booking Details Modal */}
      <Modal
        open={modalVisible}
        title="Booking Details"
        footer={null}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        {selectedBooking ? (
          <Descriptions bordered column={2} size="small">
            {Object.entries(selectedBooking)?.map(([key, value]) => (
              <Descriptions.Item label={key} key={key}>
                {typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <p>No data available.</p>
        )}
      </Modal>

      {/* JSON Modal */}
      <Modal
        open={jsonModalVisible}
        title="Booking JSON"
        footer={null}
        onCancel={() => setJsonModalVisible(false)}
        width={800}
      >
        <pre
          style={{
            background: "#f8f8f8",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          {JSON.stringify(selectedBooking, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};

export default BookingTableWrapper;
