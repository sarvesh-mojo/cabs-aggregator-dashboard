import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { GetVipAPI } from "../../../config/apiMethods";
import { VIP_DESK } from "../../../config/apiEndpoints";
import type { RootState } from "../../../Redux/store";
import { getLoginUsername } from "../../../utils/partnerAccess";
import VipDeskRide, { DeskFlag, EVENT_LABELS, FLAG_STYLES, TierBadge } from "../../../components/customerCare/VipDeskRide";

type DeskRide = {
  bookingId: string;
  status: string;
  startTime: string;
  minutesToPickup: number | null;
  guestName: string;
  sourceName: string;
  destinationName: string;
  cabPartner: string;
  driverName: string | null;
  vehicleNumber: string | null;
  profileName: string | null;
  companyName: string | null;
  tier: string;
  sponsorPriority: string;
  conciergeOwner: string | null;
  conciergeBackup: string | null;
  driverState: string;
  journeyStage: string;
  lastEventAt: string | null;
  eventTimes: Record<string, string>;
  evidenceCount: number;
  verifiedEvidence: number;
  openTasks: number;
  flags: DeskFlag[];
  severity: number;
};

type Filter = "all" | "action" | "founder" | "mine" | "unowned";

const REFRESH_MS = 60000;

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function countdown(minutes: number | null) {
  if (minutes == null) return "";
  const abs = Math.abs(minutes);
  const text = abs >= 60 ? `${Math.floor(abs / 60)}h ${abs % 60}m` : `${abs}m`;
  return minutes >= 0 ? `in ${text}` : `${text} ago`;
}

function pickupClock(value: string) {
  const [date, time] = String(value || "").split(" ");
  return `${date?.slice(8, 10)}/${date?.slice(5, 7)} ${time?.slice(0, 5) || ""}`;
}

function latestStep(ride: DeskRide) {
  const entries = Object.entries(ride.eventTimes || {}).sort((a, b) => b[1].localeCompare(a[1]));
  if (!entries.length) return "No desk events yet";
  const [type, at] = entries[0];
  return `${EVENT_LABELS[type] || type} · ${pickupClock(at)}`;
}

export default function VipDesk() {
  const reduxUsername = useSelector((state: RootState) => state.authStore.login_username);
  const actor = getLoginUsername(reduxUsername) || "ops";
  const [from, setFrom] = useState(isoDate(0));
  const [to, setTo] = useState(isoDate(2));
  const [rides, setRides] = useState<DeskRide[]>([]);
  const [filter, setFilter] = useState<Filter>("action");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await GetVipAPI<any>(VIP_DESK, { from, to });
      const data = response.data?.data || {};
      setRides(Array.isArray(data.rides) ? data.rides : []);
      setUpdatedAt(data.now || "");
      setMessage("");
    } catch (err: any) {
      setMessage(err?.response?.data?.message || err?.message || "Could not load the desk");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [from, to]);

  const counts = useMemo(() => ({
    critical: rides.filter((ride) => ride.flags.some((flag) => flag.level === "critical")).length,
    action: rides.filter((ride) => ride.flags.some((flag) => flag.level !== "info")).length,
    founder: rides.filter((ride) => ride.sponsorPriority === "FOUNDER_DESK").length,
    unowned: rides.filter((ride) => !ride.conciergeOwner && !/CANCEL/i.test(ride.status)).length,
    mine: rides.filter((ride) => [ride.conciergeOwner, ride.conciergeBackup].some((name) => (name || "").toLowerCase() === actor.toLowerCase())).length,
  }), [rides, actor]);

  const visible = useMemo(() => rides.filter((ride) => {
    if (filter === "action") return ride.flags.some((flag) => flag.level !== "info");
    if (filter === "founder") return ride.sponsorPriority === "FOUNDER_DESK";
    if (filter === "unowned") return !ride.conciergeOwner && !/CANCEL/i.test(ride.status);
    if (filter === "mine") {
      return [ride.conciergeOwner, ride.conciergeBackup].some((name) => (name || "").toLowerCase() === actor.toLowerCase());
    }
    return true;
  }), [rides, filter, actor]);

  const filters: { key: Filter; label: string }[] = [
    { key: "action", label: `Needs action (${counts.action})` },
    { key: "unowned", label: `No owner (${counts.unowned})` },
    { key: "founder", label: `Founder's Desk (${counts.founder})` },
    { key: "mine", label: `Mine (${counts.mine})` },
    { key: "all", label: `All (${rides.length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">VIP desk</h1>
            <p className="text-sm text-gray-500">
              Named concierge per ride, pre-pickup monitoring by tier (VIP T-60, VVIP T-120, Super VIP T-180), vehicle checks, guest messages and feedback.
              {counts.critical > 0 && <span className="text-red-700 font-medium"> {counts.critical} ride{counts.critical > 1 ? "s" : ""} critical.</span>}
            </p>
          </div>
          <div className="flex items-end gap-2 text-sm">
            <label className="text-xs text-gray-600">
              From
              <input className="border rounded px-2 py-1.5 text-sm block" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="text-xs text-gray-600">
              To
              <input className="border rounded px-2 py-1.5 text-sm block" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
            </label>
            <button type="button" className="border rounded px-3 py-1.5 text-sm" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`rounded-full px-3 py-1 text-sm border ${filter === item.key ? "bg-gray-900 text-white" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {message && <p className="text-sm text-red-700">{message}</p>}
        {updatedAt && <p className="text-xs text-gray-400">Updated {updatedAt} IST · refreshes every minute · acting as {actor}</p>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
        <ul className="xl:col-span-2 space-y-2">
          {visible.length === 0 && (
            <li className="p-4 bg-white rounded-xl text-sm text-gray-500">{loading ? "Loading…" : "No rides in this view."}</li>
          )}
          {visible.map((ride) => {
            const top = ride.flags[0];
            const cancelled = /CANCEL/i.test(ride.status);
            return (
              <li key={ride.bookingId}>
                <button
                  type="button"
                  onClick={() => setSelected(ride.bookingId)}
                  className={`w-full text-left p-3 bg-white rounded-xl border space-y-1 ${selected === ride.bookingId ? "border-gray-900" : "border-transparent"} ${cancelled ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{pickupClock(ride.startTime)}</span>
                    <span className="text-xs text-gray-500">{countdown(ride.minutesToPickup)}</span>
                    <TierBadge tier={ride.tier} sponsor={ride.sponsorPriority} />
                    {cancelled && <span className="text-xs text-gray-500">cancelled</span>}
                  </div>
                  <p className="text-sm">
                    {ride.guestName}{ride.companyName ? ` · ${ride.companyName}` : ""} · <span className="text-gray-500">{ride.bookingId}</span>
                  </p>
                  <p className="text-sm text-gray-600 truncate">{ride.sourceName} → {ride.destinationName}</p>
                  <p className="text-xs text-gray-600">
                    {ride.conciergeOwner ? `Owner ${ride.conciergeOwner}` : "No owner"} · Driver {ride.driverState}
                    {ride.driverName ? ` (${ride.driverName})` : ""} · {ride.journeyStage} · checks {ride.verifiedEvidence}/{ride.evidenceCount}
                    {ride.openTasks > 0 ? ` · ${ride.openTasks} open task${ride.openTasks > 1 ? "s" : ""}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">{latestStep(ride)}</p>
                  {top && (
                    <p className={`text-xs border rounded px-2 py-1 ${FLAG_STYLES[top.level]}`}>
                      {top.message}{ride.flags.length > 1 ? ` (+${ride.flags.length - 1} more)` : ""}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="xl:col-span-3 xl:sticky xl:top-4">
          {selected ? (
            <VipDeskRide bookingId={selected} actor={actor} onChanged={load} />
          ) : (
            <div className="p-4 bg-white rounded-xl text-sm text-gray-500">Pick a ride to see its timeline, checks and messages.</div>
          )}
        </div>
      </div>
    </div>
  );
}
