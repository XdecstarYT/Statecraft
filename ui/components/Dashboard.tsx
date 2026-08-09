import { Suspense, lazy } from 'react';
import { formatCalendarDate, turnToCalendarDate } from '../../engine';
import { useStatecraftStore } from '../store';

const EconomyChart = lazy(() => import('./EconomyChart'));

export function Dashboard() {
  const game = useStatecraftStore((s) => s.game);
  const economyHistory = useStatecraftStore((s) => s.economyHistory);
  const nextTurn = useStatecraftStore((s) => s.nextTurn);

  if (!game) return null;

  const { economy } = game;
  const date = turnToCalendarDate(game.turn);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{game.country.name} — {formatCalendarDate(date)}</h2>
        <button onClick={nextTurn}>Advance Week</button>
      </div>

      <div className="indicator-grid">
        <Indicator label="GDP Growth" value={economy.gdpGrowth} suffix="%" />
        <Indicator label="Inflation" value={economy.inflation} suffix="%" />
        <Indicator label="Unemployment" value={economy.unemployment} suffix="%" />
        <Indicator label="Debt / GDP" value={economy.debtToGdp} suffix="%" />
        <Indicator label="Budget Balance" value={economy.budgetBalance} suffix="% GDP" />
        <Indicator label="Pending Effects" value={economy.pendingEffects.length} suffix="" />
      </div>

      <Suspense fallback={<div style={{ height: 260 }} />}>
        <EconomyChart data={economyHistory} />
      </Suspense>
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
