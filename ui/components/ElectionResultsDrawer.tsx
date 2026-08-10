import { useStatecraftStore } from '../store';

/** Turnout + per-party vote share/seat-delta breakdown for the most recent election — the detail view the compact seat table in ElectionPanel doesn't show. */
export function ElectionResultsDrawer() {
  const game = useStatecraftStore((s) => s.game);
  const lastElection = useStatecraftStore((s) => s.lastElection);
  const previousSeats = useStatecraftStore((s) => s.lastElectionPreviousSeats);

  if (!game || !lastElection) return null;

  const votesByParty: Record<string, number> = {};
  const districtsWonByParty: Record<string, number> = {};

  if (lastElection.districtResults) {
    for (const district of lastElection.districtResults) {
      let winnerId: string | null = null;
      let winnerVotes = -1;
      for (const [partyId, votes] of Object.entries(district.votesByParty)) {
        votesByParty[partyId] = (votesByParty[partyId] ?? 0) + votes;
        if (votes > winnerVotes) {
          winnerVotes = votes;
          winnerId = partyId;
        }
      }
      if (winnerId) districtsWonByParty[winnerId] = (districtsWonByParty[winnerId] ?? 0) + 1;
    }
  } else if (lastElection.nationalVotes) {
    for (const { partyId, votes } of lastElection.nationalVotes) {
      votesByParty[partyId] = votes;
    }
  }

  const turnout = Object.values(votesByParty).reduce((a, b) => a + b, 0);
  const rows = game.parties
    .map((party) => {
      const votes = votesByParty[party.id] ?? 0;
      const seats = lastElection.seatsWon[party.id] ?? 0;
      const before = previousSeats?.[party.id] ?? seats;
      return {
        party,
        votes,
        share: turnout > 0 ? (votes / turnout) * 100 : 0,
        seats,
        delta: seats - before,
        districtsWon: districtsWonByParty[party.id] ?? 0,
      };
    })
    .sort((a, b) => b.seats - a.seats);

  return (
    <section className="panel election-results-drawer">
      <div className="panel-header">
        <h2>Election Results</h2>
        <span className="muted">
          {lastElection.system === 'FPTP' ? 'First-past-the-post' : 'Party-list PR (D’Hondt)'} · turnout{' '}
          {turnout.toLocaleString()}
        </span>
      </div>
      <div className="whip-table-wrap">
        <table className="whip-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Votes</th>
              <th>Share</th>
              {lastElection.districtResults && <th>Districts</th>}
              <th>Seats</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.party.id}>
                <td>{row.party.name}</td>
                <td>{row.votes.toLocaleString()}</td>
                <td>{row.share.toFixed(1)}%</td>
                {lastElection.districtResults && <td>{row.districtsWon}</td>}
                <td>{row.seats}</td>
                <td className={row.delta > 0 ? 'result-pass' : row.delta < 0 ? 'result-fail' : 'muted'}>
                  {row.delta > 0 ? `+${row.delta}` : row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
