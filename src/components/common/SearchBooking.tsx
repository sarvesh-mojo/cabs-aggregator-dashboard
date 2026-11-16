import { Button, Input, Space } from "antd";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";

type SearchProps = { onSearch?: (bookingId: string) => void };

export const SearchBooking = ({ onSearch }: SearchProps) => {
  const [bookingIdValue, setBookingIdValue] = useState("");

  return (
    <>
      <Space className="mb-3">
        <Input
          prefix={<FaSearch />}
          placeholder="Enter Booking ID or Mobile No."
          value={bookingIdValue}
          onChange={(e) => {
            setBookingIdValue(e.target.value);
            !e.target?.value.trim() && onSearch?.("");
          }}
          allowClear
          style={{ width: 250 }}
        />

        <Button
          type="primary"
          onClick={() => {
            if (!bookingIdValue.trim()) return;
            onSearch?.(bookingIdValue.trim());
          }}
          disabled={!bookingIdValue.trim()}
        >
          Search
        </Button>
      </Space>
    </>
  );
};
