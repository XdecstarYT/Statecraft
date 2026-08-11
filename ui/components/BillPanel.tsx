import { useState } from 'react';
import { computeFactionTerms, computeLobbyingPressure, pollWhipCount, type Bill, type BillCategory } from '../../engine';
import { useStatecraftStore } from '../store';

const CATEGORY_LABELS: Record<BillCategory, string> = {
  economic: 'Economic',
  healthcare: 'Healthcare',
  education: 'Education',
  welfare: 'Welfare',
  defense: 'Defense',
  environment: 'Environment',
  justice_safety: 'Justice & Safety',
  infrastructure: 'Infrastructure',
  research_technology: 'Research & Tech',
};

function CategoryBadge({ category }: { category?: BillCategory }) {
  if (!category) return null;
  return <span className={`bill-category-badge bill-category-${category}`}>{CATEGORY_LABELS[category]}</span>;
}

export function BillPanel() {
  const game = useStatecraftStore((s) => s.game);
  const proposeNewBill = useStatecraftStore((s) => s.proposeNewBill);
  const lastFloorResult = useStatecraftStore((s) => s.lastFloorResult);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [showLaws, setShowLaws] = useState(false);

  if (!game) return null;

  const pendingBills = game.bills.filter((b) => b.status !== 'passed');
  const laws = game.bills.filter((b) => b.status === 'passed');

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Legislation</h2>
        <button onClick={proposeNewBill}>Draft From Template</button>
      </div>

      {lastFloorResult && (
        <p className={lastFloorResult.passed ? 'result-pass' : 'result-fail'}>
          "{lastFloorResult.billTitle}" {lastFloorResult.passed ? 'PASSED' : 'FAILED'} — {lastFloorResult.yes} Yes / {lastFloorResult.no} No
        </p>
      )}

      <CustomBillForm />

      {pendingBills.length === 0 && <p className="muted">No bills yet. Draft one to get started.</p>}

      <ul className="bill-list">
        {pendingBills.map((bill) => (
          <BillRow
            key={bill.id}
            bill={bill}
            expanded={expandedBillId === bill.id}
            onToggle={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
          />
        ))}
      </ul>

      <div className="panel-header statute-book-header">
        <h3>Statute Book {laws.length > 0 && <span className="muted">({laws.length})</span>}</h3>
        {laws.length > 0 && (
          <button onClick={() => setShowLaws((v) => !v)}>{showLaws ? 'Hide' : 'Show'}</button>
        )}
      </div>
      {laws.length === 0 && <p className="muted">No laws enacted yet.</p>}
      {showLaws && laws.length > 0 && (
        <ul className="bill-list law-list">
          {laws.map((law) => {
            const sponsor = game.politicians.find((p) => p.id === law.sponsorId);
            return (
              <li key={law.id} className="bill-row law-row">
                <div className="bill-summary">
                  <span className="bill-title">
                    <span className="law-badge">LAW</span> {law.title}
                    <CategoryBadge category={law.category} />
                    <span className="muted"> — sponsored by {sponsor?.name ?? 'Unknown'}</span>
                  </span>
                </div>
                <ul className="provision-list">
                  {law.provisions.map((p) => (
                    <li key={p.id}>
                      {p.description} <span className="muted">({p.budgetImpact >= 0 ? '+' : ''}{p.budgetImpact})</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CustomBillForm() {
  const proposeCustomBill = useStatecraftStore((s) => s.proposeCustomBill);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BillCategory>('economic');
  const [provisions, setProvisions] = useState([{ description: '', budgetImpact: 0 }]);

  function reset() {
    setTitle('');
    setCategory('economic');
    setProvisions([{ description: '', budgetImpact: 0 }]);
    setOpen(false);
  }

  function updateProvision(index: number, field: 'description' | 'budgetImpact', value: string) {
    setProvisions((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, [field]: field === 'budgetImpact' ? Number(value) || 0 : value }
          : p
      )
    );
  }

  function removeProvision(index: number) {
    setProvisions((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    const valid = title.trim().length > 0 && provisions.some((p) => p.description.trim().length > 0);
    if (!valid) return;
    proposeCustomBill(title, category, provisions);
    reset();
  }

  if (!open) {
    return (
      <button className="ghost-button" onClick={() => setOpen(true)}>
        + Draft Custom Bill
      </button>
    );
  }

  return (
    <div className="custom-bill-form">
      <label>
        Bill Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. National Broadband Act"
        />
      </label>

      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as BillCategory)}>
          {(Object.keys(CATEGORY_LABELS) as BillCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <p className="muted category-hint">
        {category === 'economic'
          ? 'Only moves the budget and growth, like every bill does.'
          : `Net spending here also nudges ${CATEGORY_LABELS[category].toLowerCase()} outcomes directly — net cuts hurt them.`}
      </p>

      <div className="provision-rows">
        {provisions.map((p, i) => (
          <div className="provision-row" key={i}>
            <input
              type="text"
              value={p.description}
              onChange={(e) => updateProvision(i, 'description', e.target.value)}
              placeholder="Provision description"
            />
            <input
              type="number"
              value={p.budgetImpact}
              onChange={(e) => updateProvision(i, 'budgetImpact', e.target.value)}
              placeholder="Budget impact"
            />
            {provisions.length > 1 && (
              <button className="ghost-button" onClick={() => removeProvision(i)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="row-actions">
        <button
          className="ghost-button"
          onClick={() => setProvisions((prev) => [...prev, { description: '', budgetImpact: 0 }])}
        >
          + Add Provision
        </button>
        <button onClick={submit}>Propose Bill</button>
        <button className="ghost-button" onClick={reset}>
          Cancel
        </button>
      </div>
    </div>
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
  const addProvisionAction = useStatecraftStore((s) => s.addProvisionAction);
  const removeProvisionAction = useStatecraftStore((s) => s.removeProvisionAction);
  const invokeFilibusterAction = useStatecraftStore((s) => s.invokeFilibusterAction);
  const attemptClotureAction = useStatecraftStore((s) => s.attemptClotureAction);
  const lastClotureResult = useStatecraftStore((s) => s.lastClotureResult);
  const [newProvisionDesc, setNewProvisionDesc] = useState('');
  const [newProvisionImpact, setNewProvisionImpact] = useState(0);

  if (!game) return null;

  const sponsor = game.politicians.find((p) => p.id === bill.sponsorId);
  const isPlayerBill = sponsor?.isPlayer ?? false;

  const projections =
    expanded && sponsor
      ? pollWhipCount(
          bill,
          game.politicians,
          game.relationships,
          game.favorBank,
          undefined,
          computeLobbyingPressure(game.interestGroups, bill, sponsor),
          computeFactionTerms(game.politicians, sponsor, game.parties, game.relationships, game.favorBank, game.factionLeaderId)
        )
      : [];

  const yesCount = projections.filter((p) => p.stance === 'yes').length;
  const noCount = projections.filter((p) => p.stance === 'no').length;
  const undecidedCount = projections.filter((p) => p.stance === 'undecided').length;

  return (
    <li className="bill-row">
      <div className="bill-summary" onClick={onToggle}>
        <span className="bill-title">
          {bill.title}
          <CategoryBadge category={bill.category} />
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
                {isPlayerBill && (bill.status === 'drafting' || bill.status === 'committee') && (
                  <button className="ghost-button" onClick={() => removeProvisionAction(bill.id, p.id)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isPlayerBill && (bill.status === 'drafting' || bill.status === 'committee') && (
            <div className="provision-row">
              <input
                type="text"
                value={newProvisionDesc}
                onChange={(e) => setNewProvisionDesc(e.target.value)}
                placeholder="Amendment: new provision"
              />
              <input
                type="number"
                value={newProvisionImpact}
                onChange={(e) => setNewProvisionImpact(Number(e.target.value) || 0)}
                placeholder="Budget impact"
              />
              <button
                className="ghost-button"
                onClick={() => {
                  if (!newProvisionDesc.trim()) return;
                  addProvisionAction(bill.id, newProvisionDesc, newProvisionImpact);
                  setNewProvisionDesc('');
                  setNewProvisionImpact(0);
                }}
              >
                + Amend
              </button>
            </div>
          )}

          {isPlayerBill ? (
            <div className="bill-actions">
              {bill.status === 'drafting' && (
                <button onClick={() => sendToCommittee(bill.id)}>Send to Committee</button>
              )}
              {bill.status === 'committee' && (
                <button onClick={() => sendToFloor(bill.id)}>Send to Floor</button>
              )}
              {bill.status === 'floor' && !bill.filibustered && (
                <button onClick={() => holdFloorVote(bill.id)}>Hold Floor Vote</button>
              )}
              {bill.status === 'floor' && bill.filibustered && (
                <button onClick={() => attemptClotureAction(bill.id)}>Attempt Cloture</button>
              )}
            </div>
          ) : (
            (bill.status === 'drafting' || bill.status === 'committee' || bill.status === 'floor') && (
              <p className="muted">
                Rival-sponsored — progresses automatically each week. You can still whip against it below.
              </p>
            )
          )}

          {bill.status === 'floor' && !bill.filibustered && (
            <button className="ghost-button" onClick={() => invokeFilibusterAction(bill.id)}>
              Filibuster
            </button>
          )}
          {bill.status === 'floor' && bill.filibustered && (
            <p className="muted">Filibustered — a floor vote cannot proceed until cloture succeeds.</p>
          )}
          {lastClotureResult && lastClotureResult.billId === bill.id && (
            <p className={lastClotureResult.succeeded ? 'result-pass' : 'result-fail'}>
              Cloture {lastClotureResult.succeeded ? 'succeeded' : 'failed'} — {lastClotureResult.yesCount}/
              {lastClotureResult.totalCount} (needed {lastClotureResult.requiredCount})
            </p>
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
