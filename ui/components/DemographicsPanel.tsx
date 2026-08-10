import type { ImmigrationPolicyLevel } from '../../engine';
import { useStatecraftStore } from '../store';

export function DemographicsPanel() {
  const game = useStatecraftStore((s) => s.game);
  const setImmigrationPolicyAction = useStatecraftStore((s) => s.setImmigrationPolicyAction);

  if (!game) return null;

  const d = game.demographics;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Demographics &amp; Immigration</h2>
        <span className="muted">Population, migration, and the labor force</span>
      </div>

      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Population (thousands)</div>
          <div className="indicator-value">{d.population.toFixed(0)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Natural Growth / Turn</div>
          <div className="indicator-value">{d.naturalGrowthRate.toFixed(2)}%</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Net Migration / Turn</div>
          <div className="indicator-value">{d.netMigrationRate.toFixed(2)}%</div>
        </div>
      </div>

      <div className="custom-bill-form">
        <label>
          Immigration Policy
          <select value={d.policy} onChange={(e) => setImmigrationPolicyAction(e.target.value as ImmigrationPolicyLevel)}>
            <option value="closed">Closed — no migration either way</option>
            <option value="restricted">Restricted — modest flows</option>
            <option value="open">Open — fully exposed to economic conditions</option>
          </select>
        </label>
      </div>
      <p className="muted">
        A strong economy draws people in under an open or restricted policy; a weak one loses them. Rapid change in
        either direction leaves more of the electorate genuinely undecided.
      </p>
    </section>
  );
}
