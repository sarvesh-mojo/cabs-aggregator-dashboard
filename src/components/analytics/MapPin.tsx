type MapPinProps = {
  x: number;
  y: number;
  color: string;
  opacity?: number;
  scale?: number;
};

const STOPS: Array<{ t: number; rgb: [number, number, number] }> = [
  { t: 0, rgb: [156, 214, 146] },
  { t: 0.3, rgb: [232, 184, 32] },
  { t: 0.55, rgb: [239, 125, 18] },
  { t: 0.78, rgb: [220, 48, 40] },
  { t: 1, rgb: [140, 16, 22] },
];

export const volumeColor = (ratio: number) => {
  const t = Math.min(1, Math.max(0, ratio));
  let index = 0;
  while (index < STOPS.length - 2 && t > STOPS[index + 1].t) index += 1;
  const left = STOPS[index];
  const right = STOPS[index + 1];
  const span = right.t - left.t || 1;
  const mix = (t - left.t) / span;
  const channel = (slot: 0 | 1 | 2) =>
    Math.round(left.rgb[slot] + (right.rgb[slot] - left.rgb[slot]) * mix);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

export const volumeOpacity = (ratio: number) =>
  0.62 + Math.min(1, Math.max(0, ratio)) * 0.38;

export const MapPin = ({ x, y, color, opacity = 1, scale = 1 }: MapPinProps) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} pointerEvents="none">
    <path
      d="M0 0 L-4.6 -10.4 A6.4 6.4 0 1 1 4.6 -10.4 Z"
      fill={color}
      stroke="#ffffff"
      strokeWidth={1.25}
      strokeLinejoin="round"
    />
    <circle cx={0} cy={-13.4} r={2.2} fill="#ffffff" />
  </g>
);
