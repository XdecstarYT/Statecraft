import { formatCalendarDate, turnToCalendarDate } from '../../engine';
import { useStatecraftStore } from '../store';

export function EventLogPanel() {
  const game = useStatecraftStore((s) => s.game);

  if (!game) return null;

  const entries = [...game.eventLog].reverse().slice(0, 10);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Crisis &amp; Event Log</h2>
      </div>

      {entries.length === 0 && (
        <p className="muted">Nothing has happened yet — advance a few weeks and see what turns up.</p>
      )}

      <ul className="coverage-list">
        {entries.map((entry, i) => (
          <li key={i} className={`coverage-item frame-${entry.category === 'scandal' ? 'critical' : 'neutral'}`}>
            <span className="coverage-outlet">{entry.title}</span>
            <span className="coverage-frame frame-badge-neutral">{entry.category.replace('_', ' ')}</span>
            <p className="coverage-headline">{entry.description}</p>
            <p className="muted">{formatCalendarDate(turnToCalendarDate(entry.turn))}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
