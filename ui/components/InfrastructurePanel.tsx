import type { InfrastructureCategory } from '../../engine';
import { useStatecraftStore } from '../store';

const CATEGORIES: { key: InfrastructureCategory; label: string }[] = [
  { key: 'transport', label: 'Transport' },
  { key: 'power', label: 'Power' },
  { key: 'water', label: 'Water' },
  { key: 'digital', label: 'Digital' },
];

export function InfrastructurePanel() {
  const game = useStatecraftStore((s) => s.game);
  const investInInfrastructureAction = useStatecraftStore((s) => s.investInInfrastructureAction);

  if (!game) return null;

  const infrastructure = game.infrastructure;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Public Infrastructure</h2>
        <span className="muted">Decays a little every turn without fresh investment</span>
      </div>

      <div className="indicator-grid">
        {CATEGORIES.map(({ key, label }) => (
          <div className="indicator" key={key}>
            <div className="indicator-label">{label}</div>
            <div className="indicator-value">{infrastructure[key].toFixed(1)}</div>
          </div>
        ))}
      </div>

      <table className="whip-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Quality</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(({ key, label }) => (
            <tr key={key}>
              <td>{label}</td>
              <td>{infrastructure[key].toFixed(1)}/100</td>
              <td className="row-actions">
                <button onClick={() => investInInfrastructureAction(key, 'modest')}>Invest (Modest)</button>
                <button onClick={() => investInInfrastructureAction(key, 'major')}>Invest (Major)</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Above-neutral average quality is a real productivity tailwind and lifts approval; crumbling infrastructure
        drags on both.
      </p>
    </section>
  );
}
