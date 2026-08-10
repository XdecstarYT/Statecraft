import type { PolicingFundingTier } from '../../engine';
import { useStatecraftStore } from '../store';

export function CrimePanel() {
  const game = useStatecraftStore((s) => s.game);
  const setPolicingFundingAction = useStatecraftStore((s) => s.setPolicingFundingAction);

  if (!game) return null;

  const crime = game.crime;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Crime &amp; Public Safety</h2>
        <span className="muted">Driven by real poverty and unemployment, pulled down by policing funding</span>
      </div>

      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Crime Rate</div>
          <div className="indicator-value">{crime.crimeRate.toFixed(1)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Incarceration Rate</div>
          <div className="indicator-value">{crime.incarcerationRate.toFixed(1)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Organized Crime Influence</div>
          <div className="indicator-value">{crime.organizedCrimeInfluence.toFixed(1)}</div>
        </div>
      </div>

      <div className="custom-bill-form">
        <label>
          Policing Funding
          <select value={crime.policingFunding} onChange={(e) => setPolicingFundingAction(e.target.value as PolicingFundingTier)}>
            <option value="minimal">Minimal</option>
            <option value="standard">Standard</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Aggressive funding suppresses crime fastest and incarcerates more for the same crime level, but costs more and
        carries a little ongoing approval friction of its own. Unresolved scandals let organized crime dig in.
      </p>
    </section>
  );
}
