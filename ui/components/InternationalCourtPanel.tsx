import { useState } from 'react';
import type { TribunalChargeType } from '../../engine';
import { PLAYER_TRIBUNAL_TARGET_ID } from '../../engine';
import { useStatecraftStore } from '../store';

const CHARGE_LABELS: Record<TribunalChargeType, string> = {
  war_crimes: 'War Crimes',
  corruption: 'Corruption',
  crimes_against_humanity: 'Crimes Against Humanity',
};

const CHARGES: TribunalChargeType[] = ['war_crimes', 'corruption', 'crimes_against_humanity'];

export function InternationalCourtPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastPoliticalOutcome);
  const fileTribunalCaseAction = useStatecraftStore((s) => s.fileTribunalCaseAction);
  const imposeMultilateralSanctionsAction = useStatecraftStore((s) => s.imposeMultilateralSanctionsAction);
  const liftSanctionsAction = useStatecraftStore((s) => s.liftSanctionsAction);

  const [targetId, setTargetId] = useState('');
  const [chargeType, setChargeType] = useState<TribunalChargeType>('corruption');

  if (!game) return null;

  const selectedTarget = targetId || game.foreignCounterparts[0]?.id || '';

  const nameFor = (id: string) =>
    id === PLAYER_TRIBUNAL_TARGET_ID
      ? 'Your Government'
      : game.foreignCounterparts.find((c) => c.id === id)?.name ?? id;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>International Courts &amp; Sanctions</h2>
      </div>

      <p className="muted">
        A tribunal case takes several turns to investigate before it resolves — conviction
        triggers one real, scaled multilateral sanctions regime. Enough unresolved hard-tier
        scandals or a war fought at an extreme advantage swing can also draw world scrutiny onto
        your own government.
      </p>

      <div className="corruption-controls">
        <select value={selectedTarget} onChange={(e) => setTargetId(e.target.value)}>
          {game.foreignCounterparts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={chargeType} onChange={(e) => setChargeType(e.target.value as TribunalChargeType)}>
          {CHARGES.map((c) => (
            <option key={c} value={c}>
              {CHARGE_LABELS[c]}
            </option>
          ))}
        </select>
        <button onClick={() => selectedTarget && fileTribunalCaseAction(selectedTarget, chargeType)}>
          File Case
        </button>
        <button onClick={() => selectedTarget && imposeMultilateralSanctionsAction(selectedTarget, 2)}>
          Push Sanctions
        </button>
      </div>

      {lastOutcome && (
        <p className={lastOutcome.tone === 'pass' ? 'result-pass' : lastOutcome.tone === 'fail' ? 'result-fail' : 'muted'}>
          <strong>{lastOutcome.label}:</strong> {lastOutcome.detail}
        </p>
      )}

      <h3>Tribunal Cases</h3>
      {game.tribunalCases.length === 0 && <p className="muted">No cases filed.</p>}
      <ul className="scandal-list">
        {game.tribunalCases.map((tc) => (
          <li key={tc.id} className={`scandal-item status-${tc.status}`}>
            <span>
              <strong>{nameFor(tc.targetId)}</strong> — {CHARGE_LABELS[tc.chargeType]} — {tc.status}
            </span>
          </li>
        ))}
      </ul>

      <h3>Sanctions Regimes</h3>
      {game.sanctionsRegimes.length === 0 && <p className="muted">No sanctions regimes active.</p>}
      <ul className="scandal-list">
        {game.sanctionsRegimes.map((regime) => (
          <li key={regime.id} className="scandal-item">
            <span>
              <strong>{nameFor(regime.targetId)}</strong> — severity {regime.severity} — {regime.status}
            </span>
            {regime.status === 'active' && (
              <span className="row-actions">
                <button onClick={() => liftSanctionsAction(regime.id)}>Lift</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
