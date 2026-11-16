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

const HourlyWindowRunbook = () => {
  return (
    <div className="text-gray-800">
      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        Use this page when a partner should take only a set number of bookings
        in a time window, or when a city discount should apply across a range
        of pickup hours. Hours are 0–23 in India time. 11 to 19 means
        11:00–19:59. 11 to 11 means 11:00–11:59. 22 to 5 means 22:00–05:59.
        Edit the rows from the Tables tab. The next fare search for a pickup
        inside the window is the check.
      </p>

      <Section title="Which table">
        <GuideTable
          headers={["Report name", "What one row does"]}
          rows={[
            [
              "Cab Partner hourly threshold",
              "Caps bookings for one city, travel type, partner, and vehicle inside fromHour–toHour.",
            ],
            [
              "Hourly Discount Config",
              "Sets a percent and rupee cap for one city and audience inside fromHour–toHour.",
            ],
          ]}
        />
      </Section>

      <Section title="Booking cap example">
        <p className="text-sm text-gray-600 mb-3">
          The number is the shared total for the whole window. It is not a
          limit on each hour inside it. A value of 0 hides that partner during
          the window. Leave dailyThreshold at 0 when there is no extra all-day
          cap.
        </p>
        <GuideTable
          headers={["City", "Travel", "Partner", "Vehicle", "From", "To", "Bookings"]}
          rows={[
            ["DEL", "DEPARTURE", "REFEX", "SEDAN", "11", "19", "20"],
            ["DEL", "DEPARTURE", "REFEX", "SEDAN", "11", "11", "5"],
          ]}
        />
        <p className="mt-3 text-sm text-gray-600 mb-3">
          Quotes before the cap: REFEX 1000, GOZO 1100, QUICKRIDE 1200. Hour
          11 already has 5 bookings and hours 12–19 have 10, so 11–19 together
          have 15.
        </p>
        <GuideTable
          headers={["Pickup", "Fare search shows"]}
          rows={[
            ["15:30, window still at 15 of 20", "REFEX 1000, GOZO 1100, QUICKRIDE 1200"],
            ["15:30 after 5 more bookings anywhere in 11–19", "GOZO 1100, QUICKRIDE 1200"],
            ["11:30, hour 11 already at 5", "GOZO 1100, QUICKRIDE 1200"],
            ["08:00, no REFEX window", "REFEX 1000, GOZO 1100, QUICKRIDE 1200"],
          ]}
        />
      </Section>

      <Section title="Discount example">
        <p className="text-sm text-gray-600 mb-3">
          pct is a percent of base fare. upto is the rupee cap. upto 0 means
          no rupee cap. REGULAR is a normal search. EMP is a subsidy search.
          When two rows both cover the pickup, the shorter window wins.
        </p>
        <GuideTable
          headers={["City", "Audience", "From", "To", "Percent", "Rupee cap"]}
          rows={[
            ["DEL", "REGULAR", "11", "19", "10", "100"],
            ["DEL", "REGULAR", "11", "11", "20", "50"],
            ["DEL", "EMP", "11", "19", "15", "150"],
          ]}
        />
        <GuideTable
          headers={["Pickup", "Search", "REFEX", "GOZO", "QUICKRIDE"]}
          rows={[
            ["15:30", "Normal", "900", "1000", "1100"],
            ["11:30", "Normal", "950", "1050", "1150"],
            ["08:00", "Normal", "1000", "1100", "1200"],
            ["15:30", "Subsidy", "850", "950", "1050"],
          ]}
        />
        <p className="mt-3 text-sm text-gray-600">
          At 15:30 the 10% row is used and then stopped at 100 rupees. At
          11:30 the 11-to-11 row wins and is stopped at 50 rupees. If hour 11
          already has 5 REFEX sedan bookings, REFEX drops off the 11:30 list.
          GOZO and QUICKRIDE still show 1050 and 1150.
        </p>
      </Section>

      <Section title="After you save">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Search a pickup inside the window. A cap change removes or restores the partner card. A discount change changes the fare on the card.</li>
          <li>Search a pickup outside the window. That row should not change the list or the fare.</li>
          <li>Open the Quota tab for the same date. It shows the configured cap, the bookings already counted, and how many are left in that window.</li>
        </ol>
      </Section>
    </div>
  );
};

export default HourlyWindowRunbook;
