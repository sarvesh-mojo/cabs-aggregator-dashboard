const MONTH_WISE_GMV: {
  partner: string;
  may: number | null;
  june: number | null;
  july: number | null;
  august: number | null;
  september: number | null;
  total: number | null;
}[] = [
  { partner: "GOZOCABS", may: 1453687, june: 1395452, july: 1215710, august: 1260504, september: 1049792, total: 6375145 },
  { partner: "QUICKRIDE", may: 1333813, june: 1245674, july: 859907, august: 1118355, september: 1041584, total: 5599333 },
  { partner: "REFEX", may: 606496, june: 661337, july: 495175, august: 692822, september: 635286, total: 3091116 },
  { partner: "MERU", may: 641441, june: 420617, july: 300160, august: 472243, september: 341990, total: 2176451 },
  { partner: "SHOFFR", may: 704933, june: 574646, july: 783729, august: 432887, september: 2975, total: 2499170 },
  { partner: "WTICABS", may: 551298, june: 436468, july: 347175, august: 398561, september: 495724, total: 2229226 },
  { partner: "WAVECABS", may: 415366, june: 290887, july: 372519, august: 248250, september: 128152, total: 1455174 },
  { partner: "TAXIDA", may: 211979, june: 220488, july: 519026, august: 235717, september: 69000, total: 1256210 },
  { partner: "BETMOBILITY", may: 121012, june: 369740, july: 339750, august: 192689, september: 405121, total: 1428312 },
  { partner: "TAXIBAZAAR", may: 407461, june: 149674, july: 99304, august: 247154, september: 186783, total: 1090376 },
  { partner: "RIDEALLY", may: 119791, june: 208935, july: 197946, august: 301973, september: 217797, total: 1046442 },
  { partner: "SIGNATURE", may: 71054, june: 57040, july: 36035, august: 146578, september: 64136, total: 374843 },
  { partner: "EVERA", may: 130600, june: 7768, july: 846, august: null, september: null, total: 139214 },
  { partner: "CARZONRENT", may: 67677, june: 26830, july: 28419, august: 10911, september: 25881, total: 159718 },
  { partner: "MILODRIVE", may: null, june: null, july: 1682, august: 94991, september: 154518, total: 251191 },
  { partner: "KANGAROOCARS", may: null, june: 68956, july: 74318, august: 27781, september: 54987, total: 226042 },
  { partner: "SIG-PVryde", may: null, june: null, july: null, august: 5913, september: 186546, total: 192459 },
  { partner: "PLUSHMILES", may: null, june: null, july: null, august: 20620, september: 112806, total: 133426 },
  { partner: "SIG-Evera", may: null, june: null, july: 83918, august: 9644, september: null, total: 93562 },
  { partner: "GRELCABS", may: null, june: null, july: null, august: 5385, september: 108033, total: 113418 },
  { partner: "COMMUTEC", may: 24182, june: 23490, july: 11796, august: null, september: 2127, total: 61595 },
  { partner: "HYBRIDFM", may: null, june: null, july: null, august: 376, september: 73864, total: 74240 },
  { partner: "BLUECAB", may: 4580, june: null, july: null, august: null, september: null, total: 4580 },
  { partner: "SIG-GOGREEN", may: null, june: null, july: null, august: null, september: 24124, total: 24124 },
  { partner: "SIG-BLUSKY", may: null, june: null, july: null, august: 9660, september: 13534, total: 23194 },
  { partner: "GOAMILES", may: null, june: null, july: null, august: null, september: null, total: 0 },
  { partner: "TRAVELVIP", may: 11585, june: null, july: null, august: null, september: null, total: 11585 },
];

const MONTH_WISE_GRAND_TOTAL = {
  may: 6876955,
  june: 6158002,
  july: 5767415,
  august: 5933014,
  september: 5394760,
  total: 30130146,
};

const formatMonthGmv = (value: number | null) => {
  if (value === null) return "";
  return value.toLocaleString("en-IN");
};

const MonthlyPartnerPayout = () => {
  return (
    <div className="p-4 bg-white rounded-xl">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        Monthly Partner Payout
      </h2>
      <div className="overflow-x-auto">
        <table className="w-auto border text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">Partner</th>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">May</th>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">June</th>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">July</th>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">August</th>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">September</th>
              <th className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem] text-left">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {MONTH_WISE_GMV.map((row) => (
              <tr key={row.partner}>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{row.partner}</td>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(row.may)}</td>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(row.june)}</td>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(row.july)}</td>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(row.august)}</td>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(row.september)}</td>
                <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">Grand Total</td>
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(MONTH_WISE_GRAND_TOTAL.may)}</td>
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(MONTH_WISE_GRAND_TOTAL.june)}</td>
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(MONTH_WISE_GRAND_TOTAL.july)}</td>
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(MONTH_WISE_GRAND_TOTAL.august)}</td>
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(MONTH_WISE_GRAND_TOTAL.september)}</td>
              <td className="whitespace-nowrap border px-4 py-1.5 min-w-[8rem]">{formatMonthGmv(MONTH_WISE_GRAND_TOTAL.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MonthlyPartnerPayout;
