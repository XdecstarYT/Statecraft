import { useStatecraftStore } from '../store';

export function JudiciaryPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastJudiciaryOutcome = useStatecraftStore((s) => s.lastJudiciaryOutcome);
  const lastConfirmationResult = useStatecraftStore((s) => s.lastConfirmationResult);
  const nominateJusticeAction = useStatecraftStore((s) => s.nominateJusticeAction);
  const confirmJusticeAction = useStatecraftStore((s) => s.confirmJusticeAction);

  if (!game) return null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Judiciary</h2>
        <span className="muted">A real check-and-balance — the court can strike down your own laws</span>
      </div>

      {lastJudiciaryOutcome && !lastJudiciaryOutcome.success && (
        <p className="result-fail">Action failed: {lastJudiciaryOutcome.reason?.replace(/_/g, ' ')}</p>
      )}
      {lastConfirmationResult && (
        <p className={lastConfirmationResult.confirmed ? 'result-pass' : 'result-fail'}>
          Confirmation vote: {lastConfirmationResult.yesVotes} yes – {lastConfirmationResult.noVotes} no —{' '}
          {lastConfirmationResult.confirmed ? 'confirmed' : 'rejected'}
        </p>
      )}

      <table className="whip-table">
        <thead>
          <tr>
            <th>Seat</th>
            <th>Justice</th>
            <th>Ideology</th>
            <th>Integrity</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {game.court.seats.map((seat, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{seat?.name ?? '—'}</td>
              <td>{seat ? `${seat.ideology.economic.toFixed(0)} / ${seat.ideology.social.toFixed(0)}` : '—'}</td>
              <td>{seat?.integrity ?? '—'}</td>
              <td>{seat?.status ?? 'vacant'}</td>
              <td className="row-actions">
                {!seat && <button onClick={() => nominateJusticeAction(i)}>Nominate</button>}
                {seat?.status === 'nominated' && (
                  <>
                    <button onClick={() => nominateJusticeAction(i)}>Replace Nominee</button>
                    <button onClick={() => confirmJusticeAction(i)}>Hold Confirmation Vote</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="subheading">Judicial Review Cases</h4>
      {game.judicialReviewCases.length === 0 && <p className="muted">No bills have been challenged yet.</p>}
      <ul className="scandal-list">
        {[...game.judicialReviewCases].reverse().map((c) => (
          <li
            key={c.id}
            className={`scandal-item status-${c.status === 'pending' ? 'unresolved' : c.status === 'upheld' ? 'resolved' : 'lost'}`}
          >
            <span style={{ flex: 1 }}>
              <strong>{c.billTitle}</strong> <span className="muted">filed week {c.turnFiled}</span>
              {c.status === 'pending' && <span className="muted"> · under review</span>}
              {c.status !== 'pending' && (
                <span> — {c.status === 'upheld' ? 'upheld' : 'struck down'} (week {c.turnResolved})</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
