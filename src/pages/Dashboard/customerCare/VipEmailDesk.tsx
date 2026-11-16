import { useEffect, useState } from "react";
import { GetVipAPI, PostVipAPI } from "../../../config/apiMethods";
import { VIP_EMAIL_DRAFT, VIP_EMAIL_LIST, VIP_EMAIL_SENT, VIP_PROFILES } from "../../../config/apiEndpoints";

export default function VipEmailDesk() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [form, setForm] = useState({ profileId: "", fromEmail: "", subject: "", body: "", bookingId: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [people, mail] = await Promise.all([
      GetVipAPI<any>(VIP_PROFILES),
      GetVipAPI<any>(VIP_EMAIL_LIST),
    ]);
    setProfiles(people.data?.data || []);
    setDrafts(mail.data?.data || []);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err?.response?.data?.message || err.message));
  }, []);

  return (
    <div className="p-4 bg-white rounded-xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">VIP email desk</h1>
        <p className="text-sm text-gray-500">Paste the inbound mail. The draft and the driver instruction are prepared here. You send the email. Nothing goes out on its own.</p>
        {message && <p className="text-sm mt-2">{message}</p>}
      </div>
      <form
        className="space-y-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await PostVipAPI<any>(VIP_EMAIL_DRAFT, {
            ...form,
            profileId: form.profileId ? Number(form.profileId) : null,
          });
          setMessage(response.data?.message || "Draft ready");
          setForm({ ...form, body: "" });
          await load();
        }}
      >
        <select className="border rounded px-3 py-2 text-sm w-full" value={form.profileId} onChange={(event) => setForm({ ...form, profileId: event.target.value })}>
          <option value="">Profile, if known</option>
          {profiles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="From email" value={form.fromEmail} onChange={(event) => setForm({ ...form, fromEmail: event.target.value })} />
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Booking id, if this is about a ride" value={form.bookingId} onChange={(event) => setForm({ ...form, bookingId: event.target.value })} />
        <textarea className="border rounded px-3 py-2 text-sm w-full min-h-28" placeholder="Paste the email" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
        <button className="bg-gray-900 text-white rounded px-3 py-2 text-sm" type="submit">Draft reply</button>
      </form>
      <div className="space-y-3">
        {drafts.map((row) => (
          <article key={row.id} className="border rounded p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <strong>{row.subject || "(no subject)"}</strong>
              <span>{row.status}</span>
            </div>
            <p className="text-gray-500">{row.fromEmail}</p>
            <p className="whitespace-pre-wrap">{row.draftReply}</p>
            <p className="text-xs text-gray-500">{row.vipService}</p>
            {row.status !== "SENT" && (
              <button
                className="underline"
                type="button"
                onClick={async () => {
                  const response = await PostVipAPI<any>(VIP_EMAIL_SENT, { id: row.id });
                  setMessage(response.data?.message || "Marked sent");
                  await load();
                }}
              >
                Mark sent
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
