import type { InterestGroup } from '../../engine';
import { useStatecraftStore } from '../store';

const FOCUS_LABELS: Record<InterestGroup['focus'], string> = {
  business: 'Business',
  labor: 'Labor',
  environment: 'Environment',
  social_conservative: 'Social Conservative',
  social_progressive: 'Social Progressive',
  civil_liberties: 'Civil Liberties',
  healthcare: 'Healthcare',
  defense: 'Defense',
  agriculture: 'Agriculture',
  seniors: 'Seniors',
};

export function LobbyingPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastLobbyingOutcome = useStatecraftStore((s) => s.lastLobbyingOutcome);
  const courtInterestGroupAction = useStatecraftStore((s) => s.courtInterestGroupAction);

  if (!game) return null;

  const sortedGroups = [...game.interestGroups].sort((a, b) => b.influence - a.influence);
  const lastGroup = lastLobbyingOutcome
    ? game.interestGroups.find((g) => g.id === lastLobbyingOutcome.groupId)
    : null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Interest Groups &amp; Lobbying</h2>
        <span className="muted">{sortedGroups.length} organized groups</span>
      </div>

      <p className="muted">
        Every group's stance on a bill — ideology and financial clout weighted — feeds a real
        chamber-wide pressure term into the whip count. Courting a friendly group makes its
        lobbying count for more; unreinforced relationships drift back toward neutral over time.
      </p>

      {lastLobbyingOutcome && lastGroup && (
        <p className={lastLobbyingOutcome.success ? 'result-pass' : 'result-fail'}>
          {lastLobbyingOutcome.success
            ? `${lastGroup.name} responded well — disposition +${lastLobbyingOutcome.dispositionDelta.toFixed(0)}.`
            : `${lastGroup.name} was unmoved (${lastLobbyingOutcome.dispositionDelta >= 0 ? '+' : ''}${lastLobbyingOutcome.dispositionDelta.toFixed(0)}).`}
        </p>
      )}

      <ul className="scandal-list">
        {sortedGroups.map((group) => (
          <GroupRow key={group.id} group={group} onCourt={() => courtInterestGroupAction(group.id)} />
        ))}
      </ul>
    </section>
  );
}

function GroupRow({ group, onCourt }: { group: InterestGroup; onCourt: () => void }) {
  const dispositionPct = Math.max(0, Math.min(100, (group.disposition + 100) / 2));
  const stanceLabel =
    group.disposition > 25 ? 'Friendly' : group.disposition < -25 ? 'Hostile' : 'Neutral';

  return (
    <li className="scandal-item">
      <span style={{ flex: 1 }}>
        <strong>{group.name}</strong> — {FOCUS_LABELS[group.focus]} — influence {group.influence}
        <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
          <div className="score-bar-fill" style={{ width: `${dispositionPct}%` }} />
        </div>
        <span className="muted">
          {stanceLabel} ({group.disposition.toFixed(0)})
        </span>
      </span>
      <span className="row-actions">
        <button onClick={onCourt}>Court</button>
      </span>
    </li>
  );
}
