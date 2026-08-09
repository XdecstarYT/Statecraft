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
