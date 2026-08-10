import { useStatecraftStore } from '../store';
import { AccessibilityPanel } from './AccessibilityPanel';

function approvalEmoji(approval: number): string {
  if (approval >= 70) return '😄';
  if (approval >= 55) return '🙂';
  if (approval >= 40) return '😐';
  if (approval >= 25) return '🙁';
  return '😠';
}

/** A compact, always-visible readout of the numbers that matter most turn to turn — a top HUD bar instead of having to open a tab to see them. */
export function TopHud() {
  const game = useStatecraftStore((s) => s.game);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const approval = player?.approval.public ?? 50;

  const alertCount =
    game.scandals.filter((s) => s.status === 'unresolved').length +
    game.protests.filter((p) => p.status === 'protesting' || p.status === 'riot').length +
    game.wars.filter((w) => w.status === 'active').length +
    (game.environment.pollutionIndex > 70 ? 1 : 0) +
    (game.crime.crimeRate > 70 ? 1 : 0);

  const industryOutput = game.factories.length;

  return (
    <div className="top-hud">
      <div className="top-hud-stat" title="Public approval">
        <span className="top-hud-icon">{approvalEmoji(approval)}</span>
        <span>{approval.toFixed(0)}%</span>
      </div>
      <div className="top-hud-stat" title="Budget balance (% GDP)">
        <span className="top-hud-icon">💰</span>
        <span className={game.economy.budgetBalance >= 0 ? 'top-hud-positive' : 'top-hud-negative'}>
          {game.economy.budgetBalance >= 0 ? '+' : ''}
          {game.economy.budgetBalance.toFixed(1)}%
        </span>
      </div>
      <div className="top-hud-stat" title="GDP growth">
        <span className="top-hud-icon">{game.economy.gdpGrowth >= 0 ? '📈' : '📉'}</span>
        <span className={game.economy.gdpGrowth >= 0 ? 'top-hud-positive' : 'top-hud-negative'}>
          {game.economy.gdpGrowth.toFixed(1)}%
        </span>
      </div>
      <div className="top-hud-stat" title="Factories built">
        <span className="top-hud-icon">🏭</span>
        <span>{industryOutput}</span>
      </div>
      <div className="top-hud-stat" title="Research capability">
        <span className="top-hud-icon">🔬</span>
        <span>{game.research.capability.toFixed(0)}%</span>
      </div>
      <div className={`top-hud-stat ${alertCount > 0 ? 'top-hud-alert' : ''}`} title="Active alerts (scandals, unrest, wars, crises)">
        <span className="top-hud-icon">⚠️</span>
        <span>{alertCount}</span>
      </div>

      <div className="top-hud-spacer" />

      <AccessibilityPanel />
    </div>
  );
}
