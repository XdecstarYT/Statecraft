import { useStatecraftStore } from '../store';

export function SecessionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastReferendumOutcome = useStatecraftStore((s) => s.lastReferendumOutcome);
  const lastSuppressionOutcome = useStatecraftStore((s) => s.lastSuppressionOutcome);
  const grantAutonomyAction = useStatecraftStore((s) => s.grantAutonomyAction);
  const callReferendumAction = useStatecraftStore((s) => s.callReferendumAction);
  const suppressMovementAction = useStatecraftStore((s) => s.suppressMovementAction);

  if (!game) return null;

  const movements = game.secessionistMovements;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Separatist Movements</h2>
        <span className="muted">Driven by unemployment and low approval</span>
      </div>

      {movements.length === 0 && <p className="muted">No separatist sentiment anywhere in the country — yet.</p>}

      <ul className="scandal-list">
        {movements.map((movement) => (
          <li key={movement.provinceId} className={`scandal-item status-${movement.status === 'agitating' ? 'unresolved' : movement.status === 'independent' ? 'lost' : 'resolved'}`}>
            <span style={{ flex: 1 }}>
              <strong>{movement.provinceName}</strong> — {movement.status}
              {movement.status === 'agitating' && (
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, movement.sentiment))}%` }} />
                </div>
              )}
              <span className="muted"> Sentiment: {movement.sentiment.toFixed(0)}</span>
              {lastReferendumOutcome && lastReferendumOutcome.provinceId === movement.provinceId && (
                <p className={lastReferendumOutcome.seceded ? 'result-fail' : 'result-pass'}>
                  Referendum: {(lastReferendumOutcome.yesShare * 100).toFixed(0)}% voted yes —{' '}
                  {lastReferendumOutcome.seceded ? 'independence declared' : 'the union holds'}
                </p>
              )}
              {lastSuppressionOutcome && lastSuppressionOutcome.provinceId === movement.provinceId && (
                <p className={lastSuppressionOutcome.success ? 'result-pass' : 'result-fail'}>
                  {lastSuppressionOutcome.success
                    ? 'The movement was suppressed.'
                    : 'The suppression failed — the region has broken away.'}
                </p>
              )}
            </span>
            {movement.status === 'agitating' && (
              <span className="row-actions">
                <button onClick={() => grantAutonomyAction(movement.provinceId)}>Grant Autonomy</button>
                <button onClick={() => callReferendumAction(movement.provinceId)}>Call Referendum</button>
                <button className="danger-button" onClick={() => suppressMovementAction(movement.provinceId)}>
                  Suppress
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
