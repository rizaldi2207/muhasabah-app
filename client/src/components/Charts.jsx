import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';

const GOLD = '#bd8f2c';
const GOLD_BRIGHT = '#e3c06a';
const EMERALD = '#1b7c52';
const AMBER = '#c08a2e';
const RED = '#b04a2c';
const GRID = 'rgba(160,118,40,0.22)';

function barColor(v) {
  if (v == null) return 'rgba(160,118,40,0.25)';
  if (v >= 80) return EMERALD;
  if (v >= 50) return AMBER;
  return RED;
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(160,118,40,0.5)',
  background: '#fbf6ea',
  color: '#243029',
  fontSize: 12,
  boxShadow: '0 10px 30px -16px rgba(10,24,20,0.4)',
};
const axisTick = { fontSize: 11, fill: 'currentColor', fillOpacity: 0.7 };

export function TrendLine({ data, xKey = 'label', yKey = 'score', height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="lineGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={GOLD} />
            <stop offset="1" stopColor={GOLD_BRIGHT} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey={xKey} tick={axisTick} interval="preserveStartEnd" stroke={GRID} />
        <YAxis domain={[0, 100]} tick={axisTick} stroke={GRID} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="url(#lineGold)"
          strokeWidth={3}
          dot={{ r: 2, fill: GOLD }}
          activeDot={{ r: 5, fill: GOLD_BRIGHT, stroke: GOLD }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScoreBars({ data, xKey = 'label', yKey = 'average', height = 260, refValue }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey={xKey} tick={axisTick} stroke={GRID} />
        <YAxis domain={[0, 100]} tick={axisTick} stroke={GRID} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(189,143,44,0.08)' }} />
        {refValue != null && (
          <ReferenceLine y={refValue} stroke={GOLD} strokeDasharray="4 4" />
        )}
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={barColor(d[yKey])} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
