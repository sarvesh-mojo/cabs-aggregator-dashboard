import { FormEvent, useEffect, useState } from "react";
import { GetVipAPI, PostVipAPI } from "../../../config/apiMethods";
import {
  VIP_GRANT_CREDITS,
  VIP_LEDGER,
  VIP_POOL,
  VIP_POOL_OFF,
  VIP_CUSTOMER_TYPE,
  VIP_PROFILE_UPDATE,
  VIP_PROFILES,
  VIP_SEED,
} from "../../../config/apiEndpoints";

const emptyForm = {
  slug: "",
  role: "principal",
  customerType: "vip",
  name: "",
  mobile: "",
  email: "",
  companyName: "",
  designation: "",
  homeAddress: "",
  homeLat: "",
  homeLng: "",
  officeAddress: "",
  officeLat: "",
  officeLng: "",
  airportCode: "",
  conciergePhone: "",
};

type Notice = { tone: "error" | "ok"; text: string };

function readApiError(error: unknown, fallback: string) {
  const err = error as {
    message?: string;
    response?: { status?: number; data?: unknown };
    config?: { baseURL?: string };
  };
  const status = err.response?.status;
  const data = err.response?.data;
  let detail = "";
  if (typeof data === "string") {
    detail = data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } else if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    const raw = body.message ?? body.error ?? body.msg;
    if (typeof raw === "string") detail = raw.trim();
  }
  if (!detail || detail.length > 280) {
    if (status === 403) detail = "Not allowed to call the VIP API";
    else if (status === 401) detail = "VIP API rejected the login token";
    else detail = err.message || fallback;
  }
  const host = String(err.config?.baseURL || "").replace(/\/$/, "");
  const statusText = status ? ` (${status})` : "";
  const hostText = host ? ` — ${host}` : "";
  return `${detail}${statusText}${hostText}`;
}

export default function VipProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [pool, setPool] = useState<any[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [grantAmount, setGrantAmount] = useState("5000");
  const [ledger, setLedger] = useState<any>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copiedSlug, setCopiedSlug] = useState("");
  const linkHost = "https://chat.bookairportcab.com";

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${linkHost}/v/${slug}`);
      setCopiedSlug(slug);
      window.setTimeout(() => {
        setCopiedSlug((current) => (current === slug ? "" : current));
      }, 1500);
    } catch {
      setNotice({ tone: "error", text: "Could not copy the link." });
    }
  }

  async function load() {
    const [people, partnersInPool] = await Promise.all([
      GetVipAPI<any>(VIP_PROFILES),
      GetVipAPI<any>(VIP_POOL),
    ]);
    setProfiles(people.data?.data || []);
    setPool(partnersInPool.data?.data || []);
  }

  async function run(work: () => Promise<string | void>, fallback: string) {
    try {
      const text = await work();
      if (text) setNotice({ tone: "ok", text });
    } catch (error) {
      setNotice({ tone: "error", text: readApiError(error, fallback) });
    }
  }

  useEffect(() => {
    run(() => load(), "Could not load VIP profiles.");
  }, []);

  function setField(key: string, value: string) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    const body = {
      id: form.id || undefined,
      slug: form.slug,
      role: form.role,
      customerType: form.customerType || "vip",
      name: form.name,
      mobile: form.mobile,
      email: form.email,
      companyName: form.companyName,
      designation: form.designation,
      homeAddress: form.homeAddress,
      officeAddress: form.officeAddress,
      airportCode: form.airportCode,
      conciergePhone: form.conciergePhone,
      homeLat: form.homeLat === "" || form.homeLat == null ? null : Number(form.homeLat),
      homeLng: form.homeLng === "" || form.homeLng == null ? null : Number(form.homeLng),
      officeLat: form.officeLat === "" || form.officeLat == null ? null : Number(form.officeLat),
      officeLng: form.officeLng === "" || form.officeLng == null ? null : Number(form.officeLng),
      active: true,
    };
    await run(async () => {
      const response = await PostVipAPI<any>(form.id ? VIP_PROFILE_UPDATE : VIP_PROFILES, body);
      const payload = response.data;
      if (payload?.status === "failure" || payload?.success === false) {
        throw Object.assign(new Error(payload?.message || "Could not save the VIP profile."), {
          response: { data: payload, status: response.status },
          config: response.config,
        });
      }
      setForm(emptyForm);
      await load();
      return payload?.message || "Saved";
    }, "Could not save the VIP profile.");
  }

  return (
    <div className="p-4 bg-white rounded-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">VIP profiles</h1>
        <p className="text-sm text-gray-500">Signups stay normal until you mark them VIP. After that they get credits, the personal link, and their new bookings land in the VIP section.</p>
        {notice && (
          <p
            role="alert"
            className={`text-sm mt-3 rounded-lg px-3 py-2 ${
              notice.tone === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>

      <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={saveProfile}>
        {(["slug", "name", "mobile", "email", "companyName", "designation", "homeAddress", "homeLat", "homeLng", "officeAddress", "officeLat", "officeLng", "airportCode", "conciergePhone"] as const).map((key) => (
          <input
            key={key}
            className="border rounded px-3 py-2 text-sm"
            placeholder={({
              companyName: "Company name",
              designation: "Designation",
              homeAddress: "Home address",
              homeLat: "Home latitude",
              homeLng: "Home longitude",
              officeAddress: "Company address",
              officeLat: "Company latitude",
              officeLng: "Company longitude",
            } as Record<string, string>)[key] || key}
            value={form[key]}
            onChange={(event) => setField(key, event.target.value)}
            required={key === "slug" || key === "name" || key === "mobile"}
          />
        ))}
        <select className="border rounded px-3 py-2 text-sm" value={form.role} onChange={(event) => setField("role", event.target.value)}>
          <option value="principal">principal</option>
          <option value="agent">agent</option>
        </select>
        <select className="border rounded px-3 py-2 text-sm" value={form.customerType || "vip"} onChange={(event) => setField("customerType", event.target.value)}>
          <option value="vip">VIP</option>
          <option value="normal">Normal</option>
        </select>
        <button className="bg-gray-900 text-white rounded px-3 py-2 text-sm" type="submit">
          {form.id ? "Update profile" : "Create profile"}
        </button>
        <button
          className="border rounded px-3 py-2 text-sm"
          type="button"
          onClick={() =>
            run(async () => {
              const response = await PostVipAPI<any>(VIP_SEED, {});
              await load();
              return response.data?.message || "Seeded";
            }, "Could not seed VIP profiles.")
          }
        >
          Seed from VIP queue
        </button>
      </form>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th>Name</th><th>Type</th><th>Link</th><th>Credits</th><th>Role</th><th></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2">{row.name}<div className="text-gray-500">{row.mobile}</div></td>
                <td>{row.customerType === "normal" ? "Normal" : "VIP"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="break-all">{linkHost}/v/{row.slug}</span>
                    <button
                      type="button"
                      className="shrink-0 border rounded px-2 py-1 text-xs"
                      onClick={() => copyLink(row.slug)}
                    >
                      {copiedSlug === row.slug ? "Copied" : "Copy"}
                    </button>
                  </div>
                </td>
                <td>₹{row.creditBalance}</td>
                <td>{row.role}</td>
                <td className="space-x-2">
                  <button type="button" className="underline" onClick={() => setForm({ ...emptyForm, ...row, customerType: row.customerType || "vip", homeLat: row.homeLat ?? "", homeLng: row.homeLng ?? "", officeLat: row.officeLat ?? "", officeLng: row.officeLng ?? "" })}>Edit</button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      run(async () => {
                        const next = row.customerType === "normal" ? "vip" : "normal";
                        await PostVipAPI(VIP_CUSTOMER_TYPE, { id: row.id, customerType: next });
                        await load();
                        return next === "vip" ? "Marked as VIP" : "Set as normal";
                      }, "Could not update the customer type.")
                    }
                  >
                    {row.customerType === "normal" ? "Mark as VIP" : "Set as normal"}
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      run(async () => {
                        await PostVipAPI(VIP_GRANT_CREDITS, { profileId: row.id, amount: Number(grantAmount), note: "Gift credits" });
                        await load();
                        return `Granted ₹${grantAmount}`;
                      }, "Could not grant credits.")
                    }
                  >
                    Grant ₹{grantAmount}
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      run(async () => {
                        const response = await GetVipAPI<any>(VIP_LEDGER, { profileId: row.id });
                        setLedger(response.data?.data);
                      }, "Could not load the credit ledger.")
                    }
                  >
                    Ledger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="text-sm text-gray-500">Gift amount
          <input className="border rounded ml-2 px-2 py-1 w-24" value={grantAmount} onChange={(event) => setGrantAmount(event.target.value)} />
        </label>
      </div>

      {ledger && (
        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(ledger, null, 2)}</pre>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">VIP partner pool</h2>
        <p className="text-sm text-gray-500">These partners are the only supply on the VIP lane. vipOnly partners stay off the public fare search. 3x is a settlement flag, not a customer surcharge.</p>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 text-sm" placeholder="PARTNER" value={partnerName} onChange={(event) => setPartnerName(event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="City code or blank" value={cityCode} onChange={(event) => setCityCode(event.target.value)} />
          <button
            className="bg-gray-900 text-white rounded px-3 py-2 text-sm"
            type="button"
            onClick={() =>
              run(async () => {
                await PostVipAPI(VIP_POOL, { partnerName, cityCode, suvOnly: true, payMultiplier: 3, vipOnly: true });
                setPartnerName("");
                await load();
                return "Partner added to the VIP pool";
              }, "Could not add the partner.")
            }
          >
            Add SUV partner
          </button>
        </div>
        <ul className="text-sm">
          {pool.map((row) => (
            <li key={row.id} className="flex gap-3 py-1">
              <span>{row.partnerName} {row.cityCode || "all cities"} · {row.active ? "on" : "off"} · {row.payMultiplier}x</span>
              {row.active ? (
                <button type="button" className="underline" onClick={() => run(async () => { await PostVipAPI(VIP_POOL_OFF, { id: row.id }); await load(); return "Partner removed"; }, "Could not remove the partner.")}>Remove</button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
