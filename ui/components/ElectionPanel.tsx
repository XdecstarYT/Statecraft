import { useState } from 'react';
import { CABINET_PORTFOLIOS, computeRunningTally, getProvinces, type CabinetPortfolio } from '../../engine';
import { useStatecraftStore } from '../store';

const PORTFOLIO_LABELS: Record<CabinetPortfolio, string> = {
  finance: 'Finance',
  defense: 'Defense',
  foreignAffairs: 'Foreign Affairs',
  justice: 'Justice',
};

export function ElectionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastElection = useStatecraftStore((s) => s.lastElection);
  const runElection = useStatecraftStore((s) => s.runElection);
  const startElectionNightAction = useStatecraftStore((s) => s.startElectionNightAction);
  const reportNextProvinceAction = useStatecraftStore((s) => s.reportNextProvinceAction);
  const concludeElectionNightAction = useStatecraftStore((s) => s.concludeElectionNightAction);
  const dismissElectionNightAction = useStatecraftStore((s) => s.dismissElectionNightAction);
  const appointToCabinetAction = useStatecraftStore((s) => s.appointToCabinetAction);
  const removeFromCabinetAction = useStatecraftStore((s) => s.removeFromCabinetAction);

  const [selectedAppointee, setSelectedAppointee] = useState<Record<string, string>>({});

  if (!game) return null;

  const night = game.electionNight;

  if (night) {
    const provinces = getProvinces(game.country);
    const tally = computeRunningTally(night, provinces);
    const tallyTotal = Object.values(tally).reduce((a, b) => a + b, 0);
    const winner = night.winnerPartyId ? game.parties.find((p) => p.id === night.winnerPartyId) : null;
    const tallyIsVotes = night.status === 'reporting' && night.system !== 'FPTP';

    return (
      <section className="panel">
        <div className="panel-header">
          <h2>Election Night</h2>
          {night.status === 'reporting' && (
            <span className="muted">
              {night.reportedProvinceIds.length}/{night.reportingOrder.length} provinces reporting
            </span>
          )}
        </div>

        <div className="nation-picker-wrap election-night-provinces">
          <ul className="nation-picker">
            {night.reportingOrder.map((id) => {
              const province = provinces.find((p) => p.id === id);
              const reported = night.reportedProvinceIds.includes(id);
              return (
                <li key={id} className="province-report-row">
                  <span className={`bill-status ${reported ? 'status-active' : 'status-floor'}`}>
                    {reported ? 'Reported' : 'Pending'}
                  </span>
                  <span>{province?.name ?? id}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <h4 className="subheading">
          {night.status === 'reporting' ? (tallyIsVotes ? 'Votes Counted So Far' : 'Seats Called So Far') : 'Final Seats'}
        </h4>
        <div className="whip-table-wrap">
          <table className="whip-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>{tallyIsVotes ? 'Votes' : 'Seats'}</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {game.parties.map((party) => (
                <tr key={party.id}>
                  <td>{party.name}</td>
                  <td>{tally[party.id] ?? 0}</td>
                  <td>{tallyTotal > 0 ? (((tally[party.id] ?? 0) / tallyTotal) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {night.status === 'reporting' && (
          <div className="bill-actions">
            <button onClick={reportNextProvinceAction}>Reveal Next Province</button>
          </div>
        )}

        {night.status === 'called' && winner && (
          <div className="nation-detail">
            <h3>{winner.name} Wins the Election</h3>
            <div className="bill-actions">
              <button onClick={concludeElectionNightAction}>Hear the Victory Speech</button>
            </div>
          </div>
        )}

        {night.status === 'concluded' && (
          <div className="nation-detail">
            <h3>{winner?.name ?? 'Unknown'} — Victory Speech</h3>
            <p className="muted">&ldquo;{night.victorySpeech}&rdquo;</p>
            <div className="bill-actions">
              <button onClick={dismissElectionNightAction}>Continue</button>
            </div>
          </div>
        )}
      </section>
    );
  }

  const totalSeats = game.parties.reduce((sum, p) => sum + p.seats, 0);
  const player = game.politicians.find((p) => p.isPlayer);
  const cabinetCandidates = game.politicians.filter((p) => p.partyId === player?.partyId);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{game.country.legislature.name}</h2>
        <div className="row-actions">
          <button onClick={runElection}>Run Election (Instant)</button>
          <button onClick={startElectionNightAction}>Start Election Night</button>
        </div>
      </div>

      {lastElection && (
        <p className="muted">
          Last election ({lastElection.system}) allocated {Object.values(lastElection.seatsWon).reduce((a, b) => a + b, 0)} seats.
        </p>
      )}

      <div className="whip-table-wrap">
        <table className="whip-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Ideology (Econ / Social)</th>
              <th>Seats</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {game.parties.map((party) => (
              <tr key={party.id}>
                <td>{party.name}</td>
                <td>
                  {party.ideology.economic.toFixed(0)} / {party.ideology.social.toFixed(0)}
                </td>
                <td>{party.seats}</td>
                <td>{totalSeats > 0 ? ((party.seats / totalSeats) * 100).toFixed(1) : '0.0'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="subheading">Government</h3>
      <GovernmentStatus />

      <h3 className="subheading">Cabinet</h3>
      {cabinetCandidates.length === 0 ? (
        <p className="muted">No party members available to appoint.</p>
      ) : (
        <div className="whip-table-wrap">
          <table className="whip-table">
            <thead>
              <tr>
                <th>Portfolio</th>
                <th>Minister</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {CABINET_PORTFOLIOS.map((portfolio) => {
                const appointment = game.cabinet.find((c) => c.portfolio === portfolio);
                const minister = appointment
                  ? game.politicians.find((p) => p.id === appointment.politicianId)
                  : null;
                const selected = selectedAppointee[portfolio] ?? cabinetCandidates[0]?.id ?? '';
                return (
                  <tr key={portfolio}>
                    <td>{PORTFOLIO_LABELS[portfolio]}</td>
                    <td>{minister ? minister.name : <span className="muted">Vacant</span>}</td>
                    <td className="row-actions">
                      <select
                        value={selected}
                        onChange={(e) =>
                          setSelectedAppointee((s) => ({ ...s, [portfolio]: e.target.value }))
                        }
                      >
                        {cabinetCandidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => appointToCabinetAction(portfolio, selected)}>Appoint</button>
                      {minister && (
                        <button onClick={() => removeFromCabinetAction(portfolio)}>Remove</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GovernmentStatus() {
  const game = useStatecraftStore((s) => s.game);
  const attemptImpeachmentAction = useStatecraftStore((s) => s.attemptImpeachmentAction);
  const lastImpeachmentOutcome = useStatecraftStore((s) => s.lastImpeachmentOutcome);
  if (!game) return null;

  const { coalition } = game;
  const player = game.politicians.find((p) => p.isPlayer);

  if (!coalition) {
    const majorityParty = game.parties.find((p) => p.seats > game.parties.reduce((sum, x) => sum + x.seats, 0) / 2);
    const headId = majorityParty ? game.partyLeaderId[majorityParty.id] : undefined;
    const head = headId ? game.politicians.find((p) => p.id === headId) : undefined;
    const terms = headId ? game.termsServed[headId] ?? 0 : 0;
    return (
      <div>
        <p className="muted">
          {majorityParty ? `${majorityParty.name} governs alone with an outright majority.` : 'No election has been held yet.'}
        </p>
        {head && (
          <ImpeachmentControls
            headId={head.id}
            headName={head.name}
            isPlayer={head.isPlayer}
            terms={terms}
            onImpeach={attemptImpeachmentAction}
            outcome={lastImpeachmentOutcome}
          />
        )}
      </div>
    );
  }

  const pm = game.politicians.find((p) => p.id === coalition.primeMinisterId);
  const memberNames = coalition.memberPartyIds
    .map((id) => game.parties.find((p) => p.id === id)?.name ?? id)
    .join(', ');
  const playerInCoalition = player ? coalition.memberPartyIds.includes(player.partyId) : false;
  const playerIsPm = player ? player.id === coalition.primeMinisterId : false;
  const terms = game.termsServed[coalition.primeMinisterId] ?? 0;

  return (
    <div className="billboard-slide">
      <span className={coalition.status === 'governing' ? 'result-pass' : 'result-fail'}>
        {coalition.status === 'governing' ? 'Coalition Governing' : 'Coalition Collapsed'}
      </span>
      <h3>
        {pm?.name ?? coalition.primeMinisterId} (Prime Minister)
        {playerIsPm && ' — that’s you'}
      </h3>
      <p className="muted">
        Coalition: {memberNames} — {coalition.seatsHeld}/{coalition.totalSeats} seats
        {playerInCoalition && !playerIsPm && ' — your party is in government'}
        {!playerInCoalition && ' — your party is in opposition'}
      </p>
      <p className="muted">
        Confidence vote: {coalition.confidenceVotesFor} for / {coalition.confidenceVotesAgainst} against
        {coalition.status === 'collapsed' && ' — a snap election is now due.'}
      </p>
      {pm && (
        <ImpeachmentControls
          headId={pm.id}
          headName={pm.name}
          isPlayer={pm.isPlayer}
          terms={terms}
          onImpeach={attemptImpeachmentAction}
          outcome={lastImpeachmentOutcome}
        />
      )}
    </div>
  );
}

function ImpeachmentControls({
  headId,
  headName,
  isPlayer,
  terms,
  onImpeach,
  outcome,
}: {
  headId: string;
  headName: string;
  isPlayer: boolean;
  terms: number;
  onImpeach: (id: string) => void;
  outcome: { removed: boolean; result: { votesFor: number; requiredCount: number; totalCount: number } } | null;
}) {
  return (
    <div className="row-actions">
      <span className="muted">
        {headName} has served {terms} term{terms === 1 ? '' : 's'} (limit 2)
      </span>
      {!isPlayer && (
        <button className="danger-button" onClick={() => onImpeach(headId)}>
          Move to Impeach
        </button>
      )}
      {outcome && (
        <span className={outcome.removed ? 'result-pass' : 'result-fail'}>
          {outcome.removed
            ? `Removed from office (${outcome.result.votesFor}/${outcome.result.totalCount}, needed ${outcome.result.requiredCount})`
            : `Impeachment failed (${outcome.result.votesFor}/${outcome.result.totalCount}, needed ${outcome.result.requiredCount})`}
        </span>
      )}
    </div>
  );
}
