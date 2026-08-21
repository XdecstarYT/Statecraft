import { useStatecraftStore } from '../store';

/** A click-to-open panel for one turn on the timeline: quick actions for the current turn, a summary/preview of what's happening or scheduled for any turn, and a reminder flag for future turns. */
export function TurnMenu({ turn, onClose }: { turn: number; onClose: () => void }) {
  const game = useStatecraftStore((s) => s.game);
  const flaggedTurns = useStatecraftStore((s) => s.flaggedTurns);
  const toggleTurnFlag = useStatecraftStore((s) => s.toggleTurnFlag);
  const nextTurn = useStatecraftStore((s) => s.nextTurn);
  const proposeNewBill = useStatecraftStore((s) => s.proposeNewBill);
  const giveSpeech = useStatecraftStore((s) => s.giveSpeech);
  const holdPressInterviewAction = useStatecraftStore((s) => s.holdPressInterviewAction);
  const holdRallyAction = useStatecraftStore((s) => s.holdRallyAction);

  if (!game) return null;

  const isCurrent = turn === game.turn;
  const isPast = turn < game.turn;
  const isFuture = turn > game.turn;
  const isFlagged = flaggedTurns.includes(turn);

  const relativeLabel = isCurrent
    ? 'This week'
    : isPast
      ? `${game.turn - turn} week${game.turn - turn === 1 ? '' : 's'} ago`
      : `In ${turn - game.turn} week${turn - game.turn === 1 ? '' : 's'}`;

  const billsInFlight = game.bills.filter(
    (b) => b.status === 'drafting' || b.status === 'committee' || b.status === 'floor'
  );
  const pendingEffectsLanding = isCurrent || isFuture
    ? game.economy.pendingEffects.filter((e) => e.turnsRemaining === turn - game.turn).length
    : 0;
  const worldElectionsDue = game.worldGovernments.filter((g) => g.nextElectionTurn === turn).length;
  const isNationalElectionTurn = game.nextElectionTurn === turn;

  const pastEvents = isPast ? game.eventLog.filter((e) => e.turn === turn) : [];
  const pastWorldElections = isPast ? game.worldElectionHistory.filter((r) => r.turn === turn) : [];

  return (
    <div className="turn-menu-backdrop" onClick={onClose}>
      <div className="turn-menu" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>
            Turn {turn} <span className="muted">— {relativeLabel}</span>
          </h3>
          <button className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>

        {isCurrent && (
          <>
            <h4 className="subheading">Quick Actions</h4>
            <div className="bill-actions">
              <button onClick={() => { nextTurn(); onClose(); }}>Advance Week</button>
              <button onClick={proposeNewBill}>Draft Bill From Template</button>
              <button onClick={giveSpeech}>Give Speech</button>
              <button onClick={holdPressInterviewAction}>Hold Press Interview</button>
              <button onClick={holdRallyAction}>Hold Rally</button>
            </div>
          </>
        )}

        <h4 className="subheading">{isPast ? 'What Happened' : 'Scheduled'}</h4>
        {!isPast && (
          <ul className="scandal-list">
            <li className="scandal-item status-unresolved">
              <span>{billsInFlight.length} bill{billsInFlight.length === 1 ? '' : 's'} currently in flight</span>
            </li>
            {pendingEffectsLanding > 0 && (
              <li className="scandal-item status-unresolved">
                <span>{pendingEffectsLanding} pending economic effect{pendingEffectsLanding === 1 ? '' : 's'} landing</span>
              </li>
            )}
            {worldElectionsDue > 0 && (
              <li className="scandal-item status-unresolved">
                <span>{worldElectionsDue} world nation election{worldElectionsDue === 1 ? '' : 's'} due</span>
              </li>
            )}
            {isNationalElectionTurn && (
              <li className="scandal-item status-unresolved">
                <span>🗳️ Your own legislative election is scheduled</span>
              </li>
            )}
            {pendingEffectsLanding === 0 && worldElectionsDue === 0 && !isNationalElectionTurn && (
              <li className="scandal-item">
                <span className="muted">Nothing else specifically scheduled yet.</span>
              </li>
            )}
          </ul>
        )}
        {isPast && (
          <ul className="scandal-list">
            {pastEvents.map((e, i) => (
              <li key={`event-${i}`} className="scandal-item status-unresolved">
                <span>{e.title}</span>
              </li>
            ))}
            {pastWorldElections.map((r, i) => (
              <li key={`we-${i}`} className={`scandal-item status-${r.incumbentReturned ? 'resolved' : 'unresolved'}`}>
                <span>
                  {r.incumbentReturned ? `${r.previousPartyName} re-elected abroad` : `${r.newPartyName} took power abroad`}
                </span>
              </li>
            ))}
            {pastEvents.length === 0 && pastWorldElections.length === 0 && (
              <li className="scandal-item">
                <span className="muted">Nothing notable logged for this week.</span>
              </li>
            )}
          </ul>
        )}

        {isFuture && (
          <button className={isFlagged ? 'active' : 'ghost-button'} onClick={() => toggleTurnFlag(turn)}>
            {isFlagged ? '★ Reminder set — click to clear' : '☆ Remind me at this turn'}
          </button>
        )}
      </div>
    </div>
  );
}
