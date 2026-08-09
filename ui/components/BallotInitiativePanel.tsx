import { useState } from 'react';
import { useStatecraftStore } from '../store';

export function BallotInitiativePanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastBallotResult = useStatecraftStore((s) => s.lastBallotResult);
  const proposeBallotInitiativeAction = useStatecraftStore((s) => s.proposeBallotInitiativeAction);
  const resolveBallotInitiativeAction = useStatecraftStore((s) => s.resolveBallotInitiativeAction);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [economic, setEconomic] = useState(0);
  const [social, setSocial] = useState(0);
  const [budgetImpact, setBudgetImpact] = useState(0);

  if (!game) return null;

  const initiatives = game.ballotInitiatives;
  const active = initiatives.filter((i) => i.status === 'active');
  const resolved = initiatives.filter((i) => i.status !== 'active');

  function submit() {
    if (!title.trim()) return;
    proposeBallotInitiativeAction(title, description, { economic, social }, budgetImpact);
    setTitle('');
    setDescription('');
    setEconomic(0);
    setSocial(0);
    setBudgetImpact(0);
    setOpen(false);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Ballot Initiatives</h2>
        <span className="muted">Put an issue directly to the public, bypassing the legislature</span>
      </div>

      {!open && (
        <button className="ghost-button" onClick={() => setOpen(true)}>
          + Propose Ballot Initiative
        </button>
      )}

      {open && (
        <div className="custom-bill-form">
          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. National Term Limits Amendment" />
          </label>
          <label>
            Description
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the 'yes' side stands for" />
          </label>
          <label>
            Economic Stance ({economic})
            <input type="range" min={-100} max={100} value={economic} onChange={(e) => setEconomic(Number(e.target.value))} />
          </label>
          <label>
            Social Stance ({social})
            <input type="range" min={-100} max={100} value={social} onChange={(e) => setSocial(Number(e.target.value))} />
          </label>
          <label>
            Budget Impact
            <input type="number" value={budgetImpact} onChange={(e) => setBudgetImpact(Number(e.target.value) || 0)} />
          </label>
          <div className="row-actions">
            <button onClick={submit}>Propose</button>
            <button className="ghost-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {active.length === 0 && resolved.length === 0 && <p className="muted">No ballot initiatives yet.</p>}

      {active.length > 0 && (
        <ul className="scandal-list">
          {active.map((initiative) => (
            <li key={initiative.id} className="scandal-item status-unresolved">
              <span style={{ flex: 1 }}>
                <strong>{initiative.title}</strong>
                <div className="muted">{initiative.description}</div>
              </span>
              <button onClick={() => resolveBallotInitiativeAction(initiative.id)}>Put to Vote</button>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <ul className="scandal-list">
          {resolved.map((initiative) => (
            <li key={initiative.id} className={`scandal-item status-${initiative.status === 'passed' ? 'resolved' : 'lost'}`}>
              <span style={{ flex: 1 }}>
                <strong>{initiative.title}</strong> —{' '}
                {initiative.status === 'passed' ? 'PASSED' : 'FAILED'}
                {initiative.yesShare !== undefined && (
                  <span className="muted"> ({(initiative.yesShare * 100).toFixed(0)}% yes)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {lastBallotResult && (
        <p className={lastBallotResult.passed ? 'result-pass' : 'result-fail'}>
          Referendum {lastBallotResult.passed ? 'passed' : 'failed'} — {(lastBallotResult.yesShare * 100).toFixed(0)}% voted yes.
        </p>
      )}
    </section>
  );
}
