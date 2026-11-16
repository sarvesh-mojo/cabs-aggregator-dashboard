import PageMeta from "../../../components/common/PageMeta";

export default function OpsBookingLogs() {
  return (
    <>
      <PageMeta
        title="Booking Logs"
        description="Booking logs by brand and IVR test calls"
      />
      <iframe
        src="/bookingLogs.html"
        title="Booking logs"
        style={{
          width: "100%",
          height: "calc(100vh - 140px)",
          border: "none",
          borderRadius: "8px",
          background: "#f4f6f8",
        }}
      />
    </>
  );
}
