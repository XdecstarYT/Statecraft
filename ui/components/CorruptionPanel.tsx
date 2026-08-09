import { useState } from 'react';
import type { CorruptionTier } from '../../engine';
import { CORRUPTION_ACTIONS } from '../../content/flavor/corruptionActions';
import { useStatecraftStore } from '../store';

const TIERS: CorruptionTier[] = ['soft', 'medium', 'hard'];

export function CorruptionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastCorruptionOutcome);
  const attemptCorruption = useStatecraftStore((s) => s.attemptCorruption);
  const respondToScandalAction = useStatecraftStore((s) => s.respondToScandalAction);

  const [tier, setTier] = useState<CorruptionTier>('soft');
  const [targetId, setTargetId] = useState<string>('');

  if (!game) return null;

  const others = game.politicians.filter((p) => !p.isPlayer);
  const selectedTarget = targetId || others[0]?.id || '';
  const actionText = CORRUPTION_ACTIONS[tier][0];

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Power &amp; Patronage</h2>
      </div>

      <div className="corruption-controls">
        <select value={tier} onChange={(e) => setTier(e.target.value as CorruptionTier)}>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select value={selectedTarget} onChange={(e) => setTargetId(e.target.value)}>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={() => selectedTarget && attemptCorruption(selectedTarget, tier)}>
          Attempt
        </button>
      </div>
      <p className="muted">"{actionText}"</p>

      {lastOutcome && (
        <p className={lastOutcome.detected ? 'result-fail' : 'result-pass'}>
          {lastOutcome.detected
            ? `Caught! A scandal has broken (+${lastOutcome.favorGain} favor banked anyway).`
            : `Undetected. +${lastOutcome.favorGain} favor banked.`}
        </p>
      )}

      {game.scandals.length === 0 && <p className="muted">No scandals yet.</p>}

      <ul className="scandal-list">
        {game.scandals.map((scandal) => {
          const politician = game.politicians.find((p) => p.id === scandal.politicianId);
          return (
            <li key={scandal.id} className={`scandal-item status-${scandal.status}`}>
              <span>
                <strong>{politician?.name ?? scandal.politicianId}</strong> — {scandal.tier} tier —{' '}
                {scandal.status}
                {scandal.response ? ` (${scandal.response})` : ''}
              </span>
              {scandal.status === 'unresolved' && (
                <span className="row-actions">
                  <button onClick={() => respondToScandalAction(scandal.id, 'admit')}>Admit</button>
                  <button onClick={() => respondToScandalAction(scandal.id, 'deny')}>Deny</button>
                  <button onClick={() => respondToScandalAction(scandal.id, 'scapegoat')}>
                    Scapegoat
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
