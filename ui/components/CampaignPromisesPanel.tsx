import { computeAllPromiseProgress, PROMISE_METRIC_DEFS, type PromiseMetric } from '../../engine';
import { useStatecraftStore } from '../store';

/**
 * A player-made promise's progress is never a fabricated number — it's
 * derived purely from how far a real, already-tracked stat (GDP growth,
 * crime rate, ...) has moved since the promise was made. See
 * engine/systems/promises.ts.
 */
export function CampaignPromisesPanel() {
  const game = useStatecraftStore((s) => s.game);
  const makePromiseAction = useStatecraftStore((s) => s.makePromiseAction);

  if (!game) return null;

  const promised = computeAllPromiseProgress(game);
  const promisedMetrics = new Set(promised.map((p) => p.promise.metric));
  const available = PROMISE_METRIC_DEFS.filter((def) => !promisedMetrics.has(def.metric));

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Campaign Promises</h2>
        <span className="muted">{promised.length} active</span>
      </div>

      {promised.length === 0 ? (
        <p className="muted">No promises made yet — pick one below to start being held to it.</p>
      ) : (
        <ul className="promise-list">
          {promised.map(({ promise, def, progress, currentValue }) => (
            <li key={promise.id} className="promise-item">
              <div className="promise-item-header">
                <span>
                  {def.icon} Promise to {def.direction} {def.label}
                </span>
                <span className="muted">{progress.toFixed(0)}%</span>
              </div>
              <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="muted promise-item-values">
                {def.label}: {promise.baselineValue.toFixed(1)} → {currentValue.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="bill-actions">
          <select
            id="promise-metric-select"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              makePromiseAction(e.target.value as PromiseMetric);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Make a new promise…
            </option>
            {available.map((def) => (
              <option key={def.metric} value={def.metric}>
                {def.icon} Promise to {def.direction} {def.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}
