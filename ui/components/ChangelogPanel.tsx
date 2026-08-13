import { CHANGELOG } from '../../content/changelog';

interface ChangelogPanelProps {
  onClose: () => void;
}

/** A dismissible overlay listing every patch note in content/changelog.ts, newest first. */
export function ChangelogPanel({ onClose }: ChangelogPanelProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="panel modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Update Log</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="changelog-list">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="changelog-entry">
              <h3>
                v{entry.version} — {entry.title}
              </h3>
              <ul>
                {entry.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
