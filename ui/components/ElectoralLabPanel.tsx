import { useStatecraftStore, type LabResult } from '../store';

const SYSTEMS: LabResult['system'][] = ['STV', 'MMP', 'RUNOFF', 'PRIMARY'];

const SYSTEM_LABELS: Record<LabResult['system'], string> = {
  STV: 'Single Transferable Vote',
  MMP: 'Mixed-Member Proportional',
  RUNOFF: 'Two-Round Runoff',
  PRIMARY: 'Party Primary',
};

export function ElectoralLabPanel() {
  const game = useStatecraftStore((s) => s.game);
  const labResult = useStatecraftStore((s) => s.labResult);
  const runElectoralLab = useStatecraftStore((s) => s.runElectoralLab);

  if (!game) return null;

  const partyName = (id: string) => game.parties.find((p) => p.id === id)?.name ?? id;
  const politicianName = (id: string) => game.politicians.find((p) => p.id === id)?.name ?? id;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Electoral Systems Lab</h2>
      </div>
      <p className="muted">
        Run a demo election against the current parties using each system's real seat/winner math —
        independent of the National Assembly's actual seats.
      </p>

      <div className="bill-actions">
        {SYSTEMS.map((system) => (
          <button key={system} onClick={() => runElectoralLab(system)}>
            Run {SYSTEM_LABELS[system]}
          </button>
        ))}
      </div>

      {!labResult && <p className="muted">No lab result yet.</p>}

      {labResult?.system === 'STV' && (
        <div>
          <p className="whip-summary">
            Droop quota: {labResult.quota} — {labResult.seats} seats
          </p>
          <ol>
            {labResult.elected.map((id) => (
              <li key={id}>{partyName(id)}</li>
            ))}
          </ol>
        </div>
      )}

      {labResult?.system === 'MMP' && (
        <div className="whip-table-wrap">
          <table className="whip-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Constituency</th>
                <th>List</th>
                <th>Overhang</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(labResult.result.totalSeatsByParty).map((id) => (
                <tr key={id}>
                  <td>{partyName(id)}</td>
                  <td>{labResult.result.constituencySeats[id] ?? 0}</td>
                  <td>{labResult.result.listSeats[id] ?? 0}</td>
                  <td>{labResult.result.overhangSeats[id] ?? 0}</td>
                  <td>{labResult.result.totalSeatsByParty[id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Legislature size: {labResult.result.totalSeatsInLegislature}</p>
        </div>
      )}

      {labResult?.system === 'RUNOFF' && (
        <div>
          <p className="whip-summary">
            {labResult.wonOutright
              ? `${partyName(labResult.wonOutright)} won outright in the first round.`
              : `No majority in round 1 — runoff between the top two.`}
          </p>
          <table className="whip-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Round 1</th>
                {labResult.secondRound && <th>Round 2</th>}
              </tr>
            </thead>
            <tbody>
              {labResult.firstRound.map((v) => {
                const round2 = labResult.secondRound?.find((r) => r.partyId === v.partyId);
                return (
                  <tr key={v.partyId}>
                    <td>{partyName(v.partyId)}</td>
                    <td>{v.votes.toLocaleString()}</td>
                    {labResult.secondRound && <td>{round2 ? round2.votes.toLocaleString() : '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="whip-summary">Winner: {partyName(labResult.winner)}</p>
        </div>
      )}

      {labResult?.system === 'PRIMARY' && (
        <div>
          <p className="whip-summary">Primary among {partyName(labResult.partyId)} candidates:</p>
          <table className="whip-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {labResult.votes.map((v) => (
                <tr key={v.partyId}>
                  <td>{politicianName(v.partyId)}</td>
                  <td>{v.votes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="whip-summary">Winner: {politicianName(labResult.winner)}</p>
        </div>
      )}
    </section>
  );
}
