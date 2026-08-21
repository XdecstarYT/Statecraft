import { useStatecraftStore } from '../store';

export function ThinkTankPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastPoliticalOutcome);
  const courtThinkTankAction = useStatecraftStore((s) => s.courtThinkTankAction);
  const commissionReportAction = useStatecraftStore((s) => s.commissionReportAction);

  if (!game) return null;

  const sortedThinkTanks = [...game.thinkTanks].sort((a, b) => b.prestige - a.prestige);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Think Tanks &amp; Policy Institutes</h2>
        <span className="muted">
          Overton window: econ {game.overtonWindow.economic.toFixed(0)}, social {game.overtonWindow.social.toFixed(0)}
        </span>
      </div>

      <p className="muted">
        A courted institute can be commissioned to publish a report, nudging the national Overton
        window toward its own position — the more prestigious the institute, the further it moves.
        The window's distance from your own ideology quietly presses on your approval every turn.
      </p>

      {lastOutcome && (
        <p className={lastOutcome.tone === 'pass' ? 'result-pass' : lastOutcome.tone === 'fail' ? 'result-fail' : 'muted'}>
          <strong>{lastOutcome.label}:</strong> {lastOutcome.detail}
        </p>
      )}

      <ul className="scandal-list">
        {sortedThinkTanks.map((thinkTank) => {
          const dispositionPct = Math.max(0, Math.min(100, (thinkTank.disposition + 100) / 2));
          return (
            <li key={thinkTank.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{thinkTank.name}</strong> — prestige {thinkTank.prestige} — ideology (
                {thinkTank.ideology.economic.toFixed(0)}, {thinkTank.ideology.social.toFixed(0)})
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${dispositionPct}%` }} />
                </div>
                <span className="muted">disposition {thinkTank.disposition.toFixed(0)}</span>
              </span>
              <span className="row-actions">
                <button onClick={() => courtThinkTankAction(thinkTank.id)}>Court</button>
                <button onClick={() => commissionReportAction(thinkTank.id)} disabled={thinkTank.disposition < 15}>
                  Commission Report
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
