import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCalendarDate, turnToCalendarDate } from '../../engine';
import type { EconomySnapshot } from '../store';

/**
 * Split into its own lazy-loaded chunk (see Dashboard.tsx) — recharts is by
 * far the heaviest dependency in the bundle, and nothing else on the
 * dashboard needs it.
 */
export default function EconomyChart({ data }: { data: EconomySnapshot[] }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="turn" label={{ value: 'Week', position: 'insideBottom', offset: -4 }} />
          <YAxis />
          <Tooltip labelFormatter={(turn: number) => formatCalendarDate(turnToCalendarDate(turn))} />
          <Legend />
          <Line type="monotone" dataKey="gdpGrowth" name="GDP Growth" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="inflation" name="Inflation" stroke="#dc2626" dot={false} />
          <Line type="monotone" dataKey="unemployment" name="Unemployment" stroke="#d97706" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
