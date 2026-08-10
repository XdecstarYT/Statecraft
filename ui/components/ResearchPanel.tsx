import { canAffordTech, isTechAvailable, type TechCategory } from '../../engine';
import { TECH_TREE } from '../../content/research/techTree';
import { useStatecraftStore } from '../store';

const CATEGORY_ORDER: TechCategory[] = ['industry', 'military', 'economy', 'governance'];
const CATEGORY_LABELS: Record<TechCategory, string> = {
  industry: 'Industry',
  military: 'Military',
  economy: 'Economy',
  governance: 'Governance',
};

export function ResearchPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastTechOutcome = useStatecraftStore((s) => s.lastTechOutcome);
  const investInResearchAction = useStatecraftStore((s) => s.investInResearchAction);
  const unlockTechAction = useStatecraftStore((s) => s.unlockTechAction);

  if (!game) return null;

  const unlocked = game.research.unlockedTechIds;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Research</h2>
        <span className="muted">Invest in R&amp;D to unlock a real tech tree</span>
      </div>

      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Capability</div>
          <div className="indicator-value">{game.research.capability.toFixed(0)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Research Points</div>
          <div className="indicator-value">{game.research.accumulatedPoints.toFixed(0)}</div>
        </div>
      </div>
      <div className="bill-actions">
        <button onClick={() => investInResearchAction('modest')}>Invest (Modest)</button>
        <button onClick={() => investInResearchAction('major')}>Invest (Major)</button>
      </div>

      {lastTechOutcome && !lastTechOutcome.success && (
        <p className="result-fail">Unlock failed: {lastTechOutcome.reason?.replace(/_/g, ' ')}</p>
      )}
      {lastTechOutcome?.success && <p className="result-pass">Tech unlocked.</p>}

      {CATEGORY_ORDER.map((category) => (
        <details key={category} className="category-group" open>
          <summary>
            <span>{CATEGORY_LABELS[category]}</span>
          </summary>
          <ul className="scandal-list">
            {TECH_TREE.filter((t) => t.category === category).map((tech) => {
              const isUnlocked = unlocked.includes(tech.id);
              const available = isTechAvailable(tech, unlocked);
              const affordable = canAffordTech(tech, game.research.accumulatedPoints);
              return (
                <li key={tech.id} className={`scandal-item${isUnlocked ? ' status-resolved' : ''}`}>
                  <span style={{ flex: 1 }}>
                    <strong>{tech.name}</strong> <span className="muted">({tech.cost} pts)</span>
                    <div className="muted">{tech.description}</div>
                    {!isUnlocked && tech.prerequisites.length > 0 && (
                      <div className="muted">Requires: {tech.prerequisites.join(', ')}</div>
                    )}
                  </span>
                  {isUnlocked ? (
                    <span className="muted">Unlocked</span>
                  ) : (
                    <button disabled={!available || !affordable} onClick={() => unlockTechAction(tech.id)}>
                      Unlock
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </section>
  );
}
