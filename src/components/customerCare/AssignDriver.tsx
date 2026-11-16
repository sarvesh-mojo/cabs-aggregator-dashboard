import React, { useState } from "react";
import { assignDriverApi } from "../../config/customerCare/tripUpdate";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingData: any;
}

const AssignDriverModal: React.FC<Props> = ({ open, onClose, bookingData }) => {
  const [form, setForm] = useState({
    driverName: "",
    mobile: "",
    vehicleNumber: "",
    vehicleName: "",
  });

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    await assignDriverApi(bookingData, form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.8)] flex justify-center items-center">
      <div className="bg-white p-6 rounded-2xl w-[450px]">
        <h2 className="text-xl font-semibold mb-4">Assign Driver</h2>

        <div className="space-y-3">
          <input
            className="w-full border p-2 rounded"
            name="driverName"
            placeholder="Enter driver name"
            onChange={handleChange}
          />

          <input
            className="w-full border p-2 rounded"
            name="mobile"
            placeholder="Enter 10-digit mobile number"
            onChange={handleChange}
          />

          <input
            className="w-full border p-2 rounded"
            name="vehicleNumber"
            placeholder="Enter vehicle registration number"
            onChange={handleChange}
          />

          <input
            className="w-full border p-2 rounded"
            name="vehicleName"
            placeholder="Enter vehicle name"
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignDriverModal;
