import { useStatecraftStore } from '../store';

const OUTCOME_LABEL: Record<string, string> = {
  strong: 'Strong reception',
  solid: 'Solid reception',
  gaffe: 'Gaffe!',
};

export function OpinionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const giveSpeech = useStatecraftStore((s) => s.giveSpeech);
  const holdPressInterviewAction = useStatecraftStore((s) => s.holdPressInterviewAction);
  const holdRallyAction = useStatecraftStore((s) => s.holdRallyAction);
  const lastCampaignOutcome = useStatecraftStore((s) => s.lastCampaignOutcome);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Public Opinion &amp; Campaign</h2>
      </div>

      {player && (
        <div className="indicator-grid">
          <Indicator label="Public Approval" value={player.approval.public} />
          <Indicator label="Party Base" value={player.approval.base} />
          <Indicator label="Party Elite" value={player.approval.partyElite} />
        </div>
      )}

      <p className="subheading">Campaign Actions</p>
      <div className="bill-actions">
        <button onClick={giveSpeech}>Give a Rousing Speech</button>
        <button onClick={holdPressInterviewAction}>Hold a Press Interview</button>
        <button onClick={holdRallyAction}>Hold a Rally</button>
      </div>

      {lastCampaignOutcome && (
        <p className={lastCampaignOutcome.outcome === 'gaffe' ? 'result-fail' : 'result-pass'}>
          {lastCampaignOutcome.action === 'interview' ? 'Press interview' : 'Rally'} —{' '}
          {OUTCOME_LABEL[lastCampaignOutcome.outcome]} ({lastCampaignOutcome.approvalImpact >= 0 ? '+' : ''}
          {lastCampaignOutcome.approvalImpact} approval, phasing in)
        </p>
      )}

      <p className="subheading">Voter Blocs</p>
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
