import { useStatecraftStore } from '../store';

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Every province's own small state legislature (seats resolved by D'Hondt
 * alongside its gubernatorial election — see stateGovernance.ts) plus
 * federal tension and any interstate disputes it's spawned (see
 * federalism.ts). Purely a renderer over GameState.
 */
export function FederalismPanel() {
  const game = useStatecraftStore((s) => s.game);
  const mediateInterstateDisputeAction = useStatecraftStore((s) => s.mediateInterstateDisputeAction);
  const lastDisputeOutcome = useStatecraftStore((s) => s.lastDisputeOutcome);

  if (!game) return null;
  if (game.stateGovernments.length === 0) return null;

  const provinceNameById = new Map(game.stateGovernments.map((g) => [g.provinceId, g.provinceName]));
  const partyById = new Map(game.parties.map((p) => [p.id, p]));
  const activeDisputes = game.interstateDisputes.filter((d) => d.status === 'active');
  const resolvedDisputes = [...game.interstateDisputes.filter((d) => d.status === 'resolved')].reverse().slice(0, 5);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Federalism</h2>
        <span className="muted">State legislatures &amp; interstate relations</span>
      </div>
      <p className="muted">
        Every state runs its own small legislature alongside its governor. States under high federal
        tension occasionally clash with a neighbor — mediate toward one side, or stay neutral for a
        smaller, even settlement.
      </p>

      <h3>State Legislatures &amp; Federal Tension</h3>
      <div className="whip-table-wrap">
        <table className="whip-table">
          <thead>
            <tr>
              <th>Province</th>
              <th>Seats</th>
              <th>Federal Tension</th>
            </tr>
          </thead>
          <tbody>
            {game.stateGovernments.map((gov) => (
              <tr key={gov.provinceId}>
                <td>{gov.provinceName}</td>
                <td>
                  {Object.entries(gov.legislatureSeats)
                    .filter(([, seats]) => seats > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([partyId, seats]) => `${partyById.get(partyId)?.name ?? partyId} ${seats}`)
                    .join(' · ') || '—'}
                </td>
                <td>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${gov.federalTension}%` }} />
                  </div>
                  <span className="muted">{Math.round(gov.federalTension)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Interstate Disputes</h3>
      {activeDisputes.length === 0 && <p className="muted">No active disputes right now.</p>}
      {activeDisputes.length > 0 && (
        <ul className="scandal-list">
          {activeDisputes.map((dispute) => {
            const nameA = provinceNameById.get(dispute.stateAId) ?? dispute.stateAId;
            const nameB = provinceNameById.get(dispute.stateBId) ?? dispute.stateBId;
            return (
              <li key={dispute.id} className="scandal-item">
                <span style={{ flex: 1 }}>
                  <strong>{titleCase(dispute.type)} dispute</strong> — {nameA} vs {nameB} (since turn {dispute.turnStarted})
                </span>
                <span className="row-actions">
                  <button onClick={() => mediateInterstateDisputeAction(dispute.id, 'favor_a')}>Favor {nameA}</button>
                  <button onClick={() => mediateInterstateDisputeAction(dispute.id, 'favor_b')}>Favor {nameB}</button>
                  <button className="ghost-button" onClick={() => mediateInterstateDisputeAction(dispute.id, 'neutral')}>
                    Neutral Mediation
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {lastDisputeOutcome && !lastDisputeOutcome.success && <p className="result-fail">Could not mediate that dispute.</p>}

      {resolvedDisputes.length > 0 && (
        <>
          <h3>Recently Resolved</h3>
          <ul className="coverage-list">
            {resolvedDisputes.map((d) => {
              const nameA = provinceNameById.get(d.stateAId) ?? d.stateAId;
              const nameB = provinceNameById.get(d.stateBId) ?? d.stateBId;
              const favored = d.resolution === 'favor_a' ? nameA : d.resolution === 'favor_b' ? nameB : null;
              return (
                <li key={d.id} className="coverage-item frame-neutral">
                  <span className="coverage-outlet">
                    Turn {d.turnResolved} — {titleCase(d.type)}
                  </span>
                  <p className="coverage-headline">
                    {nameA} vs {nameB} — resolved {favored ? `favoring ${favored}` : 'neutrally'}.
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
