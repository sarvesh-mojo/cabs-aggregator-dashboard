import React, { useEffect, useState } from "react";
import {
  REASSIGN_BOOKING_API,
  REASSIGN_FARE_SEARCH,
} from "../../config/customerCare/operationsApicall";
import { Booking } from "../../config/customerCare/interfaceTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  partner: string;
  onSuccess: (newBookingId: string) => void;
}

type PartnerRecentReview = {
  rating?: string;
  review?: string;
  preDefReview?: string;
  createdAt?: string;
  bookingId?: string;
};

type FareOption = {
  searchId: string;
  cabPartner?: string;
  originalPartner?: string;
  vehicleType?: string;
  fare?: number;
  originalFare?: number;
  eta?: string | number | null;
  title?: string;
  rating?: number | null;
  ratingCount?: number;
  recentReviews?: PartnerRecentReview[];
  extraDetails?: {
    originalPartner?: string;
    originalFare?: number;
  };
  [key: string]: any;
};

const getFuelTypeLabel = (fare: FareOption): string => {
  const fromMap = fare.featuresDisplayMap?.["Fuel Type"];
  if (fromMap != null && String(fromMap).trim()) return String(fromMap);
  const fromFeatures = fare.features?.fuelType;
  if (fromFeatures != null && String(fromFeatures).trim()) {
    return String(fromFeatures);
  }
  return "—";
};

const formatPickupDatetime = (pickupTime: string | Date | null | undefined) => {
  if (!pickupTime) return "";
  const raw = String(pickupTime)
    .replace(/Z$/, "")
    .replace("T", " ")
    .replace(/\.\d+$/, "")
    .trim();
  // Expect "YYYY-MM-DD HH:mm:ss" or similar → fareSearch wants YYYY-MM-DDTHH:mm
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}`;
  return raw;
};

const ReassignBookingModal: React.FC<Props> = ({
  open,
  onClose,
  booking,
  partner,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fares, setFares] = useState<FareOption[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pickupDatetime, setPickupDatetime] = useState(
    () => formatPickupDatetime(booking.pickupTime)
  );
  const [searchedDatetime, setSearchedDatetime] = useState("");
  const [sendCommunication, setSendCommunication] = useState(true);

  const buildFareSearchBody = (startDatetime: string) => {
    const travelType = booking.travelType || "Departure";
    return {
      sourceName: booking.sourceName,
      sourceLatitude: Number(booking.sourceLatitude),
      sourceLongitude: Number(booking.sourceLongitude),
      sourceCity: booking.sourceCity || booking.cityCode || "NA",
      sourceAddress: booking.sourceAddress || "null",
      sourceState: booking.sourceState || "null",
      destinationName: booking.destinationName,
      destinationLatitude: Number(booking.destinationLatitude),
      destinationLongitude: Number(booking.destinationLongitude),
      destinationCity: booking.destinationCity || booking.cityCode || "NA",
      destinationAddress: booking.destinationAddress || "null",
      destinationState: booking.destinationState || "null",
      startDatetime,
      cityCode: booking.cityCode,
      travelType,
      journeyType: booking.journeyType || "AIRPORT",
      terminalId: booking.terminalCode || "null",
      kilometer: Number(booking.kilometer) || undefined,
      context: "reassign",
    };
  };

  const loadFares = async (startDatetime = pickupDatetime) => {
    setLoading(true);
    setError("");
    setFares([]);
    setSelectedSearchId("");
    try {
      if (!startDatetime) {
        setError("Pickup date & time is required to search partners.");
        return;
      }
      const body = buildFareSearchBody(startDatetime);
      const resp = await REASSIGN_FARE_SEARCH(partner, body);
      if (resp?.status === "success" && Array.isArray(resp.data)) {
        setFares(resp.data);
        setSearchedDatetime(startDatetime);
        if (resp.data.length === 0) {
          setError("No partner fares found for this pickup time.");
        }
      } else {
        setError(resp?.message || "Failed to fetch partner fares.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch partner fares."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && booking?.bookingId) {
      const initial = formatPickupDatetime(booking.pickupTime);
      setPickupDatetime(initial);
      setSearchedDatetime("");
      setFares([]);
      setSelectedSearchId("");
      setError("");
      setSendCommunication(false);
      if (initial) {
        loadFares(initial);
      } else {
        setError("Pickup date & time is required to search partners.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.bookingId]);

  if (!open) return null;

  const selectedFare = fares.find((f) => f.searchId === selectedSearchId);
  const pickupChanged =
    !!searchedDatetime && pickupDatetime !== searchedDatetime;
  const originalPickup = formatPickupDatetime(booking.pickupTime);

  const handlePickupChange = (value: string) => {
    setPickupDatetime(value);
    if (searchedDatetime && value !== searchedDatetime) {
      setFares([]);
      setSelectedSearchId("");
    }
  };

  const handleProceed = async () => {
    if (!selectedSearchId) {
      setError("Please select a partner.");
      return;
    }
    if (pickupChanged) {
      setError(
        "Pickup date & time changed — search partners again before proceeding."
      );
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const resp = await REASSIGN_BOOKING_API(partner, {
        bookingId: booking.bookingId,
        searchId: selectedSearchId,
        reassignedBy: sessionStorage["userName"] || "CX",
        communication: sendCommunication,
      });
      if (resp?.status === "success" && resp?.data?.newBookingId) {
        alert(
          [
            `Booking reassigned successfully.`,
            `New Booking ID: ${resp.data.newBookingId}`,
            companyAbsorbed > 0
              ? `Company absorbed: ${inr(companyAbsorbed)}`
              : companyMargin > 0
                ? `Advance/margin: +${inr(companyMargin)}`
                : `No fare change`,
            `Customer extra: ₹0`,
          ].join("\n")
        );
        onSuccess(resp.data.newBookingId);
        onClose();
      } else {
        setError(resp?.message || "Reassignment failed.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Reassignment failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getOriginalPartner = (f: FareOption) =>
    f.originalPartner ||
    f.extraDetails?.originalPartner ||
    f.cabPartner ||
    "—";

  const originalInvoice = Number(booking.totalFare ?? 0);
  const selectedPartnerFare = selectedFare
    ? Number(
        selectedFare.originalFare ??
          selectedFare.extraDetails?.originalFare ??
          selectedFare.fare ??
          0
      )
    : 0;
  const companyAbsorbed = Math.max(0, selectedPartnerFare - originalInvoice);
  const companyMargin = Math.max(0, originalInvoice - selectedPartnerFare);

  const inr = (n: number) =>
    `₹${Number(n).toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.8)] bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-[920px] max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-semibold text-indigo-700 mb-2">
          Reassign Booking
        </h2>
        <p className="text-sm text-gray-600 mb-1">
          Booking ID: <b>{booking.bookingId}</b>
          {booking.parentBookingId ? (
            <>
              {" "}
              · Parent: <b>{booking.parentBookingId}</b>
            </>
          ) : null}
        </p>
        <p className="text-sm text-gray-500 mb-2">
          {booking.sourceName} → {booking.destinationName}
        </p>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-gray-700">
          <p>
            Partner:{" "}
            <b className="text-indigo-800">
              {booking.cabPartner || booking.partnerName || "—"}
            </b>
          </p>
          <p>
            Paid Amount:{" "}
            <b className="text-indigo-800">
              ₹
              {Number(booking.paidAmount ?? booking.paid ?? 0).toLocaleString(
                "en-IN"
              )}
            </b>
          </p>
          <p>
            Total Fare:{" "}
            <b className="text-indigo-800">
              ₹{Number(booking.totalFare ?? 0).toLocaleString("en-IN")}
            </b>
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reassign-pickup-datetime"
              className="text-xs font-medium text-gray-600"
            >
              Pickup date & time
            </label>
            <input
              id="reassign-pickup-datetime"
              type="datetime-local"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={pickupDatetime}
              onChange={(e) => handlePickupChange(e.target.value)}
              disabled={loading || submitting}
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-indigo-300 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            onClick={() => loadFares(pickupDatetime)}
            disabled={loading || submitting || !pickupDatetime}
          >
            {loading ? "Searching…" : "Search Partners"}
          </button>
          {originalPickup && pickupDatetime !== originalPickup && (
            <p className="text-xs text-amber-700">
              Changed from original: {originalPickup.replace("T", " ")}
            </p>
          )}
          {pickupChanged && (
            <p className="w-full text-xs text-amber-700">
              Pickup time updated — click Search Partners to refresh fares.
            </p>
          )}
          <div className="flex w-full flex-col gap-1 border-t border-gray-200 pt-3">
            <span className="text-xs font-medium text-gray-600">
              Notify customer (default: yes)
            </span>
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="reassign-communication"
                  checked={sendCommunication === false}
                  onChange={() => setSendCommunication(false)}
                  disabled={loading || submitting}
                />
                No — do not send WhatsApp or email
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="reassign-communication"
                  checked={sendCommunication === true}
                  onChange={() => setSendCommunication(true)}
                  disabled={loading || submitting}
                />
                Yes — send reassign WhatsApp and booking email
              </label>
            </div>
          </div>
        </div>

        {loading && (
          <p className="py-8 text-center text-gray-500">
            Searching partners…
          </p>
        )}

        {!loading && fares.length > 0 && (
          <div className="overflow-x-auto border rounded-lg mb-4">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Original Partner</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Fuel Type</th>
                  <th className="px-3 py-2">Fare</th>
                </tr>
              </thead>
              <tbody>
                {fares.map((f) => (
                  <tr
                    key={f.searchId}
                    className={`border-t hover:bg-indigo-50 cursor-pointer ${
                      selectedSearchId === f.searchId ? "bg-indigo-100" : ""
                    }`}
                    onClick={() => setSelectedSearchId(f.searchId)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="radio"
                        name="reassignPartner"
                        checked={selectedSearchId === f.searchId}
                        onChange={() => setSelectedSearchId(f.searchId)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {f.title || f.cabPartner || "TravelVIP"}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {getOriginalPartner(f)}
                    </td>
                    <td className="px-3 py-2">{f.vehicleType || "—"}</td>
                    <td className="px-3 py-2">{getFuelTypeLabel(f)}</td>
                    <td className="px-3 py-2">
                      ₹
                      {Number(
                        f.originalFare ??
                          f.extraDetails?.originalFare ??
                          f.fare ??
                          0
                      ).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedFare && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
            <p className="mb-1">
              Selected: <b>{getOriginalPartner(selectedFare)}</b> (billed as
              TravelVIP)
              {searchedDatetime ? (
                <>
                  {" "}
                  · Pickup: <b>{searchedDatetime.replace("T", " ")}</b>
                </>
              ) : null}
            </p>
            {companyAbsorbed > 0 ? (
              <p>
                Customer invoice stays {inr(originalInvoice)}. Company absorbs{" "}
                <b>{inr(companyAbsorbed)}</b>. Customer pays ₹0 extra.
              </p>
            ) : companyMargin > 0 ? (
              <p>
                Customer invoice stays {inr(originalInvoice)}. Advance/margin{" "}
                <b>+{inr(companyMargin)}</b>.
              </p>
            ) : (
              <p>No fare change. Customer pays ₹0 extra.</p>
            )}
            {Array.isArray(selectedFare.recentReviews) &&
            selectedFare.recentReviews.length > 0 ? (
              <div className="mt-2 border-t border-amber-100 pt-2">
                <p className="font-semibold text-xs text-gray-700 mb-1">
                  Last customer reviews ({getOriginalPartner(selectedFare)})
                </p>
                <ul className="space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                  {selectedFare.recentReviews.map((r, idx) => (
                    <li key={idx} className="rounded bg-white/80 px-2 py-1">
                      <span className="font-medium">{r.rating || "—"}</span>
                      {r.preDefReview ? (
                        <span className="text-amber-800"> · {r.preDefReview}</span>
                      ) : null}
                      {r.review ? (
                        <span> — {r.review}</span>
                      ) : (
                        <span className="italic text-gray-400">
                          {" "}
                          — No text
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            onClick={() => loadFares(pickupDatetime)}
            disabled={loading || submitting || !pickupDatetime}
          >
            Refresh Partners
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleProceed}
            disabled={
              !selectedSearchId || loading || submitting || pickupChanged
            }
          >
            {submitting ? "Reassigning…" : "Proceed with Selected Partner"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReassignBookingModal;

