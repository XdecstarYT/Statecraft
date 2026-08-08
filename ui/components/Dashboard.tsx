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
import { useStatecraftStore } from '../store';

export function Dashboard() {
  const game = useStatecraftStore((s) => s.game);
  const economyHistory = useStatecraftStore((s) => s.economyHistory);
  const nextTurn = useStatecraftStore((s) => s.nextTurn);

  if (!game) return null;

  const { economy } = game;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{game.country.name} — Turn {game.turn}</h2>
        <button onClick={nextTurn}>Advance Turn</button>
      </div>

      <div className="indicator-grid">
        <Indicator label="GDP Growth" value={economy.gdpGrowth} suffix="%" />
        <Indicator label="Inflation" value={economy.inflation} suffix="%" />
        <Indicator label="Unemployment" value={economy.unemployment} suffix="%" />
        <Indicator label="Debt / GDP" value={economy.debtToGdp} suffix="%" />
        <Indicator label="Budget Balance" value={economy.budgetBalance} suffix="% GDP" />
        <Indicator label="Pending Effects" value={economy.pendingEffects.length} suffix="" />
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={economyHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="turn" label={{ value: 'Turn', position: 'insideBottom', offset: -4 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="gdpGrowth" name="GDP Growth" stroke="#2563eb" dot={false} />
            <Line type="monotone" dataKey="inflation" name="Inflation" stroke="#dc2626" dot={false} />
            <Line type="monotone" dataKey="unemployment" name="Unemployment" stroke="#d97706" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Indicator({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="indicator">
      <div className="indicator-label">{label}</div>
      <div className="indicator-value">
        {value.toFixed(suffix ? 2 : 0)}
        {suffix}
      </div>
    </div>
  );
}
