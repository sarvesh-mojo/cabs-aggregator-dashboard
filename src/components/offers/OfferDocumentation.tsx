import { useState } from "react";

const DOC_SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <>
        <p className="mb-3">
          The offer system supports flat and percentage discounts, user targeting
          (new/logged-in/guest), device-specific offers, city targeting, cab
          partner rules, schedule-based offers, budget controls, and usage limits.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
          <strong>Note:</strong> Coupon code validation (
          <code>offer_coupon_codes</code>) is handled separately via{" "}
          <code>getApplicableCoupons</code> in fare search — not by the offer
          controller.
        </p>
      </>
    ),
  },
  {
    id: "tables",
    title: "Database Tables",
    content: (
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Table</th>
            <th className="border p-2 text-left">Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2">offers</td>
            <td className="border p-2">Main offer configuration</td>
          </tr>
          <tr>
            <td className="border p-2">offer_rules</td>
            <td className="border p-2">Rule engine conditions</td>
          </tr>
          <tr>
            <td className="border p-2">offer_limits</td>
            <td className="border p-2">Usage and budget limits</td>
          </tr>
          <tr>
            <td className="border p-2">offer_transactions</td>
            <td className="border p-2">Applied / consumed tracking</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    id: "api",
    title: "API Endpoints",
    content: (
      <>
        <p className="mb-2">Base path: <code>POST /api/v1/offers/</code></p>
        <table className="w-full text-sm border-collapse mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Endpoint</th>
              <th className="border p-2 text-left">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">
                <code>/getApplicableOffers</code>
              </td>
              <td className="border p-2">List and evaluate offers</td>
            </tr>
            <tr>
              <td className="border p-2">
                <code>/applyOffer</code>
              </td>
              <td className="border p-2">Apply offer to a searchId</td>
            </tr>
            <tr>
              <td className="border p-2">
                <code>/removeOffer</code>
              </td>
              <td className="border p-2">Remove applied offer</td>
            </tr>
            <tr>
              <td className="border p-2">
                <code>/consumeOffer</code>
              </td>
              <td className="border p-2">Mark offer consumed after booking</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: "rules",
    title: "Supported Rule Types",
    content: (
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>
          <code>user_type</code> — guest / loggedin
        </li>
        <li>
          <code>device_type</code> — web / msite / app
        </li>
        <li>
          <code>city</code> — city code restriction (IN / NOT_IN)
        </li>
        <li>
          <code>cab_partner</code> — cab provider restriction
        </li>
        <li>
          <code>cart_value</code> — fare-based validation
        </li>
        <li>
          <code>ride_count</code> — ride count validation
        </li>
        <li>
          <code>is_new_user</code> — new user flag
        </li>
        <li>
          <code>current_time</code> — SCHEDULE / DATE / DATETIME operators
        </li>
        <li>
          <code>customerId</code> — customer-specific offer
        </li>
      </ul>
    ),
  },
  {
    id: "limits",
    title: "Offer Limits",
    content: (
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>
          <code>total_budget</code> — max total discount budget
        </li>
        <li>
          <code>total_usage_limit</code> — max total redemptions
        </li>
        <li>
          <code>per_user_limit</code> — max uses per customer
        </li>
        <li>
          <code>per_day_limit</code> — max uses per day
        </li>
      </ul>
    ),
  },
  {
    id: "flow",
    title: "Offer Lifecycle",
    content: (
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        <li>Offer created in offers table</li>
        <li>Rules added in offer_rules</li>
        <li>Limits added in offer_limits (recommended for production)</li>
        <li>User searches ride → offers attached via getApplicableOffers</li>
        <li>User selects offer → applyOffer validates and writes transaction</li>
        <li>Booking done → consumeOffer marks transaction consumed</li>
        <li>User removes offer → removeOffer deletes transaction</li>
      </ol>
    ),
  },
];

export function OfferDocumentation() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
  });

  const toggle = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-gray-50 border rounded-xl p-4 mb-6">
      <h3 className="font-semibold text-gray-800 mb-3">
        Offer Engine Documentation
      </h3>
      <div className="space-y-2">
        {DOC_SECTIONS.map((section) => (
          <div key={section.id} className="border rounded-lg bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {section.title}
              <span className="text-gray-400">
                {openSections[section.id] ? "▲" : "▼"}
              </span>
            </button>
            {openSections[section.id] && (
              <div className="px-4 pb-4 text-sm text-gray-600">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
