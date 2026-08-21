import { useState } from 'react';
import { useStatecraftStore } from '../store';

export function MediaEcosystemPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastPoliticalOutcome);
  const courtJournalistAction = useStatecraftStore((s) => s.courtJournalistAction);
  const investigateRivalAction = useStatecraftStore((s) => s.investigateRivalAction);
  const launchDisinformationCampaignAction = useStatecraftStore((s) => s.launchDisinformationCampaignAction);

  const [targetId, setTargetId] = useState('');

  if (!game) return null;

  const rivals = game.politicians.filter((p) => !p.isPlayer);
  const selectedTarget = targetId || rivals[0]?.id || '';
  const sortedJournalists = [...game.journalists].sort((a, b) => b.disposition - a.disposition);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Media Ecosystem &amp; Disinformation</h2>
      </div>

      <p className="muted">
        Named journalists can be courted for access, asked to dig into a rival, or dodged around
        with disinformation — a play that gets riskier the more scrutiny the press is already
        paying.
      </p>

      <div className="corruption-controls">
        <select value={selectedTarget} onChange={(e) => setTargetId(e.target.value)}>
          {rivals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={() => selectedTarget && launchDisinformationCampaignAction(selectedTarget)}>
          Launch Disinformation
        </button>
      </div>

      {lastOutcome && (
        <p className={lastOutcome.tone === 'pass' ? 'result-pass' : lastOutcome.tone === 'fail' ? 'result-fail' : 'muted'}>
          <strong>{lastOutcome.label}:</strong> {lastOutcome.detail}
        </p>
      )}

      <ul className="scandal-list">
        {sortedJournalists.map((journalist) => {
          const dispositionPct = Math.max(0, Math.min(100, (journalist.disposition + 100) / 2));
          return (
            <li key={journalist.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{journalist.name}</strong> — credibility {journalist.credibility} — scrutiny{' '}
                {(journalist.scrutiny * 100).toFixed(0)}%
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${dispositionPct}%` }} />
                </div>
                <span className="muted">disposition {journalist.disposition.toFixed(0)}</span>
              </span>
              <span className="row-actions">
                <button onClick={() => courtJournalistAction(journalist.id)}>Court</button>
                <button
                  onClick={() => selectedTarget && investigateRivalAction(journalist.id, selectedTarget)}
                  disabled={!selectedTarget}
                >
                  Investigate
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
