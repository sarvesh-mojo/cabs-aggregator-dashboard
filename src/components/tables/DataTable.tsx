import { Table } from "antd";
import type { Key } from "react";
import { DataTableProps, DataTypeBase } from "../../config/types";
import { SearchBooking } from "../common/SearchBooking";
import { useState } from "react";

const DataTable = <T extends DataTypeBase>(props: DataTableProps<T>) => {

  const [activeRowKey, setActiveRowKey] = useState<Key | null>(null);
  const {
    columns,
    dataSource = [],
    loading,
    pagination,
    onChange,
    title,
    showSearch = false,
    onSearch,
    rowKey,
    scroll,
    expandable,
    size = "middle",
    tableClassName,
  } = props;

  const resolveRowKey = (record: T, index = 0): Key => {
    if (typeof rowKey === "function") {
      return rowKey(record) ?? index;
    }
    if (typeof rowKey === "string") {
      return (record[rowKey] as Key | undefined) ?? index;
    }

    const bookingId = String(record.bookingId ?? "").trim();
    const parentBookingId = String(
      (record as T & { parentBookingId?: Key }).parentBookingId ?? "",
    ).trim();

    if (bookingId) {
      const base =
        parentBookingId && parentBookingId !== bookingId
          ? `${parentBookingId}::${bookingId}`
          : bookingId;
      return `${base}::${index}`;
    }
    return record.id ?? record.key ?? index;
  };

  return (
    <div className="px-1 py-2 sm:px-2 sm:py-2 bg-white shadow-sm rounded mt-2 max-w-full min-w-0">
      <style>{`
        .active-row {
          background-color: #e6f4ff !important; /* light blue */
        }
      `}</style>
      {title && <h3 className="font-bold mb-3 text-primary">{title}</h3>}

      {showSearch && (
        <SearchBooking onSearch={onSearch} />
      )}
      <div className={`max-w-full min-w-0 ${tableClassName ?? ""}`.trim()}>
        <style>{`
          .nps-records-compact-table .ant-table-thead > tr > th,
          .nps-records-compact-table .ant-table-tbody > tr > td {
            padding: 3px 5px !important;
          }
          .nps-records-compact-table .ant-table-cell {
            font-size: 11px;
            line-height: 1.25;
          }
          .nps-records-compact-table .ant-btn-sm {
            padding-inline: 6px;
            font-size: 10px;
            height: 22px;
          }
        `}</style>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          onChange={onChange}
          rowKey={(record, index) => resolveRowKey(record, index)}
          bordered
          size={size}

          onRow={(record: T, index) => ({
            onClick: () => {
              setActiveRowKey(resolveRowKey(record, index));
            },
          })}

          rowClassName={(record: T, index) =>
            resolveRowKey(record, index) === activeRowKey ? "active-row" : ""
          }

          scroll={scroll ?? { x: "max-content" }}
          expandable={expandable}
        />
      </div>
    </div>
  );
};

export default DataTable;
