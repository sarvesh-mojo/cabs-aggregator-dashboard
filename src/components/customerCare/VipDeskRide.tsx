import { ChangeEvent, useEffect, useState } from "react";
import { GetVipAPI, PostVipAPI } from "../../config/apiMethods";
import {
  VIP_BRIDGE_CLOSE,
  VIP_DESK_EVENT,
  VIP_DESK_EVIDENCE,
  VIP_DESK_EVIDENCE_REVIEW,
  VIP_DESK_FEEDBACK,
  VIP_DESK_MESSAGE,
  VIP_DESK_MESSAGE_PREVIEW,
  VIP_DESK_OWNER,
  VIP_DESK_RIDE,
  VIP_DESK_TIER,
} from "../../config/apiEndpoints";

export type DeskFlag = { code: string; level: "critical" | "warn" | "info"; message: string };

export const FLAG_STYLES: Record<DeskFlag["level"], string> = {
  critical: "bg-red-50 text-red-800 border-red-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
};

export const EVENT_LABELS: Record<string, string> = {
  booking_confirmed: "Booking confirmed",
  concierge_assigned: "Concierge assigned",
  callback_completed: "Welcome callback done",
  vehicle_reserved: "Vehicle reserved with partner",
  driver_reconfirmed: "T-24h driver reconfirmed",
  driver_verified: "Driver + vehicle verified",
  driver_shared: "Driver details shared",
  monitoring_started: "Monitoring started",
  driver_en_route: "Driver en route",
  driver_arrived: "Driver arrived",
  ride_started: "Guest boarded / trip started",
  ride_completed: "Ride completed",
  feedback_received: "Feedback received",
  exception_raised: "Exception raised",
  escalated: "Escalated",
};

const JOURNEY_STEPS = [
  "booking_confirmed",
  "concierge_assigned",
  "callback_completed",
  "vehicle_reserved",
  "driver_reconfirmed",
  "driver_verified",
  "driver_shared",
  "monitoring_started",
  "driver_en_route",
  "driver_arrived",
  "ride_started",
  "ride_completed",
  "feedback_received",
];

const PARTNER_HINT: Record<string, string> = {
  vehicle_reserved: "cabAssigned",
  driver_en_route: "cabLeftForPickup",
  driver_arrived: "cabReachedSource",
  ride_started: "cabTripStarted",
  ride_completed: "cabTripEnd",
};

const BASE_CHECKLIST = [
  "Vehicle matches booking (model and plate)",
  "Clean interior and exterior",
  "Water and candies on board",
  "Chauffeur briefed on VIP SOP",
  "Lost-and-found check done",
];
const ENHANCED_CHECKLIST = ["Car age and condition checked", "Video walkaround reviewed"];
const SUPER_CHECKLIST = ["Chauffeur identity validated"];

function checklistFor(tier: string) {
  if (tier === "SUPER_VIP") return [...BASE_CHECKLIST, ...ENHANCED_CHECKLIST, ...SUPER_CHECKLIST];
  if (tier === "VVIP") return [...BASE_CHECKLIST, ...ENHANCED_CHECKLIST];
  return BASE_CHECKLIST;
}

const ESCALATION_BY_TIER: Record<string, string> = {
  VIP: "VIP_OPERATIONS",
  VVIP: "SENIOR_OPERATIONS",
  SUPER_VIP: "LEADERSHIP",
};

const TABS = ["Timeline", "Concierge", "Vehicle checks", "Messages", "Feedback", "Tasks & audit"] as const;
type Tab = (typeof TABS)[number];

const inputClass = "border rounded px-3 py-2 text-sm w-full";
const buttonClass = "border rounded px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50";
const primaryClass = "rounded px-3 py-1.5 text-sm bg-gray-900 text-white disabled:opacity-50";

function errorText(err: any) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}

function clock(value?: string | null) {
  if (!value) return "";
  const [date, time] = String(value).split(" ");
  return `${date?.slice(8, 10)}/${date?.slice(5, 7)} ${time?.slice(0, 5) || ""}`;
}

function nowLocalInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function VipDeskRide({
  bookingId,
  actor,
  onChanged,
}: {
  bookingId: string;
  actor: string;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("Timeline");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await GetVipAPI<any>(VIP_DESK_RIDE, { bookingId });
    setDetail(response.data?.data || null);
  }

  useEffect(() => {
    setDetail(null);
    setMessage("");
    load().catch((err) => setMessage(errorText(err)));
  }, [bookingId]);

  async function post(path: string, body: Record<string, any>, done?: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await PostVipAPI<any>(path, { ...body, actor });
      setMessage(done || response.data?.message || "Saved");
      await load();
      onChanged();
      return response.data;
    } catch (err) {
      setMessage(errorText(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return <div className="p-4 bg-white rounded-xl text-sm text-gray-500">{message || "Loading ride…"}</div>;
  }

  const { summary, booking } = detail;

  return (
    <div className="p-4 bg-white rounded-xl space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{booking.bookingId}</h2>
          <TierBadge tier={summary.tier} sponsor={summary.sponsorPriority} />
          <span className="text-xs border rounded px-2 py-0.5">{summary.journeyStage}</span>
          <span className="text-xs border rounded px-2 py-0.5">Driver {summary.driverState}</span>
        </div>
        <p className="text-sm">{booking.userName} · {booking.mobile}{booking.email ? ` · ${booking.email}` : ""}</p>
        <p className="text-sm">{booking.sourceName} → {booking.destinationName}</p>
        <p className="text-sm text-gray-600">
          Pickup {clock(booking.startTime)} · {booking.cabPartner || "no partner"} ·{" "}
          {booking.driverName ? `${booking.driverName} ${booking.driverMobile || ""} · ${booking.vehicleType || ""} ${booking.vehicleNumber || ""}` : "no driver on booking"}
        </p>
        <p className="text-sm text-gray-600">
          Concierge {summary.conciergeOwner || "not assigned"}{summary.conciergeBackup ? ` · backup ${summary.conciergeBackup}` : ""} · monitoring from T-{summary.monitoringLeadMin} min
        </p>
        {booking.trackingUrl && (
          <a className="text-sm underline" href={booking.trackingUrl} target="_blank" rel="noreferrer">Live ride link</a>
        )}
        {summary.flags.length > 0 && (
          <ul className="space-y-1 pt-1">
            {summary.flags.map((flag: DeskFlag) => (
              <li key={flag.code} className={`text-sm border rounded px-2 py-1 ${FLAG_STYLES[flag.level]}`}>{flag.message}</li>
            ))}
          </ul>
        )}
        {message && <p className="text-sm font-medium">{message}</p>}
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className={`px-3 py-1.5 text-sm -mb-px border-b-2 ${tab === name ? "border-gray-900 font-medium" : "border-transparent text-gray-500"}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === "Timeline" && <TimelineTab detail={detail} busy={busy} post={post} />}
      {tab === "Concierge" && <ConciergeTab detail={detail} busy={busy} post={post} />}
      {tab === "Vehicle checks" && <EvidenceTab detail={detail} busy={busy} post={post} setMessage={setMessage} />}
      {tab === "Messages" && <MessagesTab detail={detail} busy={busy} post={post} />}
      {tab === "Feedback" && <FeedbackTab detail={detail} busy={busy} post={post} />}
      {tab === "Tasks & audit" && <TasksTab detail={detail} busy={busy} post={post} />}
    </div>
  );
}

export function TierBadge({ tier, sponsor }: { tier: string; sponsor?: string }) {
  return (
    <>
      <span className="text-xs rounded px-2 py-0.5 bg-gray-900 text-white">{tier === "SUPER_VIP" ? "Super VIP" : tier}</span>
      {sponsor === "FOUNDER_DESK" && <span className="text-xs rounded px-2 py-0.5 bg-purple-700 text-white">Founder's Desk</span>}
      {sponsor === "CORPORATE" && <span className="text-xs rounded px-2 py-0.5 border">Corporate</span>}
    </>
  );
}

type TabProps = {
  detail: any;
  busy: boolean;
  post: (path: string, body: Record<string, any>, done?: string) => Promise<any>;
};

function TimelineTab({ detail, busy, post }: TabProps) {
  const { summary, events } = detail;
  const [eventType, setEventType] = useState("callback_completed");
  const [eventAt, setEventAt] = useState("");
  const [reason, setReason] = useState("");
  const firstAt: Record<string, string> = summary.eventTimes || {};

  async function record(type: string, extra: Record<string, any> = {}) {
    const result = await post(VIP_DESK_EVENT, {
      bookingId: summary.bookingId,
      eventType: type,
      eventAt: eventAt ? eventAt.replace("T", " ") : null,
      reason: reason || null,
      ...extra,
    }, `${EVENT_LABELS[type] || type} recorded`);
    if (result) {
      setEventAt("");
      setReason("");
    }
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-1">
        {JOURNEY_STEPS.map((type) => {
          const at = firstAt[type];
          const hint = PARTNER_HINT[type] && summary.partnerFlags?.[PARTNER_HINT[type]] && !at;
          return (
            <li key={type} className="flex items-center justify-between gap-3 text-sm border-b py-1">
              <span className={at ? "" : "text-gray-500"}>
                {at ? "✓" : "○"} {EVENT_LABELS[type]}
                {hint && <span className="ml-2 text-xs text-amber-700">partner app shows this, time not recorded</span>}
              </span>
              {at ? (
                <span className="font-mono text-xs">{clock(at)}</span>
              ) : type === "booking_confirmed" || type === "feedback_received" || type === "concierge_assigned" ? (
                <span className="text-xs text-gray-400">{type === "concierge_assigned" ? "Concierge tab" : type === "feedback_received" ? "Feedback tab" : ""}</span>
              ) : (
                <button type="button" className={buttonClass} disabled={busy} onClick={() => record(type)}>Record</button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="text-xs text-gray-600">
          Happened at (IST, blank = now)
          <input className={inputClass} type="datetime-local" max={nowLocalInput()} value={eventAt} onChange={(event) => setEventAt(event.target.value)} />
        </label>
        <label className="text-xs text-gray-600 md:col-span-2">
          Note / reason (kept internal)
          <input className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Called driver Ravi, confirmed 7:30 pickup" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="border rounded px-2 py-1.5 text-sm" value={eventType} onChange={(event) => setEventType(event.target.value)}>
          {JOURNEY_STEPS.filter((type) => !["booking_confirmed", "concierge_assigned", "feedback_received"].includes(type)).map((type) => (
            <option key={type} value={type}>{EVENT_LABELS[type]}</option>
          ))}
        </select>
        <button type="button" className={primaryClass} disabled={busy} onClick={() => record(eventType)}>Record event</button>
        <button type="button" className={buttonClass} disabled={busy || !reason} onClick={() => record("exception_raised")}>Raise exception</button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy || !reason}
          onClick={() => record("escalated", { meta: { level: ESCALATION_BY_TIER[summary.tier] || "VIP_OPERATIONS" } })}
        >
          Escalate to {(ESCALATION_BY_TIER[summary.tier] || "VIP_OPERATIONS").replace(/_/g, " ").toLowerCase()}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-sm">Event log</h3>
        <ul className="text-sm divide-y">
          {events.length === 0 && <li className="py-1 text-gray-500">Nothing recorded yet.</li>}
          {events.map((event: any, index: number) => (
            <li key={`${event.eventType}-${event.eventAt}-${index}`} className="py-1 flex flex-wrap gap-x-3">
              <span className="font-mono text-xs">{clock(event.eventAt)}</span>
              <span>{EVENT_LABELS[event.eventType] || event.eventType}</span>
              <span className="text-gray-500">{event.actor || ""}</span>
              {event.reason && <span className="text-gray-600">· {event.reason}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConciergeTab({ detail, busy, post }: TabProps) {
  const { summary, ops, profile, booking } = detail;
  const [owner, setOwner] = useState({
    conciergeOwner: ops?.conciergeOwner || profile?.conciergeName || "",
    conciergeOwnerPhone: ops?.conciergeOwnerPhone || profile?.conciergePhone || "",
    conciergeBackup: ops?.conciergeBackup || profile?.conciergeBackup || "",
    reason: "",
  });
  const [tier, setTier] = useState({
    scope: profile ? "PROFILE" : "RIDE",
    vipTier: summary.tier,
    sponsorPriority: summary.sponsorPriority,
    ibcLevel: profile?.ibcLevel || "",
    conciergeName: profile?.conciergeName || "",
    conciergeBackup: profile?.conciergeBackup || "",
    reason: "",
  });
  const needsBackup = summary.tier !== "VIP" || summary.sponsorPriority === "FOUNDER_DESK";

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="font-semibold text-sm">Ride owner</h3>
        <p className="text-xs text-gray-500">
          One named concierge owns the ride end to end. {needsBackup ? "This tier needs a backup." : "Backup optional for VIP."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className={inputClass} placeholder="Concierge name" value={owner.conciergeOwner} onChange={(event) => setOwner({ ...owner, conciergeOwner: event.target.value })} />
          <input className={inputClass} placeholder="Concierge phone" value={owner.conciergeOwnerPhone} onChange={(event) => setOwner({ ...owner, conciergeOwnerPhone: event.target.value })} />
          <input className={inputClass} placeholder="Backup concierge" value={owner.conciergeBackup} onChange={(event) => setOwner({ ...owner, conciergeBackup: event.target.value })} />
          <input className={`${inputClass} md:col-span-3`} placeholder="Reason (handover, shift change…)" value={owner.reason} onChange={(event) => setOwner({ ...owner, reason: event.target.value })} />
        </div>
        <button
          type="button"
          className={primaryClass}
          disabled={busy || !owner.conciergeOwner || (needsBackup && !owner.conciergeBackup)}
          onClick={() => post(VIP_DESK_OWNER, { bookingId: booking.bookingId, ...owner })}
        >
          {ops?.conciergeOwner ? "Hand over" : "Assign concierge"}
        </button>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-sm">Tier and priority</h3>
        <p className="text-xs text-gray-500">Senior-ops override. Reason, actor and time go to the audit trail. Fare alone should not set the tier.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className={inputClass} value={tier.scope} onChange={(event) => setTier({ ...tier, scope: event.target.value })}>
            {profile && <option value="PROFILE">Profile ({profile.name}) — all rides</option>}
            <option value="RIDE">This ride only</option>
          </select>
          <select className={inputClass} value={tier.vipTier} onChange={(event) => setTier({ ...tier, vipTier: event.target.value })}>
            <option value="VIP">VIP · T-60 monitoring</option>
            <option value="VVIP">VVIP · T-120 monitoring</option>
            <option value="SUPER_VIP">Super VIP · T-180 monitoring</option>
          </select>
          <select className={inputClass} value={tier.sponsorPriority} onChange={(event) => setTier({ ...tier, sponsorPriority: event.target.value })}>
            <option value="STANDARD">Standard sponsor</option>
            <option value="CORPORATE">Corporate sponsor</option>
            <option value="FOUNDER_DESK">Founder's Desk</option>
          </select>
          {tier.scope === "PROFILE" && (
            <>
              <select className={inputClass} value={tier.ibcLevel} onChange={(event) => setTier({ ...tier, ibcLevel: event.target.value })}>
                <option value="">IBC level —</option>
                <option value="LOW">IBC low</option>
                <option value="MEDIUM">IBC medium</option>
                <option value="HIGH">IBC high</option>
                <option value="VERY_HIGH">IBC very high</option>
              </select>
              <input className={inputClass} placeholder="Default concierge" value={tier.conciergeName} onChange={(event) => setTier({ ...tier, conciergeName: event.target.value })} />
              <input className={inputClass} placeholder="Default backup" value={tier.conciergeBackup} onChange={(event) => setTier({ ...tier, conciergeBackup: event.target.value })} />
            </>
          )}
          <input className={`${inputClass} md:col-span-3`} placeholder="Reason (required)" value={tier.reason} onChange={(event) => setTier({ ...tier, reason: event.target.value })} />
        </div>
        <button
          type="button"
          className={primaryClass}
          disabled={busy || tier.reason.trim().length < 3}
          onClick={() => post(VIP_DESK_TIER, {
            ...tier,
            profileId: tier.scope === "PROFILE" ? profile?.id : undefined,
            bookingId: tier.scope === "RIDE" ? booking.bookingId : undefined,
            ibcLevel: tier.ibcLevel || null,
          })}
        >
          Save tier
        </button>
      </section>

      {booking.vipService && (
        <section>
          <h3 className="font-semibold text-sm">Guest instructions</h3>
          <pre className="text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap">{JSON.stringify(booking.vipService, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}

function EvidenceTab({ detail, busy, post, setMessage }: TabProps & { setMessage: (text: string) => void }) {
  const { summary, booking, evidence } = detail;
  const [file, setFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState(nowLocalInput());
  const [vehicleNumber, setVehicleNumber] = useState(booking.vehicleNumber || "");
  const [driverName, setDriverName] = useState(booking.driverName || "");
  const [note, setNote] = useState("");
  const items = checklistFor(summary.tier);

  async function upload() {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setMessage("File is larger than 8 MB. Trim the video or send a photo.");
      return;
    }
    const data = await readAsDataUrl(file);
    const result = await post(VIP_DESK_EVIDENCE, {
      bookingId: booking.bookingId,
      fileName: file.name,
      contentType: file.type,
      data,
      capturedAt: capturedAt.replace("T", " "),
      vehicleNumber,
      driverName,
      note,
    });
    if (result) {
      setFile(null);
      setNote("");
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="font-semibold text-sm">Add photo or video</h3>
        <p className="text-xs text-gray-500">
          {summary.tier === "VIP" ? "Photos + checklist." : "Photos and video + enhanced checks."} Time-stamp it with when the partner took it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            className={inputClass}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] || null)}
          />
          <label className="text-xs text-gray-600">
            Captured at (IST)
            <input className={inputClass} type="datetime-local" max={nowLocalInput()} value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} />
          </label>
          <input className={inputClass} placeholder="Vehicle number" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} />
          <input className={inputClass} placeholder="Chauffeur name" value={driverName} onChange={(event) => setDriverName(event.target.value)} />
          <input className={`${inputClass} md:col-span-2`} placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <button type="button" className={primaryClass} disabled={busy || !file} onClick={upload}>Upload</button>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-sm">Evidence ({evidence.length})</h3>
        {evidence.length === 0 && <p className="text-sm text-gray-500">No photos or videos yet.</p>}
        {evidence.map((item: any) => (
          <EvidenceItem key={item.id} item={item} checklist={items} busy={busy} post={post} />
        ))}
      </section>
    </div>
  );
}

function EvidenceItem({ item, checklist, busy, post }: { item: any; checklist: string[]; busy: boolean; post: TabProps["post"] }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const allPassed = checklist.every((name) => checks[name]);
  const reviewed = item.status !== "PENDING";

  return (
    <article className="border rounded p-3 space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        {item.url && item.mediaType === "photo" && (
          <a href={item.url} target="_blank" rel="noreferrer">
            <img src={item.url} alt={item.fileName || "vehicle"} className="h-28 w-40 object-cover rounded" />
          </a>
        )}
        {item.url && item.mediaType === "video" && (
          <video src={item.url} controls className="h-28 w-48 rounded" />
        )}
        <div className="text-sm space-y-0.5">
          <p>
            <span className={`text-xs rounded px-2 py-0.5 ${item.status === "VERIFIED" ? "bg-green-100 text-green-800" : item.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-gray-100"}`}>{item.status}</span>{" "}
            {item.mediaType} · captured {clock(item.capturedAt)}
          </p>
          <p className="text-gray-600">{[item.vehicleNumber, item.driverName].filter(Boolean).join(" · ")}</p>
          <p className="text-gray-500 text-xs">Uploaded by {item.uploadedBy || "—"}{item.verifiedBy ? ` · reviewed by ${item.verifiedBy} at ${clock(item.verifiedAt)}` : ""}</p>
          {item.note && <p className="text-gray-600 text-xs">{item.note}</p>}
        </div>
      </div>
      {reviewed ? (
        Array.isArray(item.checklist) && item.checklist.length > 0 && (
          <ul className="text-xs text-gray-600">
            {item.checklist.map((check: any) => <li key={check.item}>{check.ok ? "✓" : "✗"} {check.item}</li>)}
          </ul>
        )
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {checklist.map((name) => (
              <label key={name} className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={Boolean(checks[name])} onChange={(event) => setChecks({ ...checks, [name]: event.target.checked })} />
                {name}
              </label>
            ))}
          </div>
          <input className={inputClass} placeholder="Review note (required to reject)" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="flex gap-2">
            <button
              type="button"
              className={primaryClass}
              disabled={busy || !allPassed}
              onClick={() => post(VIP_DESK_EVIDENCE_REVIEW, {
                id: item.id,
                status: "VERIFIED",
                checklist: checklist.map((name) => ({ item: name, ok: true })),
                note: note || null,
              })}
            >
              Verify
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={busy || !note}
              onClick={() => post(VIP_DESK_EVIDENCE_REVIEW, {
                id: item.id,
                status: "REJECTED",
                checklist: checklist.map((name) => ({ item: name, ok: Boolean(checks[name]) })),
                note,
              })}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function MessagesTab({ detail, busy, post }: TabProps) {
  const { booking, templates, messages } = detail;
  const [templateKey, setTemplateKey] = useState<string>(templates.find((template: any) => !template.blockedReason)?.key || templates[0]?.key);
  const [preview, setPreview] = useState<any>(null);
  const [channels, setChannels] = useState<Record<string, boolean>>({ WHATSAPP: true, EMAIL: true });
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    if (!templateKey) return;
    setPreview(null);
    setPreviewError("");
    GetVipAPI<any>(VIP_DESK_MESSAGE_PREVIEW, { bookingId: booking.bookingId, templateKey })
      .then((response) => setPreview(response.data?.data || null))
      .catch((err) => setPreviewError(errorText(err)));
  }, [templateKey, booking.bookingId, messages.length]);

  const selected = templates.find((template: any) => template.key === templateKey);
  const chosen = Object.keys(channels).filter((channel) => channels[channel]);

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="font-semibold text-sm">Send a guest message</h3>
        <p className="text-xs text-gray-500">A message that claims a check stays locked until that check is recorded.</p>
        <ul className="space-y-1">
          {templates.map((template: any) => (
            <li key={template.key}>
              <label className="text-sm flex items-start gap-2">
                <input type="radio" name="template" checked={templateKey === template.key} onChange={() => setTemplateKey(template.key)} />
                <span>
                  {template.label}
                  {!template.whatsappConfigured && <span className="ml-2 text-xs text-gray-500">WhatsApp template not set ({template.whatsappEnv})</span>}
                  {template.blockedReason && <span className="block text-xs text-red-700">{template.blockedReason}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {previewError && <p className="text-sm text-red-700">{previewError}</p>}
        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 rounded p-2">
              <p className="text-xs text-gray-500">WhatsApp to {preview.whatsappTo || "—"}{preview.whatsappTemplate ? ` · ${preview.whatsappTemplate}` : ""}</p>
              <p className="whitespace-pre-wrap">{preview.whatsapp}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Email to {emailTo || preview.emailTo || "—"}</p>
              <p className="font-medium">{preview.emailSubject}</p>
              <p className="whitespace-pre-wrap">{preview.email}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {["WHATSAPP", "EMAIL"].map((channel) => (
            <label key={channel} className="text-sm flex items-center gap-1">
              <input type="checkbox" checked={channels[channel]} onChange={(event) => setChannels({ ...channels, [channel]: event.target.checked })} />
              {channel === "WHATSAPP" ? "WhatsApp" : "Email"}
            </label>
          ))}
          {channels.EMAIL && (
            <>
              <input className="border rounded px-2 py-1 text-sm" placeholder="Email to (optional override)" value={emailTo} onChange={(event) => setEmailTo(event.target.value)} />
              <input className="border rounded px-2 py-1 text-sm" placeholder="CC (EA / sponsor)" value={emailCc} onChange={(event) => setEmailCc(event.target.value)} />
            </>
          )}
        </div>
        <button
          type="button"
          className={primaryClass}
          disabled={busy || !selected || Boolean(selected?.blockedReason) || chosen.length === 0}
          onClick={() => post(VIP_DESK_MESSAGE, {
            bookingId: booking.bookingId,
            templateKey,
            channels: chosen,
            emailTo: emailTo || null,
            emailCc: emailCc || null,
          })}
        >
          Send
        </button>
      </section>

      <section>
        <h3 className="font-semibold text-sm">Sent messages</h3>
        <ul className="text-sm divide-y">
          {messages.length === 0 && <li className="py-1 text-gray-500">None yet.</li>}
          {messages.map((item: any) => (
            <li key={item.id} className="py-1">
              <span className="font-mono text-xs">{clock(item.createdAt)}</span>{" "}
              {item.channel} · {item.templateKey} · {item.recipient || "—"} ·{" "}
              <span className={item.status === "SENT" ? "text-green-700" : "text-red-700"}>{item.status}</span>
              {item.error && <span className="text-gray-500"> · {item.error}</span>}
              <span className="text-gray-500"> · {item.sentBy}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FeedbackTab({ detail, busy, post }: TabProps) {
  const { booking, feedback } = detail;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [remember, setRemember] = useState("");
  const [consent, setConsent] = useState(false);
  const [issue, setIssue] = useState(false);

  async function save() {
    const result = await post(VIP_DESK_FEEDBACK, {
      bookingId: booking.bookingId,
      rating,
      comment,
      remember,
      consentToRemember: consent,
      issue,
    });
    if (result) {
      setRating(0);
      setComment("");
      setRemember("");
      setConsent(false);
      setIssue(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="font-semibold text-sm">Record guest feedback</h3>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`w-9 h-9 rounded border text-sm ${rating === value ? "bg-gray-900 text-white" : ""}`}
              onClick={() => setRating(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <textarea className={inputClass} rows={2} placeholder="What the guest said" value={comment} onChange={(event) => setComment(event.target.value)} />
        <input className={inputClass} placeholder="What should we remember for the next ride?" value={remember} onChange={(event) => setRemember(event.target.value)} />
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          Guest agreed we save this as a preference
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={issue} onChange={(event) => setIssue(event.target.checked)} />
          Open a service ticket (automatic for 1–2 stars)
        </label>
        <button type="button" className={primaryClass} disabled={busy || rating === 0} onClick={save}>Save feedback</button>
      </section>

      <section>
        <h3 className="font-semibold text-sm">Feedback on this ride</h3>
        <ul className="text-sm divide-y">
          {feedback.length === 0 && <li className="py-1 text-gray-500">None yet.</li>}
          {feedback.map((item: any) => (
            <li key={item.id} className="py-1">
              <span className="font-mono text-xs">{clock(item.createdAt)}</span> · {item.rating}/5
              {item.comment && <> · {item.comment}</>}
              {item.remember && <span className="text-gray-600"> · remember: {item.remember}</span>}
              {Number(item.issue) === 1 && <span className="text-red-700"> · ticket #{item.taskId}</span>}
              <span className="text-gray-500"> · {item.createdBy}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TasksTab({ detail, busy, post }: TabProps) {
  const { tasks, audit } = detail;
  const [resolution, setResolution] = useState<Record<number, string>>({});

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-semibold text-sm">Bridge tasks</h3>
        <ul className="text-sm divide-y">
          {tasks.length === 0 && <li className="py-1 text-gray-500">No tasks on this ride.</li>}
          {tasks.map((task: any) => (
            <li key={task.id} className="py-2 space-y-1">
              <p>
                <span className="font-mono text-xs">{clock(task.createdAt)}</span> · {task.kind} ·{" "}
                <span className={task.status === "OPEN" ? "text-amber-700" : "text-green-700"}>{task.status}</span>
              </p>
              {task.detail && <p className="text-gray-600 whitespace-pre-wrap">{task.detail}</p>}
              {task.status === "OPEN" ? (
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 text-sm flex-1"
                    placeholder="Resolution"
                    value={resolution[task.id] || ""}
                    onChange={(event) => setResolution({ ...resolution, [task.id]: event.target.value })}
                  />
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy || (resolution[task.id] || "").trim().length < 2}
                    onClick={() => post(VIP_BRIDGE_CLOSE, { id: task.id, resolution: resolution[task.id] })}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Closed by {task.closedBy || "—"} at {clock(task.closedAt)}{task.resolution ? ` · ${task.resolution}` : ""}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold text-sm">Audit trail</h3>
        <ul className="text-sm divide-y">
          {audit.length === 0 && <li className="py-1 text-gray-500">No overrides or reviews yet.</li>}
          {audit.map((item: any, index: number) => (
            <li key={`${item.createdAt}-${index}`} className="py-1">
              <span className="font-mono text-xs">{clock(item.createdAt)}</span> · {item.action} · {item.actor || "—"}
              {item.reason && <span className="text-gray-600"> · {item.reason}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
