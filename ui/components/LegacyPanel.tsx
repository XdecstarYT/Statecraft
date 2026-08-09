import { computeLegacySummary, determineLeadingVictoryPath, type VictoryPath } from '../../engine';
import { useStatecraftStore } from '../store';

const PATH_LABELS: Record<VictoryPath, string> = {
  personal_power: 'Personal Power',
  party_dominance: 'Party Dominance',
  national_prestige: 'National Prestige',
};

export function LegacyPanel() {
  const game = useStatecraftStore((s) => s.game);
  if (!game) return null;

  const summary = computeLegacySummary(game);
  const leading = determineLeadingVictoryPath(summary);
  const { breakdown } = summary;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Legacy</h2>
        <span className="muted">Leading path: {PATH_LABELS[leading]}</span>
      </div>

      <div className="legacy-bars">
        <ScoreBar label="Personal Power" value={summary.personalPower} />
        <ScoreBar label="Party Dominance" value={summary.partyDominance} />
        <ScoreBar label="National Prestige" value={summary.nationalPrestige} />
      </div>

      <h3 className="subheading">How History Will Judge This</h3>
      <div className="verdict-columns">
        <ScoreBar label="Contemporary Verdict" value={summary.contemporaryVerdict} />
        <ScoreBar label="Historians' Verdict" value={summary.historiansVerdict} />
      </div>
      <p className="muted">
        Contemporaries weigh today's approval heavily; historians discount it in favor of durable
        economic outcomes and the integrity record — the two can diverge sharply.
      </p>

      <h3 className="subheading">Breakdown</h3>
      <div className="indicator-grid">
        <Indicator label="Years in Power" value={breakdown.yearsInPower.toFixed(1)} />
        <Indicator label="Bills Passed" value={breakdown.billsPassed} />
        <Indicator label="Party Seat Share" value={`${(breakdown.partySeatShare * 100).toFixed(0)}%`} />
        <Indicator label="Party Coherence" value={`${(breakdown.partyIdeologicalCoherence * 100).toFixed(0)}%`} />
        <Indicator label="Scandals (Unresolved)" value={`${breakdown.scandalRecord.total} (${breakdown.scandalRecord.unresolved})`} />
        <Indicator label="Avg. Foreign Relations" value={breakdown.averageForeignRelations.toFixed(0)} />
      </div>
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-bar">
      <div className="score-bar-label">
        <span>{label}</span>
        <span>{value.toFixed(0)}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Indicator({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="indicator">
      <div className="indicator-label">{label}</div>
      <div className="indicator-value">{value}</div>
    </div>
  );
}
