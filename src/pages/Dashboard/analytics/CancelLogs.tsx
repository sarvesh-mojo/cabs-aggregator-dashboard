import { useEffect, useState, useCallback } from "react";
import { LogsTable } from "../../../components/tables/LogsTable";
import { GETBOOKING_LOGS } from "../../../config/customerCare/operationsApicall";
import { Booking } from "../../../config/customerCare/interfaceTypes";
import { useSelector } from "react-redux";
import { PartnerTab } from "../../../components/common/PartnerTab";

export const CancelLogs = () => {


  const columns = [
    {
      title: "Booking Id",
      dataIndex: "bookingId",
      key: "bookingId",
    },
    {
      title: "Phone Number",
      dataIndex: "mobile",
      key : "mobile" , 
    },
    {
      title: "Cab Partner",
      dataIndex: "cabPartner",
      key: "cabPartner",
    },
    {
      title: "Booking Time",
      dataIndex: "bookingTime",
      key: "bookingTime",
    },
    {
      title: "Pickup time",
      dataIndex: "pickupTime",
      key: "pickupTime",
      render: (text: string) => {
        return <p>{text?.replace("T", " ").replace(".000Z", "")}</p>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text: string) => {
        return <p className="text-red-500">{text?.toLowerCase()}</p>;
      },
    },
     {
      title: "Cancellation Time",
      dataIndex: "cancellationTime",
      key: "cancellationTime",
    },
    {
      title: "source",
      dataIndex: "sourceAddress",
      key: "sourceAddress",
      width: 300,
    },
    {
      title: "Destination",
      dataIndex: "destinationAddress",
      key: "destinationAddress",
      width: 200,
    },
    {
      title: "destination City",
      dataIndex: "cityCode",
      key: "cityCode",
    },
    {
      title: "Travel Type",
      dataIndex: "travelType",
      key: "travelType",
    },
    {
      title: "Distance KM",
      dataIndex: "kilometer",
      key: "kilometer",
    },
    {
      title: "Basefare",
      dataIndex: "fareDetails",
      key: "fareDetails",
      render: (_: unknown, record: Booking) => {
        return <p>{record?.fareDetails?.baseFare}</p>;
      },
    },
    {
      title: "Tax",
      dataIndex: "fareDetails",
      key: "fareDetails",
      render: (_: unknown, record: Booking) => {
        return <p>{record?.fareDetails?.tax}</p>;
      },
    },
    {
      title: "Toll Charge",
      dataIndex: "tollCharges",
      key: "tollCharges",
      render: (_: unknown, record: Booking) => {
        return <p>{record?.fareDetails?.tollCharges}</p>;
      },
    },
    {
      title: "Total Fare",
      dataIndex: "totalFare",
      key: "totalFare",
    },
    {
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
    },
    {
      title: "Vehicle Type",
      dataIndex: "vehicleType",
      key: "vehicleType",
    },
    {
      title: "Extra PerKm",
      dataIndex: "extraPerKm",
      key: "extraPerKm",
    },
    
  ];
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "mojo";

  const [totalRecords, setTotalRecords] = useState<number>(0);
  // const [dateRange, setDateRange] = useState<[string, string]>(() => {
  //   if (OperationstoreData?.SelectedDateRange?.length === 2 && OperationstoreData.SelectedDateRange[0]) {
  //     return OperationstoreData.SelectedDateRange;
  //   }
  //   const today = new Date().toLocaleDateString("en-CA");
  //   return [today, today];
  // });

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
  const today = new Date().toLocaleDateString("en-CA");
  return [today, today];
});

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [LogsData, setLogsData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const { logsPartner } = useSelector((state: any) => state?.authStore);

  const FetchAPI = useCallback(async (selectedPartner: string) => {
    setLoading(true);
    try {
      const pageLimit =
        selectedPartner === "ixigo" ? 20 : pagination.pageSize;

      const bodyPayload: any = {
        bookingId: "",
        page: pagination.current,
        startHour: 0,
        endHour: 23,
        limit: pageLimit,
        status: "CANCELLED",
        startDate: dateRange[0],
        endDate: dateRange[1],
        filterBy: "updatedAt",
      };

      if (logsPartner && logsPartner !== "") {
        bodyPayload.cabPartner = logsPartner;
      }

      const LogsResp: any = await GETBOOKING_LOGS(selectedPartner, bodyPayload);
      setLogsData(LogsResp?.bookings ?? []);
      const total = Number(LogsResp?.totalRecords) ?? 0;
      setTotalRecords(total);
      setPagination((prev) => ({ ...prev, total }));
    } catch (err) {
      setLogsData([]);
      setTotalRecords(0);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [dateRange[0], dateRange[1], pagination.current, pagination.pageSize]);

  useEffect(() => {
    FetchAPI(selectedPartner);
  }, [FetchAPI, selectedPartner]);

  const handleRangeChange = (range: [string, string]) => {
    setDateRange(range);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };



  return (
    <>
      <PartnerTab propsData={{ isall: false }} />
      <LogsTable
        columns={columns}
        dataSource={LogsData}
        loading={loading}
        pagination={{
          current: pagination.current,
          // pageSize: 10,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: false,
          showTotal: (total: number) => `Total ${total} records`,
        }}
        onPaginationChange={handleTableChange}
        updateDate={dateRange}
        selectedRange={handleRangeChange}
        totalCount={totalRecords}
        title="Cancel Logs"
        type="CANCELLED"
        DownloadCSV={true}
        filename="cancel_logs.csv"
        filterBy="updatedAt"
      />
    </>
  );
};
