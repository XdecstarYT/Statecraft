import type { DilemmaChoice } from '../../engine';
import { useStatecraftStore } from '../store';

const ECONOMY_FIELD_LABELS: Record<string, string> = {
  gdpGrowth: 'Growth',
  inflation: 'Inflation',
  unemployment: 'Unemployment',
  debtToGdp: 'Debt/GDP',
  budgetBalance: 'Budget',
};

function formatSigned(value: number, suffix = ''): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded >= 0 ? '+' : ''}${rounded}${suffix}`;
}

function ChoiceEffectPreview({ choice, counterpartName }: { choice: DilemmaChoice; counterpartName?: string }) {
  const chips: { text: string; positive: boolean }[] = [];

  if (choice.economyEffect) {
    for (const [key, value] of Object.entries(choice.economyEffect)) {
      if (typeof value !== 'number' || value === 0) continue;
      const label = ECONOMY_FIELD_LABELS[key] ?? key;
      const higherIsWorse = key === 'inflation' || key === 'unemployment' || key === 'debtToGdp';
      chips.push({ text: `${label} ${formatSigned(value)}`, positive: higherIsWorse ? value < 0 : value > 0 });
    }
  }
  if (choice.playerApprovalEffect) {
    chips.push({ text: `Approval ${formatSigned(choice.playerApprovalEffect)}`, positive: choice.playerApprovalEffect > 0 });
  }
  if (choice.foreignRelationEffect) {
    const name = counterpartName ?? choice.foreignRelationEffect.counterpartId;
    chips.push({
      text: `${name} ${formatSigned(choice.foreignRelationEffect.delta)}`,
      positive: choice.foreignRelationEffect.delta > 0,
    });
  }
  if (choice.delayedEconomyEffect) {
    const [key, value] = Object.entries(choice.delayedEconomyEffect.delta).find(([, v]) => typeof v === 'number' && v !== 0) ?? [];
    if (key && typeof value === 'number') {
      const label = ECONOMY_FIELD_LABELS[key] ?? key;
      const higherIsWorse = key === 'inflation' || key === 'unemployment' || key === 'debtToGdp';
      chips.push({
        text: `${label} ${formatSigned(value)} in ${choice.delayedEconomyEffect.turnsRemaining}w`,
        positive: higherIsWorse ? value < 0 : value > 0,
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="dilemma-choice-chips">
      {chips.map((chip, i) => (
        <span key={i} className={chip.positive ? 'dilemma-chip-positive' : 'dilemma-chip-negative'}>
          {chip.text}
        </span>
      ))}
    </div>
  );
}

/** A prominent, always-on-top card for the player's currently active dilemma — mounted globally in App.tsx so it's visible no matter which tab is open, since a dilemma waits on the player, not on them finding the right panel. */
export function DilemmaPanel() {
  const game = useStatecraftStore((s) => s.game);
  const resolveDilemmaAction = useStatecraftStore((s) => s.resolveDilemmaAction);

  if (!game || !game.activeDilemma) return null;
  const dilemma = game.activeDilemma;

  return (
    <section className="panel dilemma-panel">
      <div className="panel-header">
        <h2>⚖️ {dilemma.title}</h2>
        <span className="muted">A decision is needed</span>
      </div>
      <p>{dilemma.description}</p>
      <div className="dilemma-choices">
        {dilemma.choices.map((choice) => {
          const counterpart = choice.foreignRelationEffect
            ? game.foreignCounterparts.find((c) => c.id === choice.foreignRelationEffect!.counterpartId)
            : undefined;
          return (
            <div key={choice.id} className="dilemma-choice">
              <div className="dilemma-choice-header">
                <strong>{choice.label}</strong>
              </div>
              <p className="muted">{choice.description}</p>
              <ChoiceEffectPreview choice={choice} counterpartName={counterpart?.name} />
              <button onClick={() => resolveDilemmaAction(choice.id)}>Choose</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
