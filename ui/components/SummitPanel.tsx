import { useStatecraftStore } from '../store';

export function SummitPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastSummitOutcome = useStatecraftStore((s) => s.lastSummitOutcome);
  const castSummitVoteAction = useStatecraftStore((s) => s.castSummitVoteAction);

  if (!game) return null;

  const summit = game.activeSummit;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>International Summit</h2>
        <span className="muted">Multilateral resolutions, decided by real ideological alignment</span>
      </div>

      {!summit && !lastSummitOutcome && <p className="muted">No summit convened yet.</p>}

      {summit && (
        <div className="nation-detail">
          <h3>{summit.title}</h3>
          <p className="muted">{summit.description}</p>
          <p className="muted">
            Attendees:{' '}
            {summit.attendeeIds
              .map((id) => game.foreignCounterparts.find((c) => c.id === id)?.name ?? id)
              .join(', ')}
          </p>
          <div className="row-actions">
            <button onClick={() => castSummitVoteAction('yes')}>Vote Yes</button>
            <button className="ghost-button" onClick={() => castSummitVoteAction('no')}>
              Vote No
            </button>
          </div>
        </div>
      )}

      {lastSummitOutcome && (
        <p className={lastSummitOutcome.passed ? 'result-pass' : 'result-fail'}>
          Resolution {lastSummitOutcome.passed ? 'PASSED' : 'FAILED'} — {lastSummitOutcome.votesFor} for /{' '}
          {lastSummitOutcome.votesAgainst} against
        </p>
      )}
    </section>
  );
}
