import { useStatecraftStore } from '../store';

export function WhipDisciplinePanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastPoliticalOutcome);
  const enforceWhipDisciplineAction = useStatecraftStore((s) => s.enforceWhipDisciplineAction);

  if (!game) return null;

  const recentRebellions = [...game.rebellions].slice(-8).reverse();

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Whip Discipline &amp; Backbench Rebellions</h2>
      </div>

      <p className="muted">
        Each party's whip tracks its own caucus discipline. A large-enough defection from a
        party's majority stance on a floor vote logs a rebellion and dents the whip's standing —
        confront a named rebel to try to bring them back in line.
      </p>

      {lastOutcome && (
        <p className={lastOutcome.tone === 'pass' ? 'result-pass' : lastOutcome.tone === 'fail' ? 'result-fail' : 'muted'}>
          <strong>{lastOutcome.label}:</strong> {lastOutcome.detail}
        </p>
      )}

      <ul className="scandal-list">
        {game.partyWhips.map((whip) => {
          const party = game.parties.find((p) => p.id === whip.partyId);
          const whipPolitician = game.politicians.find((p) => p.id === whip.politicianId);
          return (
            <li key={whip.partyId} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{party?.name ?? whip.partyId}</strong> whip: {whipPolitician?.name ?? whip.politicianId}
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${whip.disciplineScore}%` }} />
                </div>
                <span className="muted">discipline {whip.disciplineScore.toFixed(0)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <h3>Recent Rebellions</h3>
      {recentRebellions.length === 0 && <p className="muted">No rebellions yet.</p>}
      <ul className="scandal-list">
        {recentRebellions.map((rebellion) => {
          const party = game.parties.find((p) => p.id === rebellion.partyId);
          const bill = game.bills.find((b) => b.id === rebellion.billId);
          return (
            <li key={rebellion.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                Turn {rebellion.turn}: {rebellion.rebelIds.length} {party?.name ?? rebellion.partyId} member(s) defied the
                party line on <em>{bill?.title ?? rebellion.billId}</em>
              </span>
              <span className="row-actions">
                {rebellion.rebelIds.slice(0, 3).map((rebelId) => {
                  const rebel = game.politicians.find((p) => p.id === rebelId);
                  return (
                    <button key={rebelId} onClick={() => enforceWhipDisciplineAction(rebellion.partyId, rebelId)}>
                      Confront {rebel?.name ?? rebelId}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
