import type { ReactNode } from "react";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function GuideTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="min-w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-xs font-semibold text-gray-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-gray-100 align-top">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line"
                >
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

const IbcRunbook = () => {
  return (
    <div className="text-gray-800">
      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        Use this page to run IndiGo BluChips. It explains every setting on
        this screen, what the number means, and how to confirm a change. A
        save changes only the environment you are logged into. Dev, preprod,
        and production each keep their own values.
      </p>

      <Section title="Two different jobs">
        <GuideTable
          headers={["Job", "What the customer does", "What you configure"]}
          rows={[
            [
              "Burn",
              "Pays the cab with BluChips",
              "Burn switch, daily cap, conversion A and B, redemption fee",
            ],
            [
              "Earn",
              "Pays with card, UPI, or netbanking and receives BluChips",
              "Earn % on this screen. A tier earn % replaces it when the tier switch is on",
            ],
          ]}
        />
        <p className="mt-3 text-sm text-gray-600">
          Burn and earn do not happen on the same booking. A loyalty customer
          who pays with BluChips keeps a 5% engagement reserve and earns 0
          points.
        </p>
      </Section>

      <Section title="After you change a setting">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 mb-4">
          <li>Wait until Submit succeeds. The next fare search uses the new value.</li>
          <li>
            Bookings that already exist keep the earn % and tier saved when
            they were created. Editing a setting does not rewrite them.
          </li>
          <li>
            Ask engineering to run the fare check below. It does not create a
            booking. It searches a Delhi airport departure two days ahead and
            prints the BluChip quote on the first fares.
          </li>
        </ol>
        <pre className="mb-4 overflow-x-auto rounded-xl bg-gray-900 text-gray-100 text-xs p-4">
{`IBC_CHECK_HOST=http://localhost:3002 \\
IBC_CHECK_TIER=1 \\
IBC_CHECK_EXPECT=present \\
npm run ibc:fare-check`}
        </pre>
        <p className="text-sm text-gray-600 mb-3">
          Tier 1 is Gold, 2 is Silver, 3 is Base. Repeat the check with 2 and
          3 when you changed a tier row. Read these fields on each printed
          fare: rpm, ibc, redemptionFee, finalIBC, and conversionRates.
          finalIBC is the points the customer must have: ibc plus the
          redemption fee.
        </p>
        <GuideTable
          headers={["You changed", "The check should", "Look at"]}
          rows={[
            [
              "Burn turned off",
              "Find no BluChip quote on the fares",
              "ibcDetails is missing",
            ],
            [
              "Burn turned on",
              "Find a BluChip quote on the fares",
              "ibcDetails is present",
            ],
            [
              "A redemption fee",
              "Run Gold, then Silver, then Base",
              "redemptionFee. Zero is a real fee of zero",
            ],
            [
              "Conversion A or B",
              "Run the same three tiers",
              "conversionRates, then rpm and ibc",
            ],
            [
              "Tier rows, while the tier switch is off",
              "Use a token that still has a tier",
              "The fee and A/B match the global rows, not the tier rows",
            ],
          ]}
        />
      </Section>

      <Section title="Switches">
        <GuideTable
          headers={["Switch", "Where you change it", "On", "Off"]}
          rows={[
            [
              "Tier config",
              "IBC_TIER_CONFIG_ENABLED on this screen",
              "A Gold, Silver, or Base customer uses that tier's earn %, redemption fee, and conversion A/B.",
              "Everyone uses the global rows. Tier rows can stay filled in. They are not used.",
            ],
            [
              "IBC burn",
              "IBC_BURN_ENABLE on this screen",
              "Customers can pay with card, UPI, netbanking, or BluChips. Fare search shows the BluChip quote.",
              "Fare search hides the quote. A BluChip payment is refused.",
            ],
            [
              "Earn points",
              "Not on this screen. Engineering sets BLUECHIP on the API.",
              "A non-BluChip payment calculates earn points when the booking is created.",
              "No earn points are written.",
            ],
          ]}
        />
        <p className="mt-3 text-sm text-gray-600">
          Burn also turns off when the remaining daily cap is below 2,000
          points. Exactly 2,000 stays on. A stored cap of 0 is a real cap of
          zero, so burn stays off and midnight does not turn it back on. At
          midnight IST the redeemed total returns to 0, the cap stays, and
          burn turns on again only when that cap is at least 2,000. A missing
          cap row means there is no cap. If the burn row is missing, burn
          stays on.
        </p>
      </Section>

      <Section title="Global settings">
        <GuideTable
          headers={["On this screen", "Stored name", "Starting value", "What it means"]}
          rows={[
            [
              "IBC_BURN_ENABLE",
              "IBC_BURN_ENABLE",
              "true",
              "Burn on or off. See the switch table.",
            ],
            [
              "IBC_TIER_CONFIG_ENABLED",
              "IBC_TIER_CONFIG_ENABLED",
              "false on production, true on stage",
              "Master switch for tier earn %, redemption fees, and conversion A/B. Saving it takes effect on the next fare search. No API restart.",
            ],
            [
              "Overall Cap on Total Burn Amount",
              "IBC_OVERALL_BURN_CAP",
              "0",
              "Daily maximum burn, in points. 0 blocks burn. A missing row means there is no cap. The cap stays until someone changes it. Midnight does not reset it, and it does not turn burn on when the cap is below 2,000.",
            ],
            [
              "Shown under the cap. Not editable.",
              "total_ibc_redeemed",
              "0",
              "Points confirmed today. The API writes this. Midnight IST sets it to 0.",
            ],
            [
              "Not shown",
              "total_ibc_pending",
              "0",
              "Points held by bookings that are not confirmed yet. Not cleared at midnight.",
            ],
            [
              "Not shown",
              "IBC_BURN_TRACKING_DATE",
              "empty",
              "The IST date the redeemed total belongs to. The API maintains it.",
            ],
            [
              "Burn cap start",
              "IBC_BURN_START_AT",
              "empty",
              "An IST time. Saving a new time releases unconfirmed prebook holds created before that time and recounts holds created at or after it. Confirmed burn stays. Saving the same time again does nothing. Clearing it does not restore holds that were already released.",
            ],
            [
              "Not shown",
              "IBC_BURN_START_APPLIED",
              "empty",
              "The start time already applied. Do not edit it.",
            ],
            [
              "LOYALTY_POINTS_MULTIPLIER",
              "LOYALTY_POINTS_MULTIPLIER",
              "1.5",
              "Global earn %. The fare used for points is floored to ₹100, then points are floored to a whole number. ₹550 at 1.5% earns 7 points. Also used to split the engagement reserve when a booking has no saved earn %.",
            ],
            [
              "Not on this screen. Used when a tier fee does not apply.",
              "REDEMPTION_FEE",
              "150 if the row is missing",
              "Points added on top of the fare points. Used when tier config is off, the customer has no tier, or that tier has no fee row. 0 means no fee.",
            ],
            [
              "Conversion Rate Config (Main), A",
              "IBC_CONVERSION_RATE_A",
              "0.18",
              "The constant A in the burn formula.",
            ],
            [
              "Conversion Rate Config (Main), B",
              "IBC_CONVERSION_RATE_B",
              "0.07",
              "The coefficient B in the burn formula.",
            ],
            [
              "Not an IBC price",
              "USER_TOKEN_TTL_MINUTES",
              "60",
              "How long a customer session lasts. Fare search only sees the tier while that session is valid.",
            ],
          ]}
        />
      </Section>

      <Section title="Tier settings">
        <p className="text-sm text-gray-600 mb-3">
          The customer session sends a tier. 1 or Gold is BLU 1. 2 or Silver
          is BLU 2. 3 or Base is BLU 3. Any other value uses the global rows.
          On this screen the fee is labeled IBC Redemption Fees. It is stored
          as REDEMPTION_RATE.
        </p>
        <GuideTable
          headers={["Tier", "Earn %", "Starts at", "Redemption fee", "Starts at", "Conversion A / B", "Starts at"]}
          rows={[
            ["Gold", "IBC_TIER_GOLD_EARN_PERCENT", "5", "IBC_TIER_GOLD_REDEMPTION_RATE", "0.25", "IBC_TIER_GOLD_CONVERSION_RATE_A / _B", "0 / 0"],
            ["Silver", "IBC_TIER_SILVER_EARN_PERCENT", "3", "IBC_TIER_SILVER_REDEMPTION_RATE", "0.15", "IBC_TIER_SILVER_CONVERSION_RATE_A / _B", "0 / 0"],
            ["Base", "IBC_TIER_BASE_EARN_PERCENT", "1", "IBC_TIER_BASE_REDEMPTION_RATE", "0", "IBC_TIER_BASE_CONVERSION_RATE_A / _B", "0 / 0"],
          ]}
        />
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <p>
            A tier conversion pair is used only when A + B is greater than 0.
            0 + 0 means it is not configured, so that tier keeps the main
            conversion rates.
          </p>
          <p>
            A tier redemption fee of 0 is configured. It does not fall back to
            the global fee of 150.
          </p>
        </div>
      </Section>

      <Section title="How a fare becomes points">
        <p className="text-sm text-gray-600 mb-3">
          When burn is on, fare search attaches this quote to each fare.
        </p>
        <pre className="mb-4 overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 p-4">
{`score = 0.35 × how far ahead the pickup is
      + 0.25 × departure or arrival
      + 0.20 × distance
      + 0.20 × vehicle

rupees per point = A + (B × score)
points for the fare = fare ÷ rupees per point, rounded up
points the customer needs = points for the fare + redemption fee`}
        </pre>
        <p className="text-sm text-gray-700">
          A higher rupees-per-point number means fewer BluChips for the same
          fare. A and B are the main pair, or the tier pair when that pair is
          configured and the tier switch is on.
        </p>
      </Section>

      <Section title="Conversion rate on the logs">
        <p className="text-sm text-gray-700 mb-3">
          The Conversion Rate column on booking and conversion logs is not
          conversion A or B. It is calculated after payment:
        </p>
        <pre className="mb-3 overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 p-4">
{`total fare ÷ (Total IBC Redeemed − redemption fee)`}
        </pre>
        <p className="text-sm text-gray-700">
          Example: fare 1000, redeemed 4150, fee 150. 1000 ÷ 4000 = 0.25. The
          column is blank when nothing was redeemed.
        </p>
      </Section>

      <Section title="What is saved on the booking">
        <GuideTable
          headers={["What", "When"]}
          rows={[
            [
              "Earn %",
              "When the booking is created. Later edits on this screen do not change it. A reassignment copies it. A reschedule copies it when the old invoice is kept.",
            ],
            [
              "Tier: Gold, Silver, or Base",
              "When the booking is created and the session had a mapped tier. Copied on reassignment and on a reschedule that keeps the old invoice.",
            ],
            [
              "BluChip quote",
              "When the customer chooses to pay with BluChips. It stores the points, the fee, rupees per point, and the total points required.",
            ],
            [
              "Redemption fee on the booking",
              "The fee from that quote. 0.15 is stored as 0.15.",
            ],
            [
              "What was actually redeemed",
              "Written from the payment. Booking details and the logs read this, not the original quote, once payment is complete.",
            ],
          ]}
        />
        <p className="mt-3 text-sm text-gray-600">
          The payment mode stays BluChips only when the payment actually
          charged a reward. A booking that started as BluChips but was paid by
          UPI or card is shown as that method. Booking details for a BluChip
          payment do not show the Free Cancellation line. Extra kilometre fare
          and seats stay.
        </p>
      </Section>

      <Section title="Booking logs and conversion logs">
        <p className="text-sm text-gray-600 mb-3">
          The same columns appear on screen and in the downloaded report.
        </p>
        <GuideTable
          headers={["Column", "Rule"]}
          rows={[
            [
              "Tier",
              "Beside Persona. Gold, Silver, or Base for a B2C loyalty user or an SLT user. Blank for everyone else, and blank on bookings made before the tier was saved.",
            ],
            [
              "Conversion Rate",
              "Beside Total IBC Redeemed. Formula above. Blank when nothing was redeemed.",
            ],
            [
              "IBC Earn Percentage",
              "The earn % for that booking. 0% whenever the engagement reserve stays at 5%.",
            ],
            [
              "Loyalty Points Earned",
              "Points given. 0 when the customer paid with BluChips.",
            ],
            [
              "Engagement Reserve",
              "Anonymous and B2C Non IBC: 5% of the discounted base fare. B2C loyalty, not paying with BluChips: (5 − earn %) of the base fare, never below 0. B2C loyalty paying with BluChips: 5% of the base fare. An SLT user with a membership follows loyalty. An SLT user without one follows anonymous.",
            ],
            [
              "Money columns",
              "At most 2 decimal places. 620 stays 620.",
            ],
          ]}
        />
        <p className="mt-3 text-sm text-gray-600">
          Blue Chip and IBC Points Earned are not on the screen or in the
          download.
        </p>
      </Section>

      <Section title="Checks engineering runs">
        <p className="text-sm text-gray-700 mb-3">
          Before an IBC code change, engineering runs the automated checks.
          They do not call a live cab partner. After a save on this screen,
          they run the fare check instead.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-gray-900 text-gray-100 text-xs p-4">
{`npm run ibc:reward
npm run ibc:fare-check`}
        </pre>
      </Section>
    </div>
  );
};

export default IbcRunbook;
