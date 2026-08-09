import { useState } from 'react';
import {
  ACHIEVEMENT_DEFINITIONS,
  computeLegacySummary,
  computeUnlockedAchievements,
  determineLeadingVictoryPath,
  type VictoryPath,
} from '../../engine';
import { getHallOfFame, recordHallOfFameEntry, type HallOfFameEntry } from '../persistence';
import { useStatecraftStore } from '../store';

const PATH_LABELS: Record<VictoryPath, string> = {
  personal_power: 'Personal Power',
  party_dominance: 'Party Dominance',
  national_prestige: 'National Prestige',
};

export function LegacyPanel() {
  const game = useStatecraftStore((s) => s.game);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>(() => getHallOfFame());

  if (!game) return null;

  const summary = computeLegacySummary(game);
  const leading = determineLeadingVictoryPath(summary);
  const { breakdown } = summary;
  const unlocked = computeUnlockedAchievements(game, breakdown);
  const player = game.politicians.find((p) => p.isPlayer);

  const recordToHallOfFame = () => {
    recordHallOfFameEntry({
      name: player?.name ?? 'Unknown',
      countryName: game.country.name,
      turn: game.turn,
      personalPower: summary.personalPower,
      partyDominance: summary.partyDominance,
      nationalPrestige: summary.nationalPrestige,
      contemporaryVerdict: summary.contemporaryVerdict,
      historiansVerdict: summary.historiansVerdict,
      achievements: unlocked,
      recordedAt: new Date().toISOString(),
    });
    setHallOfFame(getHallOfFame());
  };

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

      <h3 className="subheading">Achievements</h3>
      <ul className="scandal-list">
        {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
          const isUnlocked = unlocked.includes(achievement.id);
          return (
            <li key={achievement.id} className={`scandal-item ${isUnlocked ? 'status-resolved' : ''}`}>
              <span style={{ flex: 1 }}>
                <strong>{isUnlocked ? '✓' : '○'} {achievement.name}</strong>
                <div className="muted">{achievement.description}</div>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="panel-header statute-book-header">
        <h3>Hall of Fame</h3>
        <button onClick={recordToHallOfFame}>Record This Playthrough</button>
      </div>
      {hallOfFame.length === 0 && <p className="muted">No playthroughs recorded yet.</p>}
      {hallOfFame.length > 0 && (
        <div className="whip-table-wrap">
          <table className="whip-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Weeks</th>
                <th>Personal</th>
                <th>Party</th>
                <th>National</th>
                <th>Historians'</th>
                <th>Achievements</th>
              </tr>
            </thead>
            <tbody>
              {hallOfFame.map((entry, i) => (
                <tr key={`${entry.recordedAt}-${i}`}>
                  <td>{entry.name}</td>
                  <td>{entry.countryName}</td>
                  <td>{entry.turn}</td>
                  <td>{entry.personalPower.toFixed(0)}</td>
                  <td>{entry.partyDominance.toFixed(0)}</td>
                  <td>{entry.nationalPrestige.toFixed(0)}</td>
                  <td>{entry.historiansVerdict.toFixed(0)}</td>
                  <td>{entry.achievements.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
