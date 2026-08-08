import { useStatecraftStore } from '../store';

export function ElectionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastElection = useStatecraftStore((s) => s.lastElection);
  const runElection = useStatecraftStore((s) => s.runElection);

  if (!game) return null;

  const totalSeats = game.parties.reduce((sum, p) => sum + p.seats, 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{game.country.legislature.name}</h2>
        <button onClick={runElection}>
          Run Election ({game.country.legislature.electoralSystem === 'FPTP' ? 'FPTP' : "D'Hondt PR"})
        </button>
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
    </section>
  );
}
