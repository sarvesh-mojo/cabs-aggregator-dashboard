// import React from 'react'

// const RideLogs = () => {
//   return (
//     <div>RideLogs</div>
//   )
// }

// export default RideLogs


import { useEffect, useState } from "react";
import { Table, Tabs, Spin, Button, Modal } from "antd";
import dayjs from "dayjs";
import { useSelector } from "react-redux";

import { GETBOOKING_LOGS } from "../../../config/customerCare/operationsApicall";
import { RangerPicker } from "../../../components/common/RangePicker";
import { CsvDownload } from "../../../components/common/CsvDownload";
import { PartnerTab } from "../../../components/common/PartnerTab"; 

const RideLogs = () => {

  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "mojo";

  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState("OUTSTATION");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return [today, today];
  });

  const fetchBookings = async (
    page = pagination.current,
    limit = pagination.pageSize
  ) => {
    try {
      setLoading(true);

      const payload = {
        bookingId: "",
        page,
        limit,
        startHour: 0,
        endHour: 23,
        status: "BOOKING_CONFIRMED",
        startDate: dateRange[0],
        endDate: dateRange[1],
        filterBy: "createdAt",

        ...(activeTab === "OUTSTATION"
          ? {
              journeyType: "OUTSTATION",
            }
          : {}),
      };

   
      const response: any = await GETBOOKING_LOGS(selectedPartner, payload);

      let bookings = response?.bookings || [];

      // Premium Ride Filter
      if (activeTab === "PREMIUM") {
        bookings = bookings.filter((item: any) => {
          const vehicleType = item?.vehicleType?.toLowerCase() || "";
          return (
            vehicleType.includes("suv") ||
            vehicleType.includes("innova") ||
            vehicleType.includes("crysta") ||
            vehicleType.includes("xuv") ||
            vehicleType.includes("ertiga")
          );
        });
      }

      setBookingData(bookings);
      setTotalRecords(response?.totalRecords || bookings.length);
    } catch (error) {
      console.error("RideLogs Error:", error);
      setBookingData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    fetchBookings();
  }, [activeTab, pagination.current, pagination.pageSize, dateRange, selectedPartner]);

  const handleRangeChange = (range: [string, string]) => {
    setDateRange(range);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const loadCSVData = async (): Promise<any[]> => {
    const PAGE_SIZE = 10;
    const totalToFetch = totalRecords > 0 ? totalRecords : PAGE_SIZE;
    const totalPages = Math.ceil(totalToFetch / PAGE_SIZE);
    
    let allBookings: any[] = [];
    
    try {
      const fetchPromises = [];
      
      for (let p = 1; p <= totalPages; p++) {
        const payload = {
          bookingId: "",
          page: p,
          limit: PAGE_SIZE,
          startHour: 0,
          endHour: 23,
          status: "BOOKING_CONFIRMED",
          startDate: dateRange[0],
          endDate: dateRange[1],
          filterBy: "createdAt",
          ...(activeTab === "OUTSTATION" ? { journeyType: "OUTSTATION" } : {}),
        };
       
        fetchPromises.push(GETBOOKING_LOGS(selectedPartner, payload));
      }

      const results = await Promise.all(fetchPromises);

      results.forEach((response: any) => {
        let bookings = response?.bookings || [];
        
        if (activeTab === "PREMIUM") {
          bookings = bookings.filter((item: any) => {
            const vehicleType = item?.vehicleType?.toLowerCase() || "";
            return (
              vehicleType.includes("suv") ||
              vehicleType.includes("innova") ||
              vehicleType.includes("crysta") ||
              vehicleType.includes("xuv") ||
              vehicleType.includes("ertiga")
            );
          });
        }
        allBookings = [...allBookings, ...bookings];
      });

    } catch (err) {
      console.error("CSV fetch error:", err);
    }

    return allBookings.map((row: any) => ({
      bookingId: row.bookingId,
      mobile: row.mobile,
      bookingTime: row.bookingTime ? dayjs(row.bookingTime).format("DD MMM YYYY, hh:mm A") : "-",
      sourceAddress: row.sourceAddress,
      destinationAddress: row.destinationAddress,
      cityCode: row.cityCode,
      kilometer: row.kilometer ? `${Number(row.kilometer).toFixed(1)} KM` : "-",
      cabPartner: row.cabPartner,
      fareBreakup: row.totalFare || 0, 
    }));
  };

  const columns: any = [
    {
      title: "Booking ID",
      dataIndex: "bookingId",
      key: "bookingId",
      width: 220,
    //   fixed: "left",
    },
    {
      title: "Mobile Number",
      dataIndex: "mobile",
      key: "mobile",
      width: 150,
    },
    {
      title: "Booking Date & Time",
      dataIndex: "bookingTime",
      key: "bookingTime",
      width: 180,
      render: (value: string) =>
        value ? dayjs(value).format("DD MMM YYYY, hh:mm A") : "-",
    },
    {
      title: "Pickup Point",
      dataIndex: "sourceAddress",
      key: "sourceAddress",
      width: 300,
    },
    {
      title: "Destination Point",
      dataIndex: "destinationAddress",
      key: "destinationAddress",
      width: 300,
    },
    {
      title: "City",
      dataIndex: "cityCode",
      key: "cityCode",
      width: 120,
    },
    {
      title: "KM",
      dataIndex: "kilometer",
      key: "kilometer",
      width: 120,
      render: (value: number) =>
        value ? `${Number(value).toFixed(1)} KM` : "-",
    },
    {
      title: "Cab Partner",
      dataIndex: "cabPartner",
      key: "cabPartner",
      width: 150,
    },
    {
      title: "Fare With Breakup",
      key: "fareBreakup",
      width: 280,
      render: (_: any, record: any) => {
        const fare = record?.fareDetails || {};
        return (
          <div style={{ fontSize: "12px" }}>
            <div>
              <strong>Total:</strong> ₹{record?.totalFare || 0}
            </div>
            <div>Base Fare: ₹{fare?.baseFare || 0}</div>
            <div>Tax: ₹{fare?.tax || 0}</div>
            <div>Toll: ₹{fare?.tollCharges || 0}</div>
            <div>Service: ₹{fare?.serviceCharge || 0}</div>
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 120,
    //   fixed: "right",
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedBooking(record);
            setModalVisible(true);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  const csvHeaders = columns.filter((col: any) => col.key !== "action");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between px-1 pt-2 gap-0">
      <PartnerTab propsData={{ isall: false }} />
       <div className="flex justify-end gap-3 mb-4">
            <CsvDownload
              Headcolumns={csvHeaders}
              filename={`RideLogs_${selectedPartner}_${activeTab}_${dateRange[0]}_${dateRange[1]}.csv`}
              loadCSVData={loadCSVData}
            />

            <RangerPicker 
              updateDate={dateRange} 
              selectedRange={handleRangeChange} 
            />
          </div>
          </div>

      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mt-2">
          <h2 className="text-xl font-semibold mb-4">Ride Logs</h2>

          <Tabs
            activeKey={activeTab}
            onChange={(value) => {
              setActiveTab(value);
              setPagination({
                current: 1,
                pageSize: 10,
              });
            }}
            items={[
              {
                key: "OUTSTATION",
                label: "Outstation Rides",
              },
              {
                key: "PREMIUM",
                label: "Premium Rides",
              },
            ]}
          />
          
         

          <Spin spinning={loading}>
            <Table
              bordered
              rowKey={(record: any) => record.bookingId}
              columns={columns}
              dataSource={bookingData}
              size="small"           
              style={{ fontSize: "13px" }}
              scroll={{
                x: 1800,
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: totalRecords,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Total ${total} bookings`,
                onChange: (page, pageSize) => {
                  setPagination({
                    current: page,
                    pageSize,
                  });
                },
              }}
            />
          </Spin>
        </div>

        <Modal
          open={modalVisible}
          footer={null}
          width={1200}
          title={`Booking Details - ${selectedBooking?.bookingId || ""}`}
          onCancel={() => setModalVisible(false)}
        >
          <pre
            style={{
              maxHeight: "70vh",
              overflow: "auto",
              background: "#f5f5f5",
              padding: "16px",
              borderRadius: "8px",
              fontSize: "13px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(selectedBooking, null, 2)}
          </pre>
        </Modal>
      </div>
    </>
  );
};

export default RideLogs;