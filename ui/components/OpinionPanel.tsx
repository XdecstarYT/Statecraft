import { useStatecraftStore } from '../store';

export function OpinionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const giveSpeech = useStatecraftStore((s) => s.giveSpeech);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Public Opinion</h2>
        <button onClick={giveSpeech}>Give a Rousing Speech</button>
      </div>

      {player && (
        <div className="indicator-grid">
          <Indicator label="Public Approval" value={player.approval.public} />
          <Indicator label="Party Base" value={player.approval.base} />
          <Indicator label="Party Elite" value={player.approval.partyElite} />
        </div>
      )}

      <div className="whip-table-wrap">
        <table className="whip-table">
          <thead>
            <tr>
              <th>Voter Bloc</th>
              <th>Share</th>
              <th>Ideology (Econ / Social)</th>
              <th>Persuadability</th>
              <th>Top Issue</th>
            </tr>
          </thead>
          <tbody>
            {game.voterBlocs.map((bloc) => (
              <tr key={bloc.id}>
                <td>{bloc.name}</td>
                <td>{(bloc.size * 100).toFixed(0)}%</td>
                <td>
                  {bloc.ideology.economic.toFixed(0)} / {bloc.ideology.social.toFixed(0)}
                </td>
                <td>{(bloc.persuadability * 100).toFixed(0)}%</td>
                <td>{bloc.issueSalience[0]?.issue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Indicator({ label, value }: { label: string; value: number }) {
  return (
    <div className="indicator">
      <div className="indicator-label">{label}</div>
      <div className="indicator-value">{value.toFixed(1)}%</div>
    </div>
  );
}
