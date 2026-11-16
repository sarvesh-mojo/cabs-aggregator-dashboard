import { useEffect, useState, useCallback, useMemo } from "react";
import { LogsTable } from "../../../components/tables/LogsTable";
import { GETBOOKING_LOGS } from "../../../config/customerCare/operationsApicall";
import { Booking } from "../../../config/customerCare/interfaceTypes";
import { useSelector } from "react-redux";
import { PartnerTab } from "../../../components/common/PartnerTab";
import { AvailablecabPartners } from "../../../config/customerCare/constant";
import { Typography } from "antd";
import { filterIndigoOnlyLogColumns, filterSwiggyOpsLogColumns, resolveLockedCabPartners } from "../../../utils/partnerAccess";
import { getListingFeeShareLabel } from "../../../utils/partnerDisplayLabels";
import {
  formatEngagementReserveInr,
  formatLogAmount,
  getConversionRateColumnValue,
  getIbcBurnPercentColumnValue,
  getIbcEarnColumnValue,
  getLoyaltyPointsColumnValue,
} from "../../../utils/logCommercialDisplay";

const { Paragraph } = Typography;

type IbcFareDisplayItem = {
  label?: string;
  key?: string;
  value?: string | number;
  voucher_code?: string;
  bank_name?: string;
};

function getIbcFareDisplayItems(
  record: Booking,
  ibcKey: string,
): IbcFareDisplayItem[] {
  const items = (record as { ibcFareDisplay?: IbcFareDisplayItem[] })
    .ibcFareDisplay;
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item?.key === ibcKey);
}

function getIbcFareDisplayValue(
  record: Booking,
  ibcKey: string,
): string | number | undefined {
  const value = getIbcFareDisplayItems(record, ibcKey)[0]?.value;
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}

function sumIbcFareDisplayValues(
  record: Booking,
  ibcKey: string,
): number | undefined {
  const items = getIbcFareDisplayItems(record, ibcKey);
  if (!items.length) return undefined;
  return items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
}

function getVoucherPointsRedeemed(record: Booking): string | number | undefined {
  const fromDisplay = sumIbcFareDisplayValues(record, "ibc_voucher");
  if (fromDisplay != null) return fromDisplay;
  const fromField = (record as { voucherPointsRedeemed?: number | string })
    .voucherPointsRedeemed;
  if (fromField === null || fromField === undefined || fromField === "") {
    return undefined;
  }
  return fromField;
}

function getVoucherName(record: Booking): string | undefined {
  const fromField = (record as { voucherName?: string | null }).voucherName;
  if (fromField) return fromField;
  const names = getIbcFareDisplayItems(record, "ibc_voucher")
    .map((item) => {
      const code = item.voucher_code?.trim();
      const bank = item.bank_name?.trim();
      if (bank && code) return `${bank} (${code})`;
      return code || bank;
    })
    .filter(Boolean);
  return names.length ? names.join(", ") : undefined;
}

function getIbcPointsRedeemed(record: Booking): string | number | undefined {
  const fromField = (record as { ibcPointsRedeemed?: number | string })
    .ibcPointsRedeemed;
  if (fromField !== null && fromField !== undefined && fromField !== "") {
    return fromField;
  }
  const points = getIbcFareDisplayValue(record, "ibc_points");
  if (points != null) return points;
  const items = (record as { ibcFareDisplay?: IbcFareDisplayItem[] })
    .ibcFareDisplay;
  return Array.isArray(items) && items.length ? 0 : undefined;
}

function getIbcRedemptionFee(record: Booking): string | number | undefined {
  return (
    getIbcFareDisplayValue(record, "redemptoon_fee") ??
    getIbcFareDisplayValue(record, "redemption_fee")
  );
}

export const ConversionLogs = () => {
  const [selectedCabPartner, setSelectedCabPartner] = useState<string | null>(
    null,
  );

  <div className="mb-4">
    <select
      value={selectedCabPartner || ""}
      onChange={(e) => {
        setSelectedCabPartner(e.target.value || null);
        setPagination((prev) => ({
          ...prev,
          current: 1,
        }));
      }}
      className="border rounded px-3 py-2"
    >
      <option value="">All Partners</option>

      {AvailablecabPartners.map((partner) => (
        <option key={partner} value={partner}>
          {partner}
        </option>
      ))}
    </select>
  </div>;

  const OperationstoreData = useSelector((state: any) => state?.operationStore);
  const loginUsername = useSelector(
    (state: any) => state.authStore?.login_username,
  );
  const selectedPartner = OperationstoreData?.ReportSelectedPartner || "mojo";

  const columns = [
    {
      title: "Persona",
      dataIndex: "persona",
      key: "persona ",
    },
    {
      title: "Tier",
      dataIndex: "tier",
      key: "tier",
      render: (text: string | null) => <p>{text || "-"}</p>,
    },
    {
      title: "Customer Id",
      dataIndex: "customerId",
      key: "customerId",
      render: (text: string | null) => <p>{text || "-"}</p>,
    },
    {
      title: "Name",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Booking Id",
      dataIndex: "bookingId",
      key: "bookingId",
    },
    {
      title: "Booking Time",
      dataIndex: "bookingTime",
      key: "bookingTime",
      render: (text: string) => {
        return <p>{text?.replace("T", " ").replace(".000Z", "") || "-"}</p>;
      },
    },
    {
      title: "Trip Start Time",
      dataIndex: "pickupTime",
      key: "pickupTime",
      render: (text: string) => {
        return <p>{text?.replace("T", " ").replace(".000Z", "") || "-"}</p>;
      },
    },
    {
      title: "Trip End Time",
      dataIndex: "dropOffTime",
      key: "dropOffTime",
      render: (text: string) => {
        return <p>{text?.replace("T", " ").replace(".000Z", "") || "-"}</p>;
      },
    },
    {
      title: "Device Type",
      key: "deviceType",
      dataIndex: "deviceType",
    },
    //   {
    //   title: "Agent Type",
    //   key: "userAgent",
    //   dataIndex: "userAgent",
    // },
    {
      title: "Agent Type",
      key: "userAgent",
      dataIndex: "userAgent",
      width: 250,
      render: (text: string) => (
        <Paragraph
          style={{ marginBottom: 0 }}
          ellipsis={{
            rows: 1,
            expandable: true,
            symbol: "more",
          }}
        >
          {text || "-"}
        </Paragraph>
      ),
    },
    {
      title: "Payment Mode",
      key: "paymentMode",
      dataIndex: "paymentMode",
    },
    {
      title: "Promotion ",
      dataIndex: "offerCode",
      key: "offerCode",
      render: (_: unknown, record: Booking) => (
        <p>{record?.offerCode || "-"}</p>
      ),
    },
    {
      title: "Promotion Discount %",
      dataIndex: "promotionDiscountPercent",
      key: "promotionDiscountPercent",
      render: (_: unknown, record: Booking) => (
        <p>{record?.promotionDiscountPercent || "-"}</p>
      ),
    },
    {
      title: "Discount Applied ",
      key: "discountApplied",
      dataIndex: "discountApplied",
      render: (text: unknown) => <p>{formatLogAmount(text)}</p>,
    },
    {
      title: "Cab Partner",
      dataIndex: "cabPartner",
      key: "cabPartner",
    },
    {
      title: "Vehicle Type",
      dataIndex: "vehicleType",
      key: "vehicleType",
    },
    // {
    //   title: "Pickup time",
    //   dataIndex: "pickupTime",
    //   key: "pickupTime",
    //   render: (text: string) => {
    //     return <p>{text?.replace("T", " ").replace(".000Z", "")}</p>;
    //   },
    // },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text: string) => {
        return (
          <p
            className="text-green-500 font-bold"
            style={{ textTransform: "capitalize" }}
          >
            {text.toLowerCase()}
          </p>
        );
      },
    },
    {
      title: "Pickup Point",
      dataIndex: "sourceName",
      key: "sourceName",
      width: 300,
    },
    {
      title: "Drop Point",
      dataIndex: "destinationName",
      key: "destinationName",
      width: 200,
    },
    // {
    //   title: "City Code",
    //   dataIndex: "cityCode",
    //   key: "cityCode",
    // },
    {
      title: "Travel Type",
      dataIndex: "travelType",
      key: "travelType",
    },
    {
      title: "Distance (in KMs)",
      dataIndex: "kilometer",
      key: "kilometer",
      render: (text: unknown) => <p>{formatLogAmount(text)}</p>,
    },
    {
      title: "Base Fare (in INR)",
      dataIndex: "fareBreakup",
      key: "baseFare",
      render: (_: unknown, record: Booking) => (
        <p>{formatLogAmount((record as any).fareBreakup?.["Base Fare"])}</p>
      ),
    },
    {
      title: "Tax (in INR)",
      dataIndex: "fareBreakup",
      key: "tax",
      render: (_: unknown, record: Booking) => (
        <p>{formatLogAmount((record as any).fareBreakup?.["Tax"])}</p>
      ),
    },
    {
      title: "Toll Charges (in INR)",
      dataIndex: "fareBreakup",
      key: "tollCharges",
      render: (_: unknown, record: Booking) => (
        <p>{formatLogAmount((record as any).fareBreakup?.["Toll Charges"])}</p>
      ),
    },
    {
      title: "Total Fare (in INR)",
      dataIndex: "totalFare",
      key: "totalFare",
      render: (text: unknown) => <p>{formatLogAmount(text)}</p>,
    },
    {
      title: "Total IBC Redeemed",
      dataIndex: "ibcFareDisplay",
      key: "total_ibc_redeemed",
      render: (_: unknown, record: Booking) => (
        <p>{getIbcFareDisplayValue(record, "total_ibc_redeemed") ?? "-"}</p>
      ),
    },
    {
      title: "Conversion Rate",
      dataIndex: "conversionRate",
      key: "conversionRate",
      render: (_: unknown, record: Booking) => (
        <p>{getConversionRateColumnValue(record)}</p>
      ),
    },
    {
      title: "Voucher Points Redeemed",
      dataIndex: "ibcFareDisplay",
      key: "ibc_voucher",
      render: (_: unknown, record: Booking) => (
        <p>{getVoucherPointsRedeemed(record) ?? "-"}</p>
      ),
    },
    {
      title: "Voucher Name",
      dataIndex: "ibcFareDisplay",
      key: "ibc_voucher_name",
      render: (_: unknown, record: Booking) => (
        <p>{getVoucherName(record) ?? "-"}</p>
      ),
    },
    {
      title: "IBC Points Redeemed",
      dataIndex: "ibcFareDisplay",
      key: "ibc_points",
      render: (_: unknown, record: Booking) => (
        <p>{getIbcPointsRedeemed(record) ?? "-"}</p>
      ),
    },
    {
      title: (
        <span className="inline-block text-center leading-tight">
          IBC Redemption Fee
          <br />
          <span className="text-[11px] font-normal normal-case">
            (non-refundable)
          </span>
        </span>
      ),
      dataIndex: "ibcFareDisplay",
      key: "redemptoon_fee",
      render: (_: unknown, record: Booking) => (
        <p>{getIbcRedemptionFee(record) ?? "-"}</p>
      ),
    },
    {
      title: "Paid Amount ",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (text: unknown) => <p>{formatLogAmount(text)}</p>,
    },
    {
      title: "Pay Type ",
      dataIndex: "payType",
      key: "payType",
    },
    {
      title: getListingFeeShareLabel(selectedPartner),
      dataIndex: "indigo_listing_fee_percent",
      key: "indigo_listing_fee_percent",
    },
    {
      title: getListingFeeShareLabel(selectedPartner, "inr"),
      dataIndex: "indigo_listing_fee_inr",
      key: "indigo_listing_fee_inr",
    },
    {
      title: "Engagement Reserve (%)",
      dataIndex: "partner_fee_percent",
      key: "partner_fee_percent",
    },
    {
      title: "Engagement Reserve (In INR)",
      dataIndex: "partner_fee_inr",
      key: "partner_fee_inr",
      render: (_: unknown, record: Booking) => {
        return <p>{formatEngagementReserveInr(record?.partner_fee_inr)}</p>;
      },
    },
    {
      title: "IBC Earn  ",
      dataIndex: "bluechip",
      key: "ibc_earn",
      render: (_: unknown, record: Booking) => (
        <p>{getIbcEarnColumnValue(record)}</p>
      ),
    },
    {
      title: "FFN",
      dataIndex: "ffn",
      key: "ffn",
      render: (_: unknown, record: Booking) => <p>{record?.ffn || 0}</p>,
    },
    // {
    //   title: "IBC Points Earned  ",
    //   dataIndex: "bluechip",
    //   key: "ibc_points_earned",
    //   render: (_: unknown, record: Booking) => (
    //     <p>{getIbcPointsEarnedColumnValue(record)}</p>
    //   ),
    // },
    {
      title: "IBC Earn Percentage",
      dataIndex: "ibc_burn_percent",
      key: "ibc_burn_percent",
      render: (_: unknown, record: Booking) => (
        <p>{getIbcBurnPercentColumnValue(record)}</p>
      ),
    },

    {
      title: "Loyalty Points Earned ",
      dataIndex: "loyalty_points_disbursed",
      key: "loyalty_points_disbursed",
      render: (_: unknown, record: Booking) => {
        return <p>{getLoyaltyPointsColumnValue(record)} </p>;
      },
    },
    // {
    //   title: "Extra PerKm",
    //   dataIndex: "extraPerKm",
    //   key: "extraPerKm",
    // },
    // {
    //   title: "Booking Time",
    //   dataIndex: "bookingTime",
    //   key: "bookingTime",
    // },
  ];

  const visibleColumns = useMemo(
    () =>
      filterIndigoOnlyLogColumns(
        filterSwiggyOpsLogColumns(columns, "conversionLog", loginUsername),
        selectedPartner,
      ),
    [columns, loginUsername, selectedPartner],
  );

  const [totalRecords, setTotalRecords] = useState<number>(0);
  // const [dateRange, setDateRange] = useState<[string, string]>(() => {
  //   if (
  //     OperationstoreData?.SelectedDateRange?.length === 2 &&
  //     OperationstoreData.SelectedDateRange[0]
  //   ) {
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
  const logsPartner = useSelector((state: any) => state?.authStore?.logsPartner);
  const loginPartners = useSelector(
    (state: any) => state?.authStore?.login_partners ?? [],
  );
  const lockedCabPartners = resolveLockedCabPartners(loginPartners, logsPartner);
  const lockedCabPartner =
    lockedCabPartners.length === 1 ? lockedCabPartners[0] : "";

  const FetchAPI = useCallback(
    async (selectedPartner: string) => {
      setLoading(true);
      try {
        const bodyPayload: any = {
          bookingId: "",
          page: pagination.current,
          limit: pagination.pageSize,
          // limit: 10,
          startHour: 0,
          endHour: 23,
          status: "COMPLETED",
          startDate: dateRange[0],
          endDate: dateRange[1],
          filterBy: "updatedAt",
        };

        if (lockedCabPartner) {
          bodyPayload.cabPartner = lockedCabPartner;
        } else if (selectedCabPartner) {
          bodyPayload.cabPartner = selectedCabPartner;
        }

        const LogsResp: any = await GETBOOKING_LOGS(
          selectedPartner,
          bodyPayload,
        );
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
    },
    [
      dateRange[0],
      dateRange[1],
      pagination.current,
      pagination.pageSize,
      selectedCabPartner,
      lockedCabPartner,
    ],
  );

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
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <PartnerTab propsData={{ isall: false }} />

        <div className="mb-4 mt-[-1px]">
          {lockedCabPartner ? (
            <span className="inline-block rounded border bg-gray-50 px-3 py-2 text-sm">
              Cab partner: {lockedCabPartner}
            </span>
          ) : (
          <select
            value={selectedCabPartner || ""}
            onChange={(e) => {
              setSelectedCabPartner(e.target.value || null);
              setPagination((prev) => ({
                ...prev,
                current: 1,
              }));
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">All Partners</option>

            {AvailablecabPartners.map((partner) => (
              <option key={partner} value={partner}>
                {partner}
              </option>
            ))}
          </select>
          )}
        </div>
      </div>

      <LogsTable
        columns={visibleColumns}
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
        title="Conversion Logs"
        type="COMPLETED"
        DownloadCSV={true}
        selectedCabPartner={lockedCabPartner || selectedCabPartner}
        filterBy="updatedAt"
        uiPageName="conversionLog"
      />
    </>
  );
};
