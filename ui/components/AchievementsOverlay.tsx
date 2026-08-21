import { ACHIEVEMENT_DEFINITIONS, computeLegacySummary, computeUnlockedAchievements } from '../../engine';
import { useStatecraftStore } from '../store';

/** A persistent, small progress readout of unlocked achievements — reuses the same derivation LegacyPanel's full achievement list already relies on, just condensed into a corner overlay instead of a dedicated tab. */
export function AchievementsOverlay() {
  const game = useStatecraftStore((s) => s.game);

  if (!game) return null;

  const summary = computeLegacySummary(game);
  const unlocked = computeUnlockedAchievements(game, summary.breakdown);

  return (
    <div className="achievements-overlay">
      <div className="achievements-overlay-header">
        <span>🏆 Achievements</span>
        <span className="muted">
          {unlocked.length}/{ACHIEVEMENT_DEFINITIONS.length}
        </span>
      </div>
      <ul className="achievements-overlay-list">
        {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
          const isUnlocked = unlocked.includes(achievement.id);
          return (
            <li key={achievement.id} className={isUnlocked ? 'achievements-overlay-unlocked' : ''} title={achievement.description}>
              <span>{isUnlocked ? '✅' : '⬜'}</span>
              {achievement.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
