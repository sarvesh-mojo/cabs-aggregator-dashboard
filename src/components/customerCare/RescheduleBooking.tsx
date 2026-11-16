import React, { useEffect, useState } from "react";
import {
  RESCHEDULE_BOOKING_API,
  RESCHEDULE_FARE_QUOTE_API,
} from "../../config/customerCare/operationsApicall";
import { Booking } from "../../config/customerCare/interfaceTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  partner: string;
  onSuccess: (newBookingId: string) => void;
}

type FareOption = {
  searchId: string;
  cabPartner?: string;
  originalPartner?: string;
  vehicleType?: string;
  fare?: number;
  originalFare?: number;
  originalAmount?: number;
  fareDifference?: number;
  requiresConfirmation?: boolean;
  eta?: string | number | null;
  title?: string;
  extraDetails?: {
    originalPartner?: string;
    originalFare?: number;
  };
  [key: string]: any;
};

type SettlementPreview = {
  direction: "INCREASE" | "DECREASE" | "SAME";
  invoiceTotalFare: number;
  payToDriver: number;
  fareDifference: number;
  marginRetained: number;
  requiresConfirmation: boolean;
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
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}`;
  return raw;
};

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const getOriginalPartner = (f: FareOption) =>
  f.originalPartner ||
  f.extraDetails?.originalPartner ||
  f.cabPartner ||
  "—";

const getPartnerFare = (f: FareOption) =>
  Number(
    f.originalFare ??
      f.extraDetails?.originalFare ??
      f.fare ??
      f.totalFare ??
      0
  );

function previewRescheduleSettlement(
  originalAmount: number,
  paidAmount: number,
  newFare: number,
  isCash: boolean
): SettlementPreview {
  const paid = isCash ? 0 : paidAmount;
  if (newFare > originalAmount) {
    return {
      direction: "INCREASE",
      invoiceTotalFare: newFare,
      payToDriver: Math.max(0, newFare - paid),
      fareDifference: newFare - originalAmount,
      marginRetained: 0,
      requiresConfirmation: true,
    };
  }
  const marginRetained = Math.max(0, originalAmount - newFare);
  return {
    direction: newFare < originalAmount ? "DECREASE" : "SAME",
    invoiceTotalFare: originalAmount,
    payToDriver: Math.max(0, originalAmount - paid),
    fareDifference: newFare - originalAmount,
    marginRetained,
    requiresConfirmation: false,
  };
}

/**
 * User-initiated reschedule (PRD):
 * - Fare increase → new invoice; customer pays extra to driver; must confirm
 * - Fare decrease/same → invoice stays at original; Mojoboxx retains margin
 */
const RescheduleBookingModal: React.FC<Props> = ({
  open,
  onClose,
  booking,
  partner,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fares, setFares] = useState<FareOption[]>([]);
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [selectedSearchId, setSelectedSearchId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pickupDatetime, setPickupDatetime] = useState(
    () => formatPickupDatetime(booking.pickupTime)
  );
  const [searchedDatetime, setSearchedDatetime] = useState("");
  const [fareIncreaseAcknowledged, setFareIncreaseAcknowledged] = useState(false);
  const [sendCommunication, setSendCommunication] = useState(true);

  const isCash =
    String(booking.paymentMode || "").toLowerCase() === "cash" ||
    String(booking.payType || "").toLowerCase() === "cash";
  const paidAmount = isCash
    ? 0
    : Number(booking.paidAmount ?? booking.paid ?? 0);
  const originalInvoice = originalAmount || Number(booking.totalFare ?? 0);

  const loadFares = async (startDateTime = pickupDatetime) => {
    setLoading(true);
    setError("");
    setFares([]);
    setSelectedSearchId("");
    setFareIncreaseAcknowledged(false);
    try {
      if (!startDateTime) {
        setError("New pickup date & time is required to search fares.");
        return;
      }
      const resp = await RESCHEDULE_FARE_QUOTE_API(partner, {
        bookingId: booking.bookingId,
        startDateTime,
      });
      if (resp?.status === "success" && resp?.data?.options) {
        setFares(resp.data.options);
        setOriginalAmount(Number(resp.data.originalAmount ?? booking.totalFare ?? 0));
        setSearchedDatetime(startDateTime);
        if (resp.data.options.length === 0) {
          setError("No fares found for this pickup time.");
        }
      } else if (resp?.status === "success" && Array.isArray(resp.data)) {
        // backward-compatible shape
        setFares(resp.data);
        setOriginalAmount(Number(booking.totalFare ?? 0));
        setSearchedDatetime(startDateTime);
      } else {
        setError(resp?.message || "Failed to fetch reschedule fares.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch reschedule fares."
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
      setOriginalAmount(Number(booking.totalFare ?? 0));
      setError("");
      setFareIncreaseAcknowledged(false);
      setSendCommunication(true);
      if (initial) {
        loadFares(initial);
      } else {
        setError("New pickup date & time is required to search fares.");
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
    setFareIncreaseAcknowledged(false);
    if (searchedDatetime && value !== searchedDatetime) {
      setFares([]);
      setSelectedSearchId("");
    }
  };

  const selectedNewFare = selectedFare ? getPartnerFare(selectedFare) : 0;

  const settlement = selectedFare
    ? previewRescheduleSettlement(
        originalInvoice,
        paidAmount,
        selectedNewFare,
        isCash
      )
    : null;

  const handleSelectFare = (searchId: string) => {
    setSelectedSearchId(searchId);
    setFareIncreaseAcknowledged(false);
  };

  const handleProceed = async () => {
    if (!selectedSearchId || !settlement) {
      setError("Please select a fare.");
      return;
    }
    if (pickupChanged) {
      setError(
        "Pickup date & time changed — search fares again before proceeding."
      );
      return;
    }
    if (settlement.requiresConfirmation && !fareIncreaseAcknowledged) {
      setError(
        "The fare has increased. Please confirm the customer accepts the additional amount before proceeding."
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const resp = await RESCHEDULE_BOOKING_API(partner, {
        bookingId: booking.bookingId,
        searchId: selectedSearchId,
        rescheduledBy: sessionStorage["userName"] || "CX",
        confirmed: settlement.requiresConfirmation ? true : undefined,
        communication: sendCommunication,
      });

      if (resp?.status === "success" && resp?.data?.newBookingId) {
        const data = resp.data;
        const lines = [
          "Booking rescheduled successfully.",
          `New Booking ID: ${data.newBookingId}`,
          `Invoice: ${inr(Number(data.totalFare ?? settlement.invoiceTotalFare))}`,
        ];
        const payToDriver = Number(
          data.remainingAmount ?? data.payToDriver ?? settlement.payToDriver
        );
        if (payToDriver > 0) {
          lines.push(
            `Customer pays ${isCash ? "cash" : "driver"}: ${inr(payToDriver)}`
          );
        } else {
          lines.push("No extra payment from customer.");
        }
        if (data.direction === "DECREASE" || settlement.direction === "DECREASE") {
          lines.push(
            `Partner fare is lower — customer invoice stays at ${inr(originalInvoice)}.`
          );
        }
        alert(lines.join("\n"));
        onSuccess(data.newBookingId);
        onClose();
      } else if (resp?.code === 409 || resp?.data?.requiresConfirmation) {
        setError(
          resp?.message ||
            "Fare increased — confirm the additional amount with the customer and try again."
        );
      } else {
        setError(resp?.message || "Reschedule failed.");
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Reschedule failed.";
      if (code === 409) {
        setError(
          `${msg} Confirm the additional amount with the customer before proceeding.`
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fareDiffLabel = (diff: number) => {
    if (diff > 0) return `+${inr(diff)}`;
    if (diff < 0) return `−${inr(Math.abs(diff))}`;
    return "No change";
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,.8)] bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-[920px] max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-semibold text-emerald-700 mb-2">
          Reschedule Booking
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
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-gray-700">
          <p>
            Original invoice:{" "}
            <b className="text-emerald-800">{inr(originalInvoice)}</b>
          </p>
          <p>
            Paid amount:{" "}
            <b className="text-emerald-800">{inr(paidAmount)}</b>
          </p>
          <p>
            Payment mode:{" "}
            <b className="text-emerald-800">{booking.paymentMode || booking.payType || "—"}</b>
          </p>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          If the new fare is <b>higher</b>, the customer pays the difference to
          the driver and a new invoice is generated. If the new fare is{" "}
          <b>lower</b>, the customer still pays the original amount — the
          difference is retained by Mojoboxx.
        </p>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reschedule-pickup-datetime"
              className="text-xs font-medium text-gray-600"
            >
              New pickup date & time
            </label>
            <input
              id="reschedule-pickup-datetime"
              type="datetime-local"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={pickupDatetime}
              onChange={(e) => handlePickupChange(e.target.value)}
              disabled={loading || submitting}
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
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
              Pickup time updated — click Search Fares to refresh.
            </p>
          )}
          <div className="flex w-full flex-col gap-1 border-t border-gray-200 pt-3">
            <span className="text-xs font-medium text-gray-600">
              Send reschedule confirmation to customer
            </span>
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="reschedule-communication"
                  checked={sendCommunication === true}
                  onChange={() => setSendCommunication(true)}
                  disabled={loading || submitting}
                />
                Yes (send reschedule message)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="reschedule-communication"
                  checked={sendCommunication === false}
                  onChange={() => setSendCommunication(false)}
                  disabled={loading || submitting}
                />
                No (skip message)
              </label>
            </div>
          </div>
        </div>

        {loading && (
          <p className="py-8 text-center text-gray-500">Searching fares…</p>
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
                  <th className="px-3 py-2">Partner fare</th>
                  <th className="px-3 py-2">vs Original</th>
                </tr>
              </thead>
              <tbody>
                {fares.map((f) => {
                  const fare = getPartnerFare(f);
                  const diff =
                    f.fareDifference != null
                      ? Number(f.fareDifference)
                      : fare - originalInvoice;
                  return (
                    <tr
                      key={f.searchId}
                      className={`border-t hover:bg-emerald-50 cursor-pointer ${
                        selectedSearchId === f.searchId ? "bg-emerald-100" : ""
                      }`}
                      onClick={() => handleSelectFare(f.searchId)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="radio"
                          name="rescheduleFare"
                          checked={selectedSearchId === f.searchId}
                          onChange={() => handleSelectFare(f.searchId)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {f.title || f.cabPartner || "TravelVIP"}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {getOriginalPartner(f)}
                      </td>
                      <td className="px-3 py-2">{f.vehicleType || "—"}</td>
                      <td className="px-3 py-2">{getFuelTypeLabel(f)}</td>
                      <td className="px-3 py-2">{inr(fare)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            diff > 0
                              ? "text-amber-700 font-medium"
                              : diff < 0
                                ? "text-gray-600"
                                : ""
                          }
                        >
                          {fareDiffLabel(diff)}
                        </span>
                        {diff > 0 && (
                          <span className="ml-1 text-xs text-amber-600">
                            (confirm required)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedFare && settlement && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
            <p className="mb-1">
              Selected:{" "}
              <b>{getOriginalPartner(selectedFare)}</b>
              {selectedFare.title || selectedFare.cabPartner
                ? " (billed as TravelVIP)"
                : null}
              {searchedDatetime ? (
                <>
                  {" "}
                  · New pickup: <b>{searchedDatetime.replace("T", " ")}</b>
                </>
              ) : null}
            </p>
            {settlement.direction === "INCREASE" ? (
              <>
                <p>
                  New invoice: <b>{inr(settlement.invoiceTotalFare)}</b> (was{" "}
                  {inr(originalInvoice)}, +{inr(settlement.fareDifference)}).
                </p>
                <p>
                  Customer pays{" "}
                  <b>{inr(settlement.payToDriver)}</b>{" "}
                  {isCash ? "in cash" : "to the driver"}.
                </p>
              </>
            ) : settlement.direction === "DECREASE" ? (
              <>
                <p>
                  Customer invoice stays <b>{inr(originalInvoice)}</b> (partner
                  fare {inr(selectedNewFare)} — Mojoboxx retains{" "}
                  <b>{inr(settlement.marginRetained)}</b>).
                </p>
                <p>
                  Customer pays{" "}
                  <b>{inr(settlement.payToDriver)}</b>{" "}
                  {isCash ? "in cash" : "to the driver"} (unchanged from original
                  booking).
                </p>
              </>
            ) : (
              <p>
                Same fare. Invoice {inr(settlement.invoiceTotalFare)}.{" "}
                {settlement.payToDriver > 0
                  ? `Customer pays ${inr(settlement.payToDriver)} ${isCash ? "in cash" : "to the driver"}.`
                  : "No extra payment from customer."}
              </p>
            )}

            {settlement.requiresConfirmation && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded border border-amber-300 bg-white p-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={fareIncreaseAcknowledged}
                  onChange={(e) => setFareIncreaseAcknowledged(e.target.checked)}
                  disabled={submitting}
                />
                <span>
                  Customer has been informed of the additional{" "}
                  <b>{inr(settlement.fareDifference)}</b> and accepts the
                  reschedule.
                </span>
              </label>
            )}
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
            className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            onClick={() => loadFares(pickupDatetime)}
            disabled={loading || submitting || !pickupDatetime}
          >
            Refresh Partners
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            onClick={handleProceed}
            disabled={
              !selectedSearchId ||
              loading ||
              submitting ||
              pickupChanged ||
              (settlement?.requiresConfirmation === true &&
                !fareIncreaseAcknowledged)
            }
          >
            {submitting ? "Rescheduling…" : "Proceed with Selected Fare"}
          </button>
        </div>
      </div>
    </div>
  );
};


export default RescheduleBookingModal;
