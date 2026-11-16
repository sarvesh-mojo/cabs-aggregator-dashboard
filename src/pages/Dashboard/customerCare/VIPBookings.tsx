import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BookingTableWrapper from "../../../components/customerCare/BookingTableWrapper";
import { GetVipAPI, PostVipAPI } from "../../../config/apiMethods";
import { VIP_Bookings, VIP_BRIDGE, VIP_DELIGHT_REFUND, VIP_INSTRUCTION, VIP_SETTLEMENT } from "../../../config/apiEndpoints";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isCancelledBooking(row: { status?: string }) {
  return String(row?.status || "").toUpperCase().includes("CANCEL");
}

function statusLabel(status?: string) {
  const raw = String(status || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ");
}

export default function VIPBookings() {
  const [rows, setRows] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [owed, setOwed] = useState(0);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [rides, bridge, settlement] = await Promise.all([
      GetVipAPI<any>(VIP_Bookings, { type: "vip", date: today() }),
      GetVipAPI<any>(VIP_BRIDGE),
      GetVipAPI<any>(VIP_SETTLEMENT, { from: today(), to: today() }),
    ]);
    const rideRows = Array.isArray(rides.data?.data) ? rides.data.data : [];
    setRows(rideRows.filter((row: { status?: string }) => !isCancelledBooking(row)));
    setTasks(bridge.data?.data || []);
    const exportRows = settlement.data?.data || [];
    setOwed(Array.isArray(exportRows) ? exportRows.length : 0);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err?.response?.data?.message || err.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl space-y-3">
        <h1 className="text-xl font-semibold">VIP section</h1>
        <p className="text-sm text-gray-500">Same Mojocaller panel. These rides are off the normal next-2-hours and all-bookings queues. Settlement rows today: {owed}. Partner pay is flagged 3x and is not a customer surcharge.</p>
        {message && <p className="text-sm">{message}</p>}
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.bookingId} className="border rounded p-3 text-sm space-y-1">
              <div className="flex justify-between gap-3">
                <div className="flex items-center gap-3">
                  <strong>{row.bookingId}</strong>
                  <span className="rounded px-2 py-0.5 text-xs bg-gray-100">{statusLabel(row.status)}</span>
                  <Link
                    className="underline"
                    to={`/dashboard/customerCare/HandleBooking?bookingId=yatra-${row.bookingId}`}
                  >
                    Open booking
                  </Link>
                </div>
                <span>{row.paymentMode}{Number(row.noCollection) === 1 ? " · no collection" : ""}</span>
              </div>
              <p>{row.sourceName} → {row.destinationName}</p>
              <p>{row.startTime} · {row.cabPartner} · {row.driverAssigned ? row.driverName || "driver assigned" : "no driver yet"}</p>
              {row.assignAlert && <p className="text-red-700">No driver inside two hours. Chase assignment.</p>}
              {row.vipService && <p className="text-gray-600 whitespace-pre-wrap">{row.vipService}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  className="underline"
                  type="button"
                  onClick={async () => {
                    const response = await PostVipAPI<any>(VIP_DELIGHT_REFUND, { bookingId: row.bookingId });
                    setMessage(response.data?.message || "Refund recorded");
                    await load();
                  }}
                >
                  Delight refund
                </button>
                <button
                  className="underline"
                  type="button"
                  onClick={async () => {
                    const response = await PostVipAPI<any>(VIP_INSTRUCTION, {
                      bookingId: row.bookingId,
                      note: note || "Concierge note",
                      openBridge: true,
                    });
                    setMessage(response.data?.message || "Instruction saved");
                  }}
                >
                  Send note to driver
                </button>
              </div>
            </article>
          ))}
        </div>
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Note for the chauffeur" value={note} onChange={(event) => setNote(event.target.value)} />
        <div>
          <h2 className="font-semibold text-sm">Open bridge tasks</h2>
          <ul className="text-sm">
            {tasks.map((task) => (
              <li key={task.id}>{task.kind} · {task.bookingId || "no booking"} · {task.detail}</li>
            ))}
          </ul>
        </div>
      </div>
      <BookingTableWrapper propsData={{ type: "VIPBookings" }} />
    </div>
  );
}
