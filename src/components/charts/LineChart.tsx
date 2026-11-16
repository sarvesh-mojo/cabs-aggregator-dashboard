import { Card } from "antd";
import {
  LineChart,
  CartesianGrid,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// GMV
const gmvData = [
  { date: "8 Nov", value: 35000 },
  { date: "15 Nov", value: 42000 },
  { date: "22 Nov", value: 28000 },
  { date: "29 Nov", value: 46000 },
  { date: "6 Dec", value: 52000 },
  { date: "13 Dec", value: 58000 },
  { date: "20 Dec", value: 61000 },
];

type props = {
    title : string;
}

export const UseLineChart = (title: props) => {
  return (
    <Card title={`${title?.title || "Trend (Day-wise)"}`}>
      <LineChart width={900} height={350} data={gmvData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#4A90E2"
          strokeWidth={3}
        />
      </LineChart>
    </Card>
  );
};
