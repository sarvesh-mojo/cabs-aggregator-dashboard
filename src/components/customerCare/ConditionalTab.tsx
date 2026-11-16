import React, { useState } from "react";
import { Button, Modal } from "antd";
// import { DownloadOutlined, FilterOutlined } from "@ant-design/icons";
import { FilterOutlined } from "@ant-design/icons";
import { useLocation } from "react-router";
import { ConditionalTabProps } from "../../config/types";
import { useDispatch, useSelector } from "react-redux";
import { SaveDateRange } from "../../Redux/slices/operationSlice";
import { RangerPicker } from "../common/RangePicker";
import { PartnerTab } from "../common/PartnerTab";

const ConditionalTab: React.FC<ConditionalTabProps> = ({
  // BookingData,
  // activeTab,
  STATUS_TABS,
  totalRecords,
  onChangeTab,
  onChangeDateRange,
  onChangeStatus,
  dateRange,
  selectedStatus,

  hours,
  paymentType,
  partner,
  journeyType,

  onApplyFilters,
}) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const OperationstoreData = useSelector((state: any) => state.operationStore);

  React.useEffect(() => {
    if (OperationstoreData?.ReportSelectedPartner) {
      onChangeTab(OperationstoreData.ReportSelectedPartner);
    }
    // eslint-disable-next-line
  }, [OperationstoreData?.ReportSelectedPartner]);

  const lastSegment = location.pathname.split("/").pop();

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Local states for modal form
  const [tempHours, setTempHours] = useState(hours);
  const [tempPayment, setTempPayment] = useState(paymentType);
  const [tempPartner, setTempPartner] = useState(partner);
  // Update the state name
  const [tempJourneyType, setTempJourneyType] = useState(journeyType);

  const isFilterActive =
    hours !== 24 ||
    tempPayment !== "" ||
    tempPartner !== "" ||
    tempJourneyType !== "";

  const handleDateChange = (dates: any) => {
    if (dates) {
      const start = dates[0];
      const end = dates[1];
      onChangeDateRange([start, end]);
      dispatch(SaveDateRange([start, end]));
      // dispatch(
      //   SaveDateRange({
      //     path: window.location.pathname,
      //     range: [start, end],
      //   }),
      // );
    }
  };

  const handleApplyFilters = () => {
    onApplyFilters({
      hours: tempHours,
      paymentType: tempPayment,
      partner: tempPartner,
      journeyType: tempJourneyType,
    });
    setFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setTempHours(24);
    setTempPayment("");
    setTempPartner("");
    setTempJourneyType("");

    // Optional: immediately reset in parent as well
    onApplyFilters({
      hours: 24,
      paymentType: "",
      partner: "",
      journeyType: "",
      // journeyType: tempJourneyType,
    });

    setFilterModalOpen(false);
  };

  // let displayPartners = AuthstoreData?.login_partners;
  // if (displayPartners?.length > 1) {
  //   displayPartners = [...AuthstoreData?.login_partners, "all"];
  // }

  return (
    <div>
      {/* Header Section */}
      <div className="flex justify-between align-items-center mb-3">
        <h3 className="font-bold text-primary mb-0">
          Bookings ({totalRecords})
        </h3>

        <div className="flex gap-3">
          {/* CSV Download */}
          {/* <Button
                        icon={<DownloadOutlined />}
                        onClick={() => { }}
                        disabled={!BookingData?.length}
                    >
                        Download CSV
                    </Button> */}

          {/* Date Range */}
          {lastSegment !== "Next2HrBooking" &&
            lastSegment !== "TodayAllPickup" &&
            lastSegment !== "ActiveRides" && (
              <RangerPicker
                updateDate={[dateRange[0], dateRange[1]]}
                selectedRange={handleDateChange}
              />
            )}
        </div>
      </div>

      {/* Partner tabs */}
      {/* <div className="flex gap-2 mb-3 border-b pb-2">
        {displayPartners?.map((tab: string) => (
          <button
            key={tab}
            onClick={() => onChangeTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all 
                        ${
                          tab === "ixigo" && activeTab === tab
                            ? "bg-[#fc790d] text-white shadow-md scale-105"
                            : tab === "indigo" && activeTab === tab
                              ? "bg-[#001b94] text-white shadow-md scale-105"
                              : tab === "mojoboxx" && activeTab === tab
                                ? "bg-purple-600 text-white shadow-md scale-105"
                                : tab === "all" && activeTab === tab
                                  ? "bg-yellow-500 text-white shadow-md scale-105"
                                  : "bg-gray-100 text-gray-700"
                        }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div> */}
       <PartnerTab />

      {/* {lastSegment !== "ActiveRides" &&  lastSegment!= "Delay_Rides" && ( */}
      {lastSegment !== "ActiveRides" && (
        <div className="flex justify-between">
          {/* Status Filter */}
          <div className="flex gap-2 mb-1 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onChangeStatus(tab.key)}
                  className={`px-3 py-1 rounded-md text-sm font-medium border transition-all 
                            ${
                              isActive
                                ? "border-black font-bold border-3"
                                : "border-gray-300"
                            }
                            ${tab.color}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {/* Filter Icon */}
          {lastSegment !== "Next2HrBooking" && (
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`px-3 h-9 rounded-sm border transition-all 
                        ${
                          isFilterActive
                            ? "bg-blue-600 text-white border-blue-700 shadow-md"
                            : "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
            >
              <FilterOutlined /> Filters
            </button>
          )}
        </div>
      )}

      {/* FILTER MODAL */}
      <Modal
        open={filterModalOpen}
        onCancel={() => setFilterModalOpen(false)}
        footer={null}
        closable={false}
        centered
        width={420}
        className="rounded-xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Filter Options</h3>
          <Button type="text" onClick={() => setFilterModalOpen(false)}>
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          {/* Hours Filter */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <label className="block font-medium mb-3 text-gray-700">
              Select Hours
            </label>
            <select
              className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-blue-500"
              value={tempHours}
              onChange={(e) => setTempHours(Number(e.target.value))}
            >
              <option value={24}>Next 24 Hours</option>
              {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((hr) => (
                <option key={hr} value={hr}>
                  Next {hr} Hours
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type */}
          <div className="p-4 bg-gray-50 rounded-xl ">
            <label className="block font-medium mb-3 text-gray-700">
              Payment Type : (Disabled for now)
            </label>
            <select
              disabled
              className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-blue-500"
              value={tempPayment}
              onChange={(e) => setTempPayment(e.target.value)}
            >
              <option value="">All</option>
              <option value="online">Online</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {/* Cab Partner */}
          <div className="p-4 bg-gray-50 rounded-xl ">
            <label className="block font-medium mb-3 text-gray-700">
              Cab Partner
            </label>
            <select
              className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-blue-500"
              value={tempPartner}
              onChange={(e) => setTempPartner(e.target.value)}
            >
              <option value="">All</option>
              <option value="TRAVELVIP">TRAVELVIP</option>
              <option value="QUICKRIDE">QUICKRIDE</option>
              <option value="GOZOCABS">GOZOCABS</option>
              <option value="SIGNATURE">SIGNATURE</option>
              <option value="WTICABS">WTICABS</option>
              <option value="MEGA">MEGA</option>
              <option value="GOAMILES">GOAMILES</option>
              <option value="TAXIBAZAAR">TAXIBAZAAR</option>
              <option value="EVERA">EVERA</option>
              <option value="SIG-Evera">SIG-Evera</option>
              <option value="CARZONRENT">CARZONRENT</option>
              <option value="REFEX">REFEX</option>
              <option value="MERU">MERU</option>
              <option value="KANGAROOCARS">KANGAROOCARS</option>
              <option value="SIG-SNAPPY">SIG-SNAPPY</option>
              <option value="COMMUTEC">COMMUTEC</option>
              <option value="SHOFFR">SHOFFR</option>
              <option value="BETMOBILITY">BETMOBILITY</option>
              <option value="BLUECAB">BLUECAB</option>
              <option value="TAXIDA">TAXIDA</option>
              <option value="MILODRIVE">MILODRIVE</option>
              <option value="GRELCABS">GRELCABS</option>
              <option value="SIG-PLUSHMILES">SIG-PLUSHMILES</option>
              <option value="SIG-BLUSKY">SIG-BLUSKY</option>
              <option value="SIG-GOGREEN">SIG-GOGREEN</option>
              <option value="SIG-PVryde">SIG-PVryde</option>
              <option value="SIG-MANNTOURS">SIG-MANNTOURS</option>
              <option value="SIG-NANDIMOBILITY">SIG-NANDIMOBILITY</option>
            </select>
          </div>
        </div>

        {/* Journey Type Filter */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <label className="block font-medium mb-3 text-gray-700">
            Journey Type
          </label>
          <select
            className="w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-blue-500"
            value={tempJourneyType}
            onChange={(e) => setTempJourneyType(e.target.value)}
          >
            <option value="">All</option>
            <option value="AIRPORT">Airport</option>
            <option value="OUTSTATION">Outstation</option>
          </select>
        </div>

        {/* Sticky Footer */}
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <Button danger onClick={handleResetFilters}>
            {" "}
            Reset Filters
          </Button>
          <Button onClick={() => setFilterModalOpen(false)}>Cancel</Button>
          <Button type="primary" onClick={handleApplyFilters}>
            Apply
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ConditionalTab;
