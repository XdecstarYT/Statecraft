import { computeMovementStance, type MovementStance } from '../../engine';
import { useStatecraftStore } from '../store';

const STANCE_STATUS_CLASS: Record<MovementStance, string> = {
  supportive: 'status-won',
  hostile: 'status-lost',
  neutral: 'status-unresolved',
};

export function MovementsPanel() {
  const game = useStatecraftStore((s) => s.game);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const playerIdeology = player?.ideology ?? { economic: 0, social: 0 };
  const movements = [...game.movements].sort((a, b) => b.size - a.size);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Grassroots Movements</h2>
        <span className="muted">Organized out of voter-bloc grievance against your positions</span>
      </div>

      {movements.length === 0 && (
        <p className="muted">No movements have organized yet — deep, unaddressed grievance is what it takes.</p>
      )}

      <ul className="scandal-list">
        {movements.map((movement) => {
          const stance = computeMovementStance(movement, playerIdeology);
          return (
            <li className={`scandal-item ${STANCE_STATUS_CLASS[stance]}`} key={movement.id}>
              <span style={{ flex: 1 }}>
                <strong>{movement.name}</strong> — {stance}
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, movement.size))}%` }} />
                </div>
                <p className="muted">{movement.mission}</p>
                <span className="muted">Size: {movement.size.toFixed(0)}/100</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
