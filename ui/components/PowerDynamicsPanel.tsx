import { useState } from 'react';
import { useStatecraftStore } from '../store';

export function PowerDynamicsPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastPoliticalOutcome);
  const foundDynastyAction = useStatecraftStore((s) => s.foundDynastyAction);
  const declareStateOfEmergencyAction = useStatecraftStore((s) => s.declareStateOfEmergencyAction);
  const declareMartialLawAction = useStatecraftStore((s) => s.declareMartialLawAction);
  const liftEmergencyPowersAction = useStatecraftStore((s) => s.liftEmergencyPowersAction);

  const [familyName, setFamilyName] = useState('');

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const playerHasDynasty = player ? game.dynasties.some((d) => d.memberIds.includes(player.id)) : false;
  const recentCoups = [...game.coupHistory].slice(-5).reverse();

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Dynasties, Juntas &amp; Emergency Powers</h2>
        <span className="muted">Emergency status: {game.emergencyPowers.replace(/_/g, ' ')}</span>
      </div>

      {game.juntaControl && (
        <p className="result-fail">
          A coup has succeeded — the government is under junta control. Elections are suspended.
        </p>
      )}

      <p className="muted">
        Founding a dynasty roots a lasting family in politics: when a by-election vacates a
        dynasty member's seat and the family's own party holds it, an heir with an earned head
        start fields the next generation. Emergency powers suppress unrest at a real, immediate
        approval cost — and raise the baseline risk of a coup the longer they stay in force.
      </p>

      {lastOutcome && (
        <p className={lastOutcome.tone === 'pass' ? 'result-pass' : lastOutcome.tone === 'fail' ? 'result-fail' : 'muted'}>
          <strong>{lastOutcome.label}:</strong> {lastOutcome.detail}
        </p>
      )}

      {player && !playerHasDynasty && (
        <div className="corruption-controls">
          <input
            type="text"
            placeholder="Family name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
          />
          <button
            onClick={() => familyName.trim() && foundDynastyAction(player.id, familyName.trim())}
            disabled={!familyName.trim()}
          >
            Found Dynasty
          </button>
        </div>
      )}

      <div className="corruption-controls">
        {game.emergencyPowers === 'none' && (
          <>
            <button onClick={() => declareStateOfEmergencyAction()}>Declare State of Emergency</button>
            <button onClick={() => declareMartialLawAction()}>Declare Martial Law</button>
          </>
        )}
        {game.emergencyPowers !== 'none' && (
          <button onClick={() => liftEmergencyPowersAction()}>Lift Emergency Powers</button>
        )}
      </div>

      <h3>Dynasties</h3>
      {game.dynasties.length === 0 && <p className="muted">No political dynasties founded yet.</p>}
      <ul className="scandal-list">
        {game.dynasties.map((dynasty) => (
          <li key={dynasty.id} className="scandal-item">
            <span style={{ flex: 1 }}>
              <strong>House {dynasty.familyName}</strong> — prestige {dynasty.prestige.toFixed(0)} —{' '}
              {dynasty.memberIds.length} member(s)
              <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                <div className="score-bar-fill" style={{ width: `${dynasty.prestige}%` }} />
              </div>
            </span>
          </li>
        ))}
      </ul>

      <h3>Coup History</h3>
      {recentCoups.length === 0 && <p className="muted">No coup attempts recorded.</p>}
      <ul className="scandal-list">
        {recentCoups.map((coup) => (
          <li key={coup.id} className={coup.outcome === 'succeeded' ? 'scandal-item status-unresolved' : 'scandal-item status-resolved'}>
            <span>
              Turn {coup.turn}: {coup.instigator.replace(/_/g, ' ')} coup attempt — {coup.outcome}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
