import { useStatecraftStore } from '../store';

export function MediaPanel() {
  const lastCoverage = useStatecraftStore((s) => s.lastCoverage);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Press Coverage</h2>
      </div>

      {lastCoverage.length === 0 && (
        <p className="muted">
          No coverage yet — hold a floor vote or run an election to see how each outlet frames it.
        </p>
      )}

      <ul className="coverage-list">
        {lastCoverage.map((c) => (
          <li key={c.outletId} className={`coverage-item frame-${c.frame}`}>
            <span className="coverage-outlet">{c.outletName}</span>
            <span className={`coverage-frame frame-badge-${c.frame}`}>{c.frame}</span>
            <p className="coverage-headline">{c.headline}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
