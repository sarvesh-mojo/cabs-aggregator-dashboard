import React, { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, refund: boolean) => void;
  bookingId: string;
  partner?: string;
}

const CancelBookingModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  bookingId,
  partner,
}) => {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(false);
  const [otherReason, setOtherReason] = useState("");

  if (!open) return null;

   const finalReason =
    reason === "Other" ? otherReason.trim() : reason;

  const isDisabled = !finalReason;

  const handleClose = () => {
    setReason("");
    setOtherReason("");
    setRefund(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!finalReason) return;
    onConfirm(finalReason, refund);
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.8)] bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-[450px]">
        <h2 className="text-2xl font-semibold text-red-600 mb-3">
          Cancel Booking
        </h2>

        <p className="mb-1">Are you sure you want to cancel this booking?</p>
        <p className="font-semibold mb-4">Booking ID: {bookingId}</p>

        <select
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500"
        >
          <option value="">Select a reason</option>
          <option value="Change in plan">Change in plan</option>
          <option value="Customer request">Customer request</option>
          <option value="Driver not available">Driver not available</option>
          <option value="Weather conditions">Weather conditions</option>
          <option value="Price issue">Price issue</option>
          <option value="Booked by mistake">Booked by mistake</option>
          <option value="Driver Delayed">Driver Delayed</option>
          <option value="Cab Not Available">Cab Not Available</option>
          <option value="Customer No Show">Customer No Show</option>
          <option value="Customer Request">Customer Request</option>
          <option value="Price Issue">Price Issue</option>
          <option value="Customer Plan Changed">Customer Plan Changed</option>
          <option value="Flight Cancelled / Modify">
            Flight Cancelled / Modify
          </option>
          <option value="Other">Other</option>
        </select>

        {reason === "Other" && (
          <input
            type="text"
            placeholder="Enter reason"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500"
          />
        )}

        {partner === "indigo" && (
          <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Refund amount while cancel?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="refund"
                  checked={refund === true}
                  onChange={() => setRefund(true)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="refund"
                  checked={refund === false}
                  onChange={() => setRefund(false)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 bg-gray-200 rounded" 
          // onClick={onClose}>
           onClick={handleClose}>
            No, Keep Booking
          </button>
{/* 
          <button
            className="px-4 py-2 bg-red-600 text-white rounded"
            onClick={() => {
              if (reason) onConfirm(reason, refund);
            }}
          >
            Yes, Cancel Booking
          </button> */}
           <button
            disabled={isDisabled}
            className={`px-4 py-2 rounded text-white ${
              isDisabled
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600"
            }`}
            onClick={handleConfirm}
          >
            Yes, Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;

