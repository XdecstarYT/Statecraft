import { useState } from 'react';
import { describeAmendmentChange, type AmendmentChange, type AmendmentChangeType, type Country, type ElectoralSystem, type HouseRules } from '../../engine';
import { useStatecraftStore } from '../store';

const HOUSE_RULE_OPTIONS: { value: keyof HouseRules; label: string }[] = [
  { value: 'disableTermLimits', label: 'No Term Limits' },
  { value: 'doubleEventFrequency', label: 'Double Crisis Frequency' },
  { value: 'noCorruption', label: 'No Corruption' },
];

/** Propose and vote on real amendments to the country's own founding rules. See engine/systems/constitution.ts. */
export function ConstitutionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const proposeAmendmentAction = useStatecraftStore((s) => s.proposeAmendmentAction);
  const voteOnAmendmentAction = useStatecraftStore((s) => s.voteOnAmendmentAction);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<AmendmentChangeType>('electoral_system');
  const [electoralSystem, setElectoralSystem] = useState<ElectoralSystem>('FPTP');
  const [termLengthTurns, setTermLengthTurns] = useState(192);
  const [houseRule, setHouseRule] = useState<keyof HouseRules>('disableTermLimits');
  const [houseRuleValue, setHouseRuleValue] = useState(true);
  const [regimeType, setRegimeType] = useState<Country['regimeType']>('parliamentary');

  if (!game) return null;

  const proposed = game.constitutionalAmendments.filter((a) => a.status === 'proposed');
  const resolved = [...game.constitutionalAmendments.filter((a) => a.status !== 'proposed')].reverse().slice(0, 5);

  const buildChange = (): AmendmentChange => {
    switch (changeType) {
      case 'electoral_system':
        return { type: 'electoral_system', electoralSystem };
      case 'term_length':
        return { type: 'term_length', termLengthTurns };
      case 'house_rule':
        return { type: 'house_rule', houseRule, houseRuleValue };
      case 'regime_type':
        return { type: 'regime_type', regimeType };
      default:
        return { type: 'electoral_system', electoralSystem };
    }
  };

  const handlePropose = () => {
    proposeAmendmentAction(title, description, buildChange());
    setTitle('');
    setDescription('');
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Constitutional Reform</h2>
        <span className="muted">Needs a two-thirds supermajority to pass</span>
      </div>
      <p className="muted">
        Propose a real amendment to the country's own founding rules — electoral system, legislative term
        length, a house rule, or the regime type itself. Passing one takes a genuine two-thirds
        supermajority, not a simple majority.
      </p>

      <div className="custom-bill-form">
        <label>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Electoral Reform Act" />
        </label>
        <label>
          Description
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this amendment does" />
        </label>
        <label>
          Change Type
          <select value={changeType} onChange={(e) => setChangeType(e.target.value as AmendmentChangeType)}>
            <option value="electoral_system">Electoral System</option>
            <option value="term_length">Legislative Term Length</option>
            <option value="house_rule">House Rule</option>
            <option value="regime_type">Regime Type</option>
          </select>
        </label>

        {changeType === 'electoral_system' && (
          <label>
            New System
            <select value={electoralSystem} onChange={(e) => setElectoralSystem(e.target.value as ElectoralSystem)}>
              <option value="FPTP">First-Past-The-Post</option>
              <option value="PR_DHONDT">Party-List PR (D'Hondt)</option>
            </select>
          </label>
        )}

        {changeType === 'term_length' && (
          <label>
            New Term Length (weeks)
            <input
              type="number"
              min={24}
              max={480}
              value={termLengthTurns}
              onChange={(e) => setTermLengthTurns(Number(e.target.value))}
            />
          </label>
        )}

        {changeType === 'house_rule' && (
          <>
            <label>
              Rule
              <select value={houseRule} onChange={(e) => setHouseRule(e.target.value as keyof HouseRules)}>
                {HOUSE_RULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={houseRuleValue} onChange={(e) => setHouseRuleValue(e.target.checked)} />
              Enable
            </label>
          </>
        )}

        {changeType === 'regime_type' && (
          <label>
            New Regime
            <select value={regimeType} onChange={(e) => setRegimeType(e.target.value as Country['regimeType'])}>
              <option value="parliamentary">Parliamentary</option>
              <option value="presidential">Presidential</option>
              <option value="semi-presidential">Semi-Presidential</option>
            </select>
          </label>
        )}

        <div className="row-actions">
          <button onClick={handlePropose} disabled={!title.trim()}>
            Propose Amendment
          </button>
        </div>
      </div>

      {proposed.length > 0 && (
        <>
          <h3>Awaiting a Vote</h3>
          <ul className="scandal-list">
            {proposed.map((amendment) => (
              <li key={amendment.id} className="scandal-item">
                <span style={{ flex: 1 }}>
                  <strong>{amendment.title}</strong> — {describeAmendmentChange(amendment.change)}
                </span>
                <span className="row-actions">
                  <button onClick={() => voteOnAmendmentAction(amendment.id)}>Hold Vote</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <h3>Recent Amendments</h3>
          <ul className="coverage-list">
            {resolved.map((amendment) => (
              <li key={amendment.id} className={`coverage-item frame-${amendment.status === 'passed' ? 'favorable' : 'critical'}`}>
                <span className="coverage-outlet">{amendment.title}</span>
                <span className={`frame-badge frame-badge-${amendment.status === 'passed' ? 'favorable' : 'critical'}`}>
                  {amendment.status}
                </span>
                <p className="coverage-headline">
                  {describeAmendmentChange(amendment.change)} — {amendment.votesFor ?? 0}/
                  {(amendment.votesFor ?? 0) + (amendment.votesAgainst ?? 0)} in favor
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
