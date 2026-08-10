import { useStatecraftStore } from '../store';

const WINDOW_BEFORE = 6;
const WINDOW_AFTER = 14;

/** A bottom-of-screen turn timeline — the current turn, a window of recent/upcoming turns, and the next scheduled election, with the turn-advance control docked at the end. */
export function TimelineScrubber() {
  const game = useStatecraftStore((s) => s.game);
  const nextTurn = useStatecraftStore((s) => s.nextTurn);

  if (!game) return null;

  const start = Math.max(1, game.turn - WINDOW_BEFORE);
  const end = game.turn + WINDOW_AFTER;
  const ticks: number[] = [];
  for (let t = start; t <= end; t++) ticks.push(t);

  return (
    <div className="timeline-scrubber">
      <div className="timeline-track">
        {ticks.map((turn) => {
          const isCurrent = turn === game.turn;
          const isElection = turn === game.nextElectionTurn;
          return (
            <div
              key={turn}
              className={`timeline-tick ${isCurrent ? 'timeline-tick-current' : ''} ${isElection ? 'timeline-tick-election' : ''}`}
              title={isElection ? `Turn ${turn} — scheduled election` : `Turn ${turn}`}
            >
              {isElection && <span className="timeline-tick-icon">🗳️</span>}
              <span className="timeline-tick-label">{turn}</span>
            </div>
          );
        })}
      </div>
      <button className="timeline-advance-btn" onClick={nextTurn}>
        Advance ▶
      </button>
    </div>
  );
}
