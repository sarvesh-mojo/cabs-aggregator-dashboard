import { useMemo, useState } from "react";
import BookingCalendar from "../../components/common/BookingCalendar";
import { BookingClocksPair } from "../../components/common/BookingClock";
import PageMeta from "../../components/common/PageMeta";
import { useSelector } from "react-redux";
import { HomeStatistics } from "../../components/Statistics/HomeStatistics";
import { HourlyFareSearchChart } from "../../components/Statistics/HourlyFareSearchChart";
import { PartnerTab } from "../../components/common/PartnerTab";
import dayjs from "dayjs";

const BAC_SUB_TABS = [
  "bac_agent",
  "bac_mb",
  "bac_yatra",
  "bac_corp",
  "bac_swiggy",
  "bac_agentic_chat_dev",
  "bac_agentic_chat",
];

export default function Home() {
  // Single source of truth — avoid local partner state that re-fetches after persist rehydrate
  const partner =
    useSelector(
      (state: any) => state?.operationStore?.ReportSelectedPartner,
    ) || "mojo";
  const loginPartners = useSelector(
    (state: any) => state?.authStore?.login_partners as string[] | undefined,
  );

  const [calendarCity, setCalendarCity] = useState<string | null>(null);
  const [calendarCabPartner, setCalendarCabPartner] = useState<string | null>(
    null,
  );
  const [sharedCityObj, setSharedCityObj] = useState<{
    code: string;
    name: string;
  } | null>(null);
  /** Calendar + clocks mount only when user opts in — avoids getStats on login redirect. */
  const [showPickupsWidgets, setShowPickupsWidgets] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const [calendarDateRange, setCalendarDateRange] = useState<[string, string]>([
    today,
    today,
  ]);

  const clockPartners = useMemo(() => {
    if (partner === "all") {
      return (loginPartners ?? []).filter((p) => !BAC_SUB_TABS.includes(p));
    }
    return [partner];
  }, [partner, loginPartners]);

  const handleFiltersChange = (
    city: { code: string; name: string } | null,
    cab: string | null,
    dateRange: [string, string],
  ) => {
    setCalendarCity(city?.code ?? null);
    setSharedCityObj(city ?? null);
    setCalendarCabPartner(cab);
    setCalendarDateRange((prev) =>
      prev[0] === dateRange[0] && prev[1] === dateRange[1] ? prev : dateRange,
    );
  };

  return (
    <>
      <PageMeta
        title="Analytics Panel"
        description="This is Management dashboard used for analytics and booking logs"
      />

      <div className="w-full bg-white rounded-xl px-2 py-3 sm:px-3 sm:py-4 shadow-sm mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <PartnerTab />
          </div>
        </div>

        <div className="mt-0">
          <HomeStatistics partner={partner} onFiltersChange={handleFiltersChange} />
        </div>
        <div className="mt-4">
          <HourlyFareSearchChart
            partner={partner}
            dateRange={calendarDateRange}
            selectedCity={sharedCityObj}
            selectedCabPartner={calendarCabPartner}
          />
        </div>

        <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Pickups Calendar &amp; Hourly Clocks
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Monthly bookings and hourly pickups breakdown. Click to view.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPickupsWidgets((prev) => !prev)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                showPickupsWidgets
                  ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {showPickupsWidgets ? "Hide" : "Load & Show"}
            </button>
          </div>

          {showPickupsWidgets && (
            <div className="flex flex-wrap gap-3 p-4">
              <BookingCalendar
                partner={partner}
                cityCode={calendarCity}
                cabPartner={calendarCabPartner}
              />
              <BookingClocksPair
                partners={clockPartners}
                cityCode={calendarCity}
                cabPartner={calendarCabPartner}
                dateRange={calendarDateRange}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

