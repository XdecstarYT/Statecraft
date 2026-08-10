import { useStatecraftStore } from '../store';

export function UnrestPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastDispersalOutcome = useStatecraftStore((s) => s.lastDispersalOutcome);
  const concedeToProtestersAction = useStatecraftStore((s) => s.concedeToProtestersAction);
  const disperseProtestAction = useStatecraftStore((s) => s.disperseProtestAction);

  if (!game) return null;

  const protests = game.protests;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Civil Unrest</h2>
        <span className="muted">Driven by unemployment, inflation, and public approval</span>
      </div>

      {protests.length === 0 && <p className="muted">No unrest anywhere in the country — yet.</p>}

      <ul className="scandal-list">
        {protests.map((protest) => (
          <li
            key={protest.id}
            className={`scandal-item status-${protest.status === 'riot' ? 'lost' : protest.status === 'quelled' ? 'resolved' : 'unresolved'}`}
          >
            <span style={{ flex: 1 }}>
              <strong>{protest.cause}</strong> — {protest.status}
              {protest.status !== 'quelled' && (
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, protest.intensity))}%` }} />
                </div>
              )}
              <span className="muted"> Intensity: {protest.intensity.toFixed(0)}</span>
              {lastDispersalOutcome && lastDispersalOutcome.protestId === protest.id && (
                <p className={lastDispersalOutcome.success ? 'result-pass' : 'result-fail'}>
                  {lastDispersalOutcome.success ? 'The protest was dispersed.' : 'The dispersal failed — it has turned into a riot.'}
                </p>
              )}
            </span>
            {protest.status === 'protesting' && (
              <span className="row-actions">
                <button onClick={() => concedeToProtestersAction(protest.id)}>Concede</button>
                <button className="danger-button" onClick={() => disperseProtestAction(protest.id)}>
                  Disperse
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
