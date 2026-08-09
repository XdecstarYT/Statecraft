import { LEADERSHIP_CHALLENGE_THRESHOLD } from '../../engine';
import { useStatecraftStore } from '../store';

export function LeadershipPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastLeadershipActionOutcome);
  const rallyPartySupportAction = useStatecraftStore((s) => s.rallyPartySupportAction);
  const denounceChallengerAction = useStatecraftStore((s) => s.denounceChallengerAction);
  const dismissLeadershipChallengeAction = useStatecraftStore((s) => s.dismissLeadershipChallengeAction);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  if (!player) return null;

  const challenge = game.leadershipChallenge;
  const isLeader = game.partyLeaderId[player.partyId] === player.id;
  const party = game.parties.find((p) => p.id === player.partyId);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Party Leadership</h2>
        <span className="muted">
          {isLeader ? `You lead ${party?.name ?? 'your party'}` : 'You are a rank-and-file member'}
        </span>
      </div>

      {!challenge && (
        <>
          <p className="muted">
            Standing with party elites: <strong>{player.approval.partyElite.toFixed(0)}</strong>
            {isLeader && player.approval.partyElite < LEADERSHIP_CHALLENGE_THRESHOLD && (
              <> — below {LEADERSHIP_CHALLENGE_THRESHOLD}, a rival could emerge any turn.</>
            )}
          </p>
          {!isLeader && (
            <p className="muted">
              {game.politicians.find((p) => p.id === game.partyLeaderId[player.partyId])?.name ?? 'Someone else'}{' '}
              currently leads the party.
            </p>
          )}
        </>
      )}

      {challenge && challenge.status === 'brewing' && (
        <BrewingChallenge
          challengerName={
            game.politicians.find((p) => p.id === challenge.challengerId)?.name ?? challenge.challengerId
          }
          onRally={rallyPartySupportAction}
          onDenounce={denounceChallengerAction}
          lastOutcome={lastOutcome}
        />
      )}

      {challenge && challenge.status === 'resolved' && (
        <ResolvedChallenge
          winnerName={game.politicians.find((p) => p.id === challenge.winnerId)?.name ?? challenge.winnerId ?? ''}
          playerWon={challenge.winnerId === player.id}
          incumbentVotes={challenge.incumbentVotes ?? 0}
          challengerVotes={challenge.challengerVotes ?? 0}
          onDismiss={dismissLeadershipChallengeAction}
        />
      )}
    </section>
  );
}

function BrewingChallenge({
  challengerName,
  onRally,
  onDenounce,
  lastOutcome,
}: {
  challengerName: string;
  onRally: () => void;
  onDenounce: () => void;
  lastOutcome: { outcome: string; impact: number; action: 'rally' | 'denounce' } | null;
}) {
  return (
    <div className="billboard-slide">
      <span className="bill-status status-active">Leadership Challenge Brewing</span>
      <h3>{challengerName} is moving against your leadership</h3>
      <p className="muted">
        The vote is called next turn. You have one turn to shore up support or take the challenger down a
        peg before party members decide.
      </p>
      <div className="row-actions">
        <button onClick={onRally}>Rally the Party</button>
        <button onClick={onDenounce}>Denounce Challenger</button>
      </div>
      {lastOutcome && (
        <p className={lastOutcome.impact >= 0 === (lastOutcome.action === 'rally') ? 'result-pass' : 'result-fail'}>
          {lastOutcome.action === 'rally' ? 'Rally' : 'Denouncement'} — {lastOutcome.outcome} (
          {lastOutcome.impact >= 0 ? '+' : ''}
          {lastOutcome.impact.toFixed(0)})
        </p>
      )}
    </div>
  );
}

function ResolvedChallenge({
  winnerName,
  playerWon,
  incumbentVotes,
  challengerVotes,
  onDismiss,
}: {
  winnerName: string;
  playerWon: boolean;
  incumbentVotes: number;
  challengerVotes: number;
  onDismiss: () => void;
}) {
  return (
    <div className="billboard-slide">
      <span className={playerWon ? 'result-pass' : 'result-fail'}>
        {playerWon ? 'You held onto the leadership' : 'You lost the leadership vote'}
      </span>
      <h3>{winnerName} wins {incumbentVotes} – {challengerVotes}</h3>
      <p className="muted">
        {playerWon
          ? "The party rallies behind you — for now."
          : `${winnerName} now leads the party. Your standing with the public and party elites has taken a real hit.`}
      </p>
      <button onClick={onDismiss}>Acknowledge</button>
    </div>
  );
}
