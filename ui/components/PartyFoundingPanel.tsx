import { useState } from 'react';
import { useStatecraftStore } from '../store';

/** Slugifies a party name into a stable, unique-enough id for this game's party roster. */
function slugify(name: string, existingIds: string[]): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'new-party';
  let id = base;
  let suffix = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

export function PartyFoundingPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastFoundPartyResult = useStatecraftStore((s) => s.lastFoundPartyResult);
  const foundNewPartyAction = useStatecraftStore((s) => s.foundNewPartyAction);

  const [name, setName] = useState('');
  const [economic, setEconomic] = useState(0);
  const [social, setSocial] = useState(0);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const currentParty = game.parties.find((p) => p.id === player?.partyId);

  const handleFound = () => {
    const id = slugify(name, game.parties.map((p) => p.id));
    foundNewPartyAction(id, name, { economic, social });
    setName('');
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Found a New Party</h2>
        {currentParty && <span className="muted">Currently with {currentParty.name}</span>}
      </div>
      <p className="muted">
        Break away and found your own party around your own ideology. Every other member of your current
        party independently decides whether to follow — only members genuinely closer to your new
        position than to the old one will ever defect, and a warmer relationship with them helps.
      </p>

      <div className="custom-bill-form">
        <label>
          Party Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="The New Way" />
        </label>
        <label>
          Economic Position ({economic})
          <input
            type="range"
            min={-100}
            max={100}
            value={economic}
            onChange={(e) => setEconomic(Number(e.target.value))}
          />
        </label>
        <label>
          Social Position ({social})
          <input type="range" min={-100} max={100} value={social} onChange={(e) => setSocial(Number(e.target.value))} />
        </label>
        <div className="row-actions">
          <button onClick={handleFound} disabled={!name.trim()}>
            Found Party
          </button>
        </div>
      </div>

      {lastFoundPartyResult && (
        <p className="result-pass">
          {lastFoundPartyResult.newParty.name} founded with {lastFoundPartyResult.newParty.seats} seat
          {lastFoundPartyResult.newParty.seats === 1 ? '' : 's'}
          {lastFoundPartyResult.defectorIds.length > 0 &&
            ` — ${lastFoundPartyResult.defectorIds.length} colleague${lastFoundPartyResult.defectorIds.length === 1 ? '' : 's'} followed you.`}
        </p>
      )}

      <MergeAndRebrandSection />
    </section>
  );
}

function MergeAndRebrandSection() {
  const game = useStatecraftStore((s) => s.game);
  const mergePartiesAction = useStatecraftStore((s) => s.mergePartiesAction);
  const rebrandPartyAction = useStatecraftStore((s) => s.rebrandPartyAction);

  const [absorbedId, setAbsorbedId] = useState<string | null>(null);
  const [survivingId, setSurvivingId] = useState<string | null>(null);
  const [rebrandTargetId, setRebrandTargetId] = useState<string | null>(null);
  const [rebrandName, setRebrandName] = useState('');

  if (!game) return null;
  if (game.parties.length < 2) return null;

  const absorbed = absorbedId ?? game.parties[0]?.id;
  const surviving = survivingId ?? game.parties[1]?.id;
  const rebrandTarget = rebrandTargetId ?? game.parties[0]?.id;

  return (
    <>
      <p className="subheading">Merge Parties</p>
      <div className="custom-bill-form">
        <label>
          Absorbed Party
          <select value={absorbed} onChange={(e) => setAbsorbedId(e.target.value)}>
            {game.parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.seats} seats)
              </option>
            ))}
          </select>
        </label>
        <label>
          Surviving Party
          <select value={surviving} onChange={(e) => setSurvivingId(e.target.value)}>
            {game.parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.seats} seats)
              </option>
            ))}
          </select>
        </label>
        <div className="row-actions">
          <button
            disabled={absorbed === surviving}
            onClick={() => mergePartiesAction(absorbed, surviving)}
          >
            Merge
          </button>
        </div>
      </div>

      <p className="subheading">Rebrand a Party</p>
      <div className="custom-bill-form">
        <label>
          Party
          <select value={rebrandTarget} onChange={(e) => setRebrandTargetId(e.target.value)}>
            {game.parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          New Name
          <input type="text" value={rebrandName} onChange={(e) => setRebrandName(e.target.value)} placeholder="New party name" />
        </label>
        <div className="row-actions">
          <button
            disabled={!rebrandName.trim()}
            onClick={() => {
              rebrandPartyAction(rebrandTarget, rebrandName);
              setRebrandName('');
            }}
          >
            Rebrand
          </button>
        </div>
      </div>
    </>
  );
}
