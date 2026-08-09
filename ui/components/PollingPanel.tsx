import { useState } from 'react';
import { useStatecraftStore } from '../store';

export function PollingPanel() {
  const game = useStatecraftStore((s) => s.game);
  const commissionApprovalPollAction = useStatecraftStore((s) => s.commissionApprovalPollAction);
  const commissionPartyPollAction = useStatecraftStore((s) => s.commissionPartyPollAction);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  if (!game) return null;

  const firms = game.pollingFirms;
  const firmId = selectedFirmId ?? firms[0]?.id;
  const partyId = selectedPartyId ?? game.parties[0]?.id;
  const player = game.politicians.find((p) => p.isPlayer);

  const recentPolls = [...game.polls].reverse().slice(0, 10);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Polling</h2>
        <span className="muted">Real margin-of-error sampling — not the true number</span>
      </div>

      <div className="custom-bill-form">
        <label>
          Firm
          <select value={firmId} onChange={(e) => setSelectedFirmId(e.target.value)}>
            {firms.map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firm.name} (n={firm.sampleSize})
              </option>
            ))}
          </select>
        </label>
        <div className="row-actions">
          <button onClick={() => firmId && commissionApprovalPollAction(firmId)}>Poll My Approval</button>
        </div>
        <label>
          Party
          <select value={partyId} onChange={(e) => setSelectedPartyId(e.target.value)}>
            {game.parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row-actions">
          <button onClick={() => firmId && partyId && commissionPartyPollAction(firmId, partyId)}>Poll Party Support</button>
        </div>
      </div>

      {recentPolls.length === 0 && <p className="muted">No polls commissioned yet.</p>}

      <ul className="scandal-list">
        {recentPolls.map((poll) => {
          const firm = firms.find((f) => f.id === poll.firmId);
          const label = poll.kind === 'approval' && poll.subjectId === player?.id ? 'You' : poll.subjectLabel;
          return (
            <li key={poll.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{firm?.name ?? poll.firmId}</strong>
                <span className="muted"> (week {poll.turn})</span> — {label}:{' '}
                <strong>{poll.sampledValue.toFixed(1)}%</strong>{' '}
                <span className="muted">± {poll.marginOfError.toFixed(1)} pts</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
