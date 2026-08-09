import { useState } from 'react';
import { pollWhipCount, type Bill } from '../../engine';
import { useStatecraftStore } from '../store';

export function BillPanel() {
  const game = useStatecraftStore((s) => s.game);
  const proposeNewBill = useStatecraftStore((s) => s.proposeNewBill);
  const lastFloorResult = useStatecraftStore((s) => s.lastFloorResult);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  if (!game) return null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Legislation</h2>
        <button onClick={proposeNewBill}>Draft New Bill</button>
      </div>

      {lastFloorResult && (
        <p className={lastFloorResult.passed ? 'result-pass' : 'result-fail'}>
          "{lastFloorResult.billTitle}" {lastFloorResult.passed ? 'PASSED' : 'FAILED'} — {lastFloorResult.yes} Yes / {lastFloorResult.no} No
        </p>
      )}

      {game.bills.length === 0 && <p className="muted">No bills yet. Draft one to get started.</p>}

      <ul className="bill-list">
        {game.bills.map((bill) => (
          <BillRow
            key={bill.id}
            bill={bill}
            expanded={expandedBillId === bill.id}
            onToggle={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function BillRow({
  bill,
  expanded,
  onToggle,
}: {
  bill: Bill;
  expanded: boolean;
  onToggle: () => void;
}) {
  const game = useStatecraftStore((s) => s.game);
  const sendToCommittee = useStatecraftStore((s) => s.sendToCommittee);
  const sendToFloor = useStatecraftStore((s) => s.sendToFloor);
  const setStance = useStatecraftStore((s) => s.setStance);
  const holdFloorVote = useStatecraftStore((s) => s.holdFloorVote);
  const nudgeRelationship = useStatecraftStore((s) => s.nudgeRelationship);
  const addFavor = useStatecraftStore((s) => s.addFavor);

  if (!game) return null;

  const sponsor = game.politicians.find((p) => p.id === bill.sponsorId);
  const isPlayerBill = sponsor?.isPlayer ?? false;

  const projections = expanded
    ? pollWhipCount(bill, game.politicians, game.relationships, game.favorBank)
    : [];

  const yesCount = projections.filter((p) => p.stance === 'yes').length;
  const noCount = projections.filter((p) => p.stance === 'no').length;
  const undecidedCount = projections.filter((p) => p.stance === 'undecided').length;

  return (
    <li className="bill-row">
      <div className="bill-summary" onClick={onToggle}>
        <span className="bill-title">
          {bill.title}
          {!isPlayerBill && <span className="muted"> — sponsored by {sponsor?.name ?? 'Unknown'}</span>}
        </span>
        <span className={`bill-status status-${bill.status}`}>{bill.status}</span>
      </div>

      {expanded && (
        <div className="bill-detail">
          <ul className="provision-list">
            {bill.provisions.map((p) => (
              <li key={p.id}>
                {p.description} <span className="muted">({p.budgetImpact >= 0 ? '+' : ''}{p.budgetImpact})</span>
              </li>
            ))}
          </ul>

          {isPlayerBill ? (
            <div className="bill-actions">
              {bill.status === 'drafting' && (
                <button onClick={() => sendToCommittee(bill.id)}>Send to Committee</button>
              )}
              {bill.status === 'committee' && (
                <button onClick={() => sendToFloor(bill.id)}>Send to Floor</button>
              )}
              {bill.status === 'floor' && (
                <button onClick={() => holdFloorVote(bill.id)}>Hold Floor Vote</button>
              )}
            </div>
          ) : (
            (bill.status === 'drafting' || bill.status === 'committee' || bill.status === 'floor') && (
              <p className="muted">
                Rival-sponsored — progresses automatically each week. You can still whip against it below.
              </p>
            )
          )}

          <p className="whip-summary">
            Whip count: {yesCount} Yes / {noCount} No / {undecidedCount} Undecided
          </p>

          <div className="whip-table-wrap">
            <table className="whip-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Party</th>
                  <th>Stance</th>
                  <th>Projected Yes %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((proj) => {
                  const politician = game.politicians.find((p) => p.id === proj.politicianId)!;
                  const party = game.parties.find((p) => p.id === politician.partyId);
                  return (
                    <tr key={proj.politicianId}>
                      <td>{politician.name}</td>
                      <td>{party?.name ?? politician.partyId}</td>
                      <td className={`stance-${proj.stance}`}>{proj.stance}</td>
                      <td>{(proj.projectedProbability * 100).toFixed(0)}%</td>
                      <td className="row-actions">
                        <button onClick={() => setStance(bill.id, proj.politicianId, 'yes')}>Lock Yes</button>
                        <button onClick={() => setStance(bill.id, proj.politicianId, 'no')}>Lock No</button>
                        <button onClick={() => nudgeRelationship(proj.politicianId, 10)}>+Relationship</button>
                        <button onClick={() => addFavor(proj.politicianId)}>+Favor</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </li>
  );
}
