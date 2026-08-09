import { TREATY_TEMPLATES } from '../../content/diplomacy/treatyTemplates';
import { useStatecraftStore } from '../store';

export function DiplomacyPanel() {
  const game = useStatecraftStore((s) => s.game);
  const signTreatyAction = useStatecraftStore((s) => s.signTreatyAction);
  const breakTreatyAction = useStatecraftStore((s) => s.breakTreatyAction);
  const sendAidAction = useStatecraftStore((s) => s.sendAidAction);
  const imposeSanctionsAction = useStatecraftStore((s) => s.imposeSanctionsAction);

  if (!game) return null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>International Relations</h2>
      </div>

      <div className="whip-table-wrap">
        <table className="whip-table">
          <thead>
            <tr>
              <th>Counterpart</th>
              <th>Relations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {game.foreignCounterparts.map((counterpart) => (
              <tr key={counterpart.id}>
                <td>{counterpart.name}</td>
                <td>{game.foreignRelations[counterpart.id] ?? 0}</td>
                <td className="row-actions">
                  <button onClick={() => sendAidAction(counterpart.id)}>Send Aid</button>
                  <button onClick={() => imposeSanctionsAction(counterpart.id)}>Sanction</button>
                  {TREATY_TEMPLATES.map((template, i) => (
                    <button key={template.type} onClick={() => signTreatyAction(counterpart.id, i)}>
                      Sign {template.title}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="subheading">Treaties</h3>
      {game.treaties.length === 0 && <p className="muted">No treaties signed yet.</p>}
      <ul className="scandal-list">
        {game.treaties.map((treaty) => (
          <li key={treaty.id} className={`scandal-item status-${treaty.status}`}>
            <span>
              {treaty.title} — {treaty.status}
            </span>
            {treaty.status === 'active' && (
              <button onClick={() => breakTreatyAction(treaty.id)}>Break</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
