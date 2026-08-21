import { useState } from 'react';
import { CULTURAL_INSTITUTION_FOUNDING_COST, MEDIA_OUTLET_FOUNDING_COST } from '../../engine';
import { useStatecraftStore } from '../store';

/** Found and grow a player-owned media outlet, and fund cultural institutions — both build national soft power. See engine/systems/mediaEmpire.ts. */
export function MediaEmpirePanel() {
  const game = useStatecraftStore((s) => s.game);
  const foundMediaOutletAction = useStatecraftStore((s) => s.foundMediaOutletAction);
  const investInOutletAction = useStatecraftStore((s) => s.investInOutletAction);
  const foundCulturalInstitutionAction = useStatecraftStore((s) => s.foundCulturalInstitutionAction);
  const lastMediaEmpireOutcome = useStatecraftStore((s) => s.lastMediaEmpireOutcome);

  const [outletName, setOutletName] = useState('');
  const [economic, setEconomic] = useState(0);
  const [social, setSocial] = useState(0);
  const [institutionName, setInstitutionName] = useState('');

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const ownedOutlets = game.mediaOutlets.filter((o) => o.ownerId === player?.id);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Media &amp; Culture Empire</h2>
        <span className="muted">Soft power: {Math.round(game.softPower)}/100</span>
      </div>
      <p className="muted">
        Found your own press outlet and grow its reach, or fund cultural institutions — both build
        national soft power, felt as a small, sticky approval tailwind.
      </p>

      <h3>Found a Media Outlet</h3>
      <div className="custom-bill-form">
        <label>
          Name
          <input type="text" value={outletName} onChange={(e) => setOutletName(e.target.value)} placeholder="The National Herald" />
        </label>
        <label>
          Economic Bias ({economic})
          <input type="range" min={-100} max={100} value={economic} onChange={(e) => setEconomic(Number(e.target.value))} />
        </label>
        <label>
          Social Bias ({social})
          <input type="range" min={-100} max={100} value={social} onChange={(e) => setSocial(Number(e.target.value))} />
        </label>
        <div className="row-actions">
          <button
            disabled={!outletName.trim()}
            onClick={() => {
              foundMediaOutletAction(outletName, { economic, social });
              setOutletName('');
            }}
          >
            Found Outlet ({MEDIA_OUTLET_FOUNDING_COST})
          </button>
        </div>
      </div>

      {ownedOutlets.length > 0 && (
        <ul className="scandal-list">
          {ownedOutlets.map((outlet) => (
            <li key={outlet.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{outlet.name}</strong> — reach {(outlet.reach * 100).toFixed(1)}%
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${outlet.investedCapability ?? 0}%` }} />
                </div>
                <span className="muted">invested capability {Math.round(outlet.investedCapability ?? 0)}</span>
              </span>
              <span className="row-actions">
                <button onClick={() => investInOutletAction(outlet.id)}>Invest (50)</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>Fund a Cultural Institution</h3>
      <div className="custom-bill-form">
        <label>
          Name
          <input
            type="text"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            placeholder="National Arts Council"
          />
        </label>
        <div className="row-actions">
          <button
            disabled={!institutionName.trim()}
            onClick={() => {
              foundCulturalInstitutionAction(institutionName);
              setInstitutionName('');
            }}
          >
            Found Institution ({CULTURAL_INSTITUTION_FOUNDING_COST})
          </button>
        </div>
      </div>

      {game.culturalInstitutions.length > 0 && (
        <ul className="scandal-list">
          {game.culturalInstitutions.map((inst) => (
            <li key={inst.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{inst.name}</strong> — prestige {Math.round(inst.prestige)}
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${inst.prestige}%` }} />
                </div>
              </span>
            </li>
          ))}
        </ul>
      )}

      {lastMediaEmpireOutcome && !lastMediaEmpireOutcome.success && (
        <p className="result-fail">
          {lastMediaEmpireOutcome.reason === 'insufficient_wealth' ? 'Not enough personal wealth.' : 'Action failed.'}
        </p>
      )}
    </section>
  );
}
