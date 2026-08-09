import { useState } from 'react';
import type { CustomNationInput, Difficulty, ElectoralSystem, IdeologyPosition, RegimeType } from '../../engine';
import { useStatecraftStore } from '../store';

const REGIME_LABELS: Record<RegimeType, string> = {
  parliamentary: 'Parliamentary',
  presidential: 'Presidential',
  'semi-presidential': 'Semi-Presidential',
};

const ELECTORAL_SYSTEM_LABELS: Record<ElectoralSystem, string> = {
  FPTP: 'First Past the Post',
  PR_DHONDT: "Proportional (D'Hondt)",
};

interface PartyDraft {
  name: string;
  ideology: IdeologyPosition;
}

function emptyParty(n: number): PartyDraft {
  return { name: `Party ${n}`, ideology: { economic: 0, social: 0 } };
}

export function NationBuilderPanel({ onCreated }: { onCreated: () => void }) {
  const newGameFromCustomNation = useStatecraftStore((s) => s.newGameFromCustomNation);

  const [expanded, setExpanded] = useState(false);
  const [countryName, setCountryName] = useState('');
  const [regimeType, setRegimeType] = useState<RegimeType>('parliamentary');
  const [electoralSystem, setElectoralSystem] = useState<ElectoralSystem>('FPTP');
  const [totalSeats, setTotalSeats] = useState(40);
  const [prThreshold, setPrThreshold] = useState(0.05);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [parties, setParties] = useState<PartyDraft[]>([emptyParty(1), emptyParty(2)]);
  const [playerPartyIndex, setPlayerPartyIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  if (!expanded) {
    return (
      <div className="bill-actions">
        <button onClick={() => setExpanded(true)}>Build a Custom Nation</button>
      </div>
    );
  }

  const updateParty = (index: number, patch: Partial<PartyDraft>) => {
    setParties((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addParty = () => setParties((prev) => [...prev, emptyParty(prev.length + 1)]);
  const removeParty = (index: number) => {
    setParties((prev) => prev.filter((_, i) => i !== index));
    setPlayerPartyIndex((prev) => Math.min(prev, parties.length - 2));
  };

  const handleCreate = () => {
    const input: CustomNationInput = {
      countryName,
      regimeType,
      electoralSystem,
      totalSeats,
      prThreshold,
      parties,
    };
    const validationErrors = newGameFromCustomNation(input, playerPartyIndex, difficulty);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }
    onCreated();
  };

  return (
    <section className="nation-detail">
      <h3>Build a Custom Nation</h3>
      <div className="custom-bill-form">
        <label>
          Nation Name
          <input type="text" value={countryName} onChange={(e) => setCountryName(e.target.value)} placeholder="The Republic of..." />
        </label>
        <label>
          Regime Type
          <select value={regimeType} onChange={(e) => setRegimeType(e.target.value as RegimeType)}>
            {(Object.keys(REGIME_LABELS) as RegimeType[]).map((r) => (
              <option key={r} value={r}>
                {REGIME_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Electoral System
          <select value={electoralSystem} onChange={(e) => setElectoralSystem(e.target.value as ElectoralSystem)}>
            {(Object.keys(ELECTORAL_SYSTEM_LABELS) as ElectoralSystem[]).map((s) => (
              <option key={s} value={s}>
                {ELECTORAL_SYSTEM_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Legislature Size
          <input type="number" min={parties.length} max={1000} value={totalSeats} onChange={(e) => setTotalSeats(Number(e.target.value) || 0)} />
        </label>
        {electoralSystem === 'PR_DHONDT' && (
          <label>
            PR Threshold ({(prThreshold * 100).toFixed(0)}%)
            <input type="range" min={0} max={0.2} step={0.01} value={prThreshold} onChange={(e) => setPrThreshold(Number(e.target.value))} />
          </label>
        )}
        <label>
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="standard">Standard</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <h4 className="subheading">Parties</h4>
      <ul className="scandal-list">
        {parties.map((party, i) => (
          <li key={i} className="scandal-item">
            <span style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={party.name}
                onChange={(e) => updateParty(i, { name: e.target.value })}
                style={{ maxWidth: '160px' }}
              />
              <label className="muted" style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                Econ
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={party.ideology.economic}
                  onChange={(e) => updateParty(i, { ideology: { ...party.ideology, economic: Number(e.target.value) } })}
                />
              </label>
              <label className="muted" style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                Social
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={party.ideology.social}
                  onChange={(e) => updateParty(i, { ideology: { ...party.ideology, social: Number(e.target.value) } })}
                />
              </label>
              <label className="muted" style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <input type="radio" name="player-party" checked={playerPartyIndex === i} onChange={() => setPlayerPartyIndex(i)} />
                Play as this party
              </label>
            </span>
            {parties.length > 2 && (
              <button className="danger-button" onClick={() => removeParty(i)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="bill-actions">
        <button onClick={addParty}>Add Party</button>
      </div>

      {errors.length > 0 && (
        <ul>
          {errors.map((e, i) => (
            <li key={i} className="result-fail">
              {e}
            </li>
          ))}
        </ul>
      )}

      <div className="bill-actions">
        <button onClick={handleCreate}>Found This Nation</button>
        <button onClick={() => setExpanded(false)}>Cancel</button>
      </div>
    </section>
  );
}
