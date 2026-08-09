import { useState } from 'react';
import type { PressTopic } from '../../engine';
import { PRESS_TOPIC_LABELS } from '../../engine';
import { useStatecraftStore } from '../store';

const OUTCOME_LABEL: Record<string, string> = {
  strong: 'Strong reception',
  solid: 'Solid reception',
  gaffe: 'Gaffe!',
};

const CAMPAIGN_ACTION_LABEL: Record<string, string> = {
  interview: 'Press interview',
  rally: 'Rally',
  press_conference: 'Press conference',
};

const PRESS_TOPICS: PressTopic[] = ['economy', 'scandal_defense', 'foreign_policy', 'social_policy'];

export function OpinionPanel() {
  const game = useStatecraftStore((s) => s.game);
  const giveSpeech = useStatecraftStore((s) => s.giveSpeech);
  const holdPressInterviewAction = useStatecraftStore((s) => s.holdPressInterviewAction);
  const holdRallyAction = useStatecraftStore((s) => s.holdRallyAction);
  const holdPressConferenceAction = useStatecraftStore((s) => s.holdPressConferenceAction);
  const holdDebateAction = useStatecraftStore((s) => s.holdDebateAction);
  const lastCampaignOutcome = useStatecraftStore((s) => s.lastCampaignOutcome);
  const lastDebateResult = useStatecraftStore((s) => s.lastDebateResult);
  const [pressTopic, setPressTopic] = useState<PressTopic>('economy');

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
        <button onClick={() => holdDebateAction()}>Challenge a Rival to Debate</button>
      </div>

      <div className="custom-bill-form">
        <label>
          Press Conference Topic
          <select value={pressTopic} onChange={(e) => setPressTopic(e.target.value as PressTopic)}>
            {PRESS_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {PRESS_TOPIC_LABELS[topic]}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => holdPressConferenceAction(pressTopic)}>Hold Press Conference</button>
      </div>

      {lastCampaignOutcome && (
        <p className={lastCampaignOutcome.outcome === 'gaffe' ? 'result-fail' : 'result-pass'}>
          {CAMPAIGN_ACTION_LABEL[lastCampaignOutcome.action]} —{' '}
          {OUTCOME_LABEL[lastCampaignOutcome.outcome]} ({lastCampaignOutcome.approvalImpact >= 0 ? '+' : ''}
          {lastCampaignOutcome.approvalImpact} approval, phasing in)
        </p>
      )}

      {lastDebateResult && player && (
        <p className={lastDebateResult.winnerId === player.id ? 'result-pass' : 'result-fail'}>
          Debate {lastDebateResult.winnerId === player.id ? 'won' : 'lost'} —{' '}
          {lastDebateResult.participants.map((p) => `${game.politicians.find((x) => x.id === p.politicianId)?.name ?? p.politicianId}: ${p.score.toFixed(1)}`).join(' vs ')}
        </p>
      )}

      <EndorsementsSection />

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

const ENDORSER_TYPE_LABEL: Record<string, string> = { celebrity: 'Celebrity', union: 'Union', newspaper: 'Newspaper' };

function EndorsementsSection() {
  const game = useStatecraftStore((s) => s.game);
  const seekEndorsementAction = useStatecraftStore((s) => s.seekEndorsementAction);
  const lastEndorsementOutcome = useStatecraftStore((s) => s.lastEndorsementOutcome);

  if (!game) return null;

  const wonIds = new Set(game.endorsements.map((e) => e.endorserId));
  const player = game.politicians.find((p) => p.isPlayer);
  const playerId = player?.id;

  return (
    <>
      <p className="subheading">Endorsements</p>
      <ul className="scandal-list">
        {game.endorsers.map((endorser) => {
          const won = game.endorsements.find((e) => e.endorserId === endorser.id);
          return (
            <li key={endorser.id} className={`scandal-item ${won ? 'status-resolved' : ''}`}>
              <span style={{ flex: 1 }}>
                <strong>{endorser.name}</strong> <span className="muted">({ENDORSER_TYPE_LABEL[endorser.type]})</span>
                {won && (
                  <span className="result-pass">
                    {' '}
                    — endorsed {won.politicianId === playerId ? 'you' : won.politicianId}
                  </span>
                )}
                {!won && lastEndorsementOutcome && lastEndorsementOutcome.endorserId === endorser.id && (
                  <span className="result-fail"> — declined to endorse</span>
                )}
              </span>
              {!wonIds.has(endorser.id) && <button onClick={() => seekEndorsementAction(endorser.id)}>Seek Endorsement</button>}
            </li>
          );
        })}
      </ul>
    </>
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
