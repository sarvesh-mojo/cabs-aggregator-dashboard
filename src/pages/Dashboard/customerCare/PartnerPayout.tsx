import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  GET_BOOKING_DAILY_COUNTS,
  GET_LIVE_CITIES_LIST,
} from "../../../config/customerCare/operationsApicall";
import { RangerPicker } from "../../../components/common/RangePicker";
import { useSelector } from "react-redux";
import { AvailablecabPartners } from "../../../config/customerCare/constant";
import { useDispatch } from "react-redux";
import { SaveDateRange } from "../../../Redux/slices/operationSlice";
import { Link, useLocation } from "react-router-dom";

const PAYOUT_PATH = "/dashboard/customerCare/PartnerPayout";
const PAYOUT_DAY_PATH = "/dashboard/customerCare/PartnerPayoutDay";

export function PayoutViewSwitch() {
  const { pathname } = useLocation();
  const items = [
    { to: PAYOUT_PATH, label: "Partner Payout" },
    { to: PAYOUT_DAY_PATH, label: "Day Wise" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              active
                ? "border-[#0f2c5b] bg-[#0f2c5b] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

const PartnerPayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const today = dayjs().format("YYYY-MM-DD");

  const [dateRange, setDateRange] = useState<[string, string]>([today, today]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"indigo" | "ixigo" | "all">(
    "indigo",
  );
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [selectedCabPartner, setSelectedCabPartner] = useState<string | null>(
    null,
  );
  const [travelType, setTravelType] = useState<string>("");
  const [cities, setCities] = useState<any[]>([]);

  const fetchCities = async () => {
    try {
      const res = await GET_LIVE_CITIES_LIST(activeTab);

      const mapped = res.map((c: any) => ({
        ...c,
        name: `${c.sourceCity} - ${c.airportCode} (${c.terminalId})`,
        code: c.airportCode,
      }));

      setCities(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCities();
  }, [activeTab]);

  useEffect(() => {
    dispatch(
      SaveDateRange({
        path: location.pathname,
        range: [today, today],
      }),
    );

    setDateRange([today, today]);
  }, [dispatch, today, location.pathname]);

  const loginPartners = useSelector(
    (state: any) => state.authStore?.login_partners ?? [],
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      const baseParams: any = {
        date: dateRange[0],
        endDate: dateRange[1],
        groupByCabPartner: true,
        filterBy: "startTime",
        ...(selectedCabPartner && { cabPartner: selectedCabPartner }),
        ...(selectedCity && { cityCode: selectedCity.code }),
        ...(travelType && { travelType }),
      };

      let responses: any[] = [];

      if (activeTab === "all") {
        responses = await Promise.all(
          loginPartners.map((p: string) =>
            GET_BOOKING_DAILY_COUNTS(p, baseParams),
          ),
        );
      } else {
        const res = await GET_BOOKING_DAILY_COUNTS(activeTab, baseParams);
        responses = [res];
      }

      const flatData = responses.flatMap((r) => (Array.isArray(r) ? r : []));

      const grouped: Record<string, any> = {};

      flatData.forEach((item: any) => {
        if (selectedCabPartner && item.cabPartner !== selectedCabPartner)
          return;

        const key = item.cabPartner || "Unknown";

        if (!grouped[key]) {
          grouped[key] = {
            partner: key,
            totalBooking: 0,
            fullAdvance: 0,
            partialAdvance: 0,
            totalAmount: 0,
          };
        }

        grouped[key].totalBooking += Number(item.payment_complete || 0);
        grouped[key].fullAdvance += Number(item.total_gmv_collected_full || 0);
        grouped[key].partialAdvance += Number(item.total_gmv_collected_partial || 0);
        grouped[key].totalAmount += Number(item.completed_booking_gmv || 0);
      });

      const finalData = Object.values(grouped);
      finalData.sort((a, b) => b.totalAmount - a.totalAmount);

      setData(finalData);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, activeTab, selectedCity, selectedCabPartner, travelType]);

  const grandPart = data.reduce(
    (sum, row) => sum + Number(row.partialAdvance || 0),
    0,
  );
  const grandFull = data.reduce(
    (sum, row) => sum + Number(row.fullAdvance || 0),
    0,
  );
  const grandTotal = data.reduce(
    (sum, row) => sum + Number(row.totalAmount || 0),
    0,
  );

  const rupee = (value: number) => `₹${Math.round(Number(value || 0))}`;

  const collectionPercent = (part: number, full: number, gmv: number) => {
    if (!gmv) return "0%";
    return `${Math.round(((part + full) / gmv) * 100)}%`;
  };

  const contributionPercent = (partnerGmv: number, totalGmv: number) => {
    if (!totalGmv) return "0%";
    return `${Math.round((partnerGmv / totalGmv) * 100)}%`;
  };

  return (
    <div className="p-4 bg-white rounded-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        {["indigo", "ixigo", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      <PayoutViewSwitch />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RangerPicker
          updateDate={dateRange}
          selectedRange={(range) => setDateRange(range)}
        />

        <select
          onChange={(e) => {
            const city = cities.find((c) => c.code === e.target.value);
            setSelectedCity(city || null);
          }}
          className="w-40 border px-2 py-2 rounded"
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city.code} value={city.code}>
              {city.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCabPartner || ""}
          onChange={(e) => setSelectedCabPartner(e.target.value || null)}
          className="w-40 border px-2 py-2 rounded"
        >
          <option value="">All Partners</option>
          {AvailablecabPartners.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={travelType}
          onChange={(e) => setTravelType(e.target.value)}
          className="w-28 border px-2 py-2 rounded"
        >
          <option value="">All</option>
          <option value="arrival">Arrival</option>
          <option value="departure">Departure</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-auto border text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">Cab Partner</th>
              <th className="border px-3 py-1.5 min-w-[6.5rem] text-left leading-tight">
                Total Completed
                <br />
                Booking
              </th>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">Part Collected</th>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">Full Collected</th>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">Total Collected</th>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">GMV</th>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">Collection %</th>
              <th className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] text-left">Contribution %</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-4">
                  No Data
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">{row.partner}</td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                    {Math.round(Number(row.totalBooking || 0))}
                  </td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                    {rupee(row.partialAdvance)}
                  </td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                    {rupee(row.fullAdvance)}
                  </td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                    {rupee(Number(row.partialAdvance || 0) + Number(row.fullAdvance || 0))}
                  </td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem] font-bold">
                    {rupee(row.totalAmount)}
                  </td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                    {collectionPercent(
                      Number(row.partialAdvance || 0),
                      Number(row.fullAdvance || 0),
                      Number(row.totalAmount || 0),
                    )}
                  </td>
                  <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                    {contributionPercent(
                      Number(row.totalAmount || 0),
                      grandTotal,
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td className="border px-3 py-1.5 min-w-[6.5rem] text-right" colSpan={4}>
                Grand Total
              </td>
              <td className="border px-3 py-1.5 min-w-[6.5rem]">
                {rupee(grandPart + grandFull)}
              </td>
              <td className="border px-3 py-1.5 min-w-[6.5rem]">{rupee(grandTotal)}</td>
              <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                {collectionPercent(grandPart, grandFull, grandTotal)}
              </td>
              <td className="whitespace-nowrap border px-3 py-1.5 min-w-[6.5rem]">
                {contributionPercent(grandTotal, grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default PartnerPayout;
