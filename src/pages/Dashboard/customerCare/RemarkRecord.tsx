import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { GenericTablePayload } from "../../../config/types";
import PageMeta from "../../../components/common/PageMeta";
import { CUSTOM_GENERIC_TABLE } from "../../../config/customerCare/operationsApicall";
import DataTable from "../../../components/tables/DataTable";
import { PartnerTab } from "../../../components/common/PartnerTab";

const RemarkRecords = () => {
  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "mojo";

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [columns, setColumns] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [pagination, setPagination] = useState<{
    current: number;
    pageSize: number;
  }>({
    current: 1,
    pageSize: 10,
  });

  const fetchData = async (page: number, limit: number) => {
    setLoading(true);
    try {
      const payload: GenericTablePayload = {
        table: "ops_booking_remarks",
        page: page,
        limit: limit,
      };

      const res = await CUSTOM_GENERIC_TABLE(selectedPartner, payload);

      let dataArray: any[] = [];
      let currentTotalCount = 0;

      if (res?.code === 200 && Array.isArray(res.data)) {
        dataArray = res.data;
        currentTotalCount = res.pagination?.totalCount ?? dataArray.length;
      } else if (res?.data) {
        dataArray = Array.isArray(res.data) ? res.data : [res.data];
        currentTotalCount = dataArray.length;
      }

      setData(dataArray);
      setTotalRecords(currentTotalCount);
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize: limit,
      }));

      if (dataArray.length > 0) {
        const firstItem = dataArray[0];
        const excludeKeys = ["updatedAt"];
        const dynamicCols = Object.keys(firstItem)
          .filter((k) => !excludeKeys.includes(k))
          .map((key) => ({
            title: key.toUpperCase(),
            dataIndex: key,
            key: key,
            render: (text: any) => {
              if (text === null || text === undefined) return "-";
              return typeof text === "object"
                ? JSON.stringify(text).substring(0, 50) + "..."
                : String(text).substring(0, 50);
            },
          }));
        setColumns(dynamicCols);
      }
    } catch (error) {
      console.error("Failed to fetch Remark Records", error);
      setData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize);
  }, [pagination.current, pagination.pageSize, selectedPartner]);

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize || 10,
    });
  };

  return (
    <div className="p-4">
      <PageMeta title="Remarks Records" description="Remarks Records" />
      <PartnerTab/>
      <div className="bg-white p-6 rounded shadow-sm">
        <DataTable
          title="Remarks Records"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: totalRecords,
            showTotal: (total) => `Total ${total} records`,
          }}
          onChange={handleTableChange}
        />
      </div>
    </div>
  );
};

export default RemarkRecords;
