import { TablePaginationConfig, TableProps } from "antd";

export interface BookingLogsPayload {
  page?: number;
  limit?: number;
  bookingId?: string;
  pageName?: string;
  partnerResponse?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaymentRefundPayload {
  unique_request_id: string,
  amount: number,
  parentBookingId : string
}

export interface OpsRemarkPayload {
  bookingId: string;
  agentMobile: string;
  remark: string;
}

export interface OpsRemarkQuery {
  bookingId: string;
}

export interface CEOMetricsQuery {
  cityCode : string;
}

export interface EngagementReportQuery {
  from_date: string;
  to_date: string;
}

export interface EngagementReportRow {
  month?: string;
  monthStart?: string | null;
  confirmedBookings?: number;
  completedRides?: number;
  gmv?: number;
  baseFare?: number;
  listingFee?: number;
  engagementReserve?: number;
  ibcDisbursed?: number;
  discountGiven?: number;
  partner?: string;
  isTotal?: boolean;
  key?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface EngagementReportResponse {
  fromDate?: string;
  toDate?: string;
  monthly: EngagementReportRow[];
  total?: EngagementReportRow;
}

export interface GenericTablePayload{
  table : string;
  limit?: number;
  page?: number;
  from? : string;
  to? : string;
  filters?: any;
  reportType?: string;
  [key:string] : string | number | any;
}

export interface BookingLog {
  id: string;
    [key: string]: any;
}

export interface BookingStatisticsQuery {
  date?: string;
  endDate?: string;
 [key: string]: any;
  // … other query parameters
  reportType?: string;  
  from?: string;        
  to?: string;         
  timeField?: string; 
}

export interface BookingStatistics {
  totalBookings: number;
  completed: number;
  cancelled: number;
  // … other stats fields
}

export interface BookingStatisticsResponse {
  totalBookings: number;
  completed: number;
  cancelled: number;
  // other stats
}

export interface VIPBookings {
  date: string;
  type: string;
}
export interface AssignDriverType {
  object: any;
}

export interface DataTypeBase {
  bookingId?: string | number;
  id?: string | number;
  key?: string | number;
  [key: string]: any;
}

export interface DataTableProps<T extends DataTypeBase> {
  columns: TableProps<T>["columns"];
  dataSource?: T[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  onChange?: (
    pagination: TablePaginationConfig,
    filters: Record<string, any>,
    sorter: Record<string, any>
  ) => void;
  title?: string;
  showSearch?: boolean;
  onSearch?: (bookingId: string) => void;
   rowKey?: string | ((record: T) => string); 
  scroll?: { x?: string | number; y?: string | number };
  expandable?: TableProps<T>["expandable"];
  size?: "small" | "middle" | "large";
  tableClassName?: string;
}

export interface ConditionalTabProps {
    BookingData: any[];
    activeTab: string;
    STATUS_TABS: any[];
    totalRecords: number;

    onChangeTab: (tab: string) => void;
    onChangeDateRange: (range: [string, string]) => void;
    onChangeStatus: (status: string) => void;

    dateRange: [string, string];
    selectedStatus: string;

    hours: number;
    paymentType: string;
    partner: string;
    journeyType: string;  

    onApplyFilters: (filters: {
        hours: number;
        paymentType: string;
        partner: string;
        journeyType: string;
    }) => void;
}

export interface AllCombineBookingResponse{
    [key: string]: any;
}

export type DataPartner = {
  partner: string;
};

export type CityListTypes = {
  id: number;
  name: string;
  code: string;
  is_departure: number | null;
  is_arrival: number | null;
};

export type CustomCityType = {
  id: number;
  title: string;
  code: string;
};