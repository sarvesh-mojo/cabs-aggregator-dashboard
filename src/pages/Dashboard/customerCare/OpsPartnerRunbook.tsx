import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function GuideTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="min-w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-xs font-semibold text-gray-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-gray-100 align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * In-app runbook for OPS / Product on Ops Partner Control.
 * Full markdown: viaVIP_API/docs/ops-product-r1r2-fare-timeline-runbook.md
 */
const OpsPartnerRunbook = () => {
  return (
    <div className="text-gray-800 max-w-4xl">
      <p className="text-sm text-gray-600 mb-6">
        Use this hub to decide <span className="font-semibold">who is eligible</span> to
        sell and fulfill. R1/R2 pricing itself runs inside viaVIP fare search when{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">R1R2_SELL_ENABLE</code> is on.
        Hourly discount only changes what the customer pays — never which partner is R1.
      </p>

      <Section title="Order of operations">
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
          <li>
            <span className="font-semibold">Eligible</span> — Live (city_cab_status) + Rank /
            enabled (cab_partner_visibility) + under hourly/daily cap.
          </li>
          <li>
            <span className="font-semibold">R1 / R2</span> — cheapest eligible fulfills (R1);
            next eligible is the sell price (R2). Needs ≥2 eligible partners in that vehicle group.
          </li>
          <li>
            <span className="font-semibold">Sell at R2</span> — customer sees R2 fare.
          </li>
          <li>
            <span className="font-semibold">Hourly discount</span> — pct/upto on payable for that
            pickup hour (REGULAR vs EMP).
          </li>
          <li>
            <span className="font-semibold">Park markup</span> — ViaVIP keeps{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">min(R2−R1, advance)</code> on
            partial; never more than prepaid.
          </li>
        </ol>
      </Section>

      <Section title="Which tab to open">
        <GuideTable
          headers={["Tab", "What OPS does", "Typical play"]}
          rows={[
            [
              "Partner portfolio",
              "See one partner’s Live / Rank / Hourly-cap rows; edit exceptions.",
              "Partner = GOZO → filter city DEL → raise hourly cap for late night.",
            ],
            [
              "Hourly discount",
              "Set % and ₹ cap by city, audience, fromHour–toHour.",
              "DEL REGULAR 2–5 AM: 10% upto ₹100.",
            ],
            [
              "Hourly quota",
              "Monitor remaining vs caps (live counters).",
              "Is REFEX already at cap for this hour?",
            ],
            [
              "R1/R2 simulate",
              "City + hour → who looks live / ranked / under cap + active discount.",
              "Sanity check before flipping R1R2_SELL_ENABLE. Live pick still needs a fare search.",
            ],
            [
              "Bulk",
              "Multi-select rows → dry-run → apply the same fields.",
              "Set cap=15 for many DEL airport cities in one go.",
            ],
          ]}
        />
      </Section>

      <Section title="Flags Product / Eng must set (viaVIP app_config)">
        <GuideTable
          headers={["Key", "Default", "When to turn on"]}
          rows={[
            [
              "R1R2_SELL_ENABLE",
              "false",
              "After ≥2 eligible partners exist for target cities and OPS is happy with mix.",
            ],
            [
              "PARTNER_PII_MASK_ENABLE",
              "false",
              "After Exotel / booking.exotelno (or VIAVIP_EXOTEL_MASK_MOBILE) is ready.",
            ],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">
          Partner SMS/email from Gozo is already forced off in code. Tax liability for the
          selling fare is ViaVIP’s.
        </p>
      </Section>

      <Section title="Fare Timeline (different app)">
        <p className="text-sm text-gray-700 mb-2">
          Exact vs Nearby opportunity loss is{" "}
          <span className="font-semibold">Mojo Management → Analytics → Fare Timeline</span>
          (Indigo worker). Use that page to decide whether Phase 3 (re-bid until T−6) is worth
          building — not this hub.
        </p>
      </Section>

      <Section title="Do / Don’t">
        <GuideTable
          headers={["Do", "Don’t"]}
          rows={[
            [
              "Tune Live / Rank / Caps so at least two partners stay eligible.",
              "Turn on R1/R2 when only one partner is live — nothing useful happens.",
            ],
            [
              "Use hourly discount for customer strike/payable.",
              "Expect discount to change who is R1 — it will not.",
            ],
            [
              "Keep Cab Management for rare raw-row debug.",
              "Edit 10k station rows by hand — use Bulk / portfolio filters.",
            ],
          ]}
        />
      </Section>
    </div>
  );
};

export default OpsPartnerRunbook;
