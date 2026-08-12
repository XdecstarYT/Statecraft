import { useState } from 'react';
import { useStatecraftStore } from '../store';

export function CampaignFinancePanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastOutcome = useStatecraftStore((s) => s.lastPoliticalOutcome);
  const courtDonorAction = useStatecraftStore((s) => s.courtDonorAction);
  const solicitDonationAction = useStatecraftStore((s) => s.solicitDonationAction);
  const acceptDarkMoneyOfferAction = useStatecraftStore((s) => s.acceptDarkMoneyOfferAction);
  const runAdBlitzAction = useStatecraftStore((s) => s.runAdBlitzAction);

  const [adSpend, setAdSpend] = useState(50);

  if (!game) return null;

  const sortedDonors = [...game.donors].sort((a, b) => b.disposition - a.disposition);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Campaign Finance &amp; Donors</h2>
        <span className="muted">War chest: ${game.campaignFunds.toLocaleString()}</span>
      </div>

      <p className="muted">
        Donors give more the warmer and more ideologically aligned they are. Undisclosed dark
        money pays far better but risks a real detection roll — a genuine corruption exposure, not
        a free lunch.
      </p>

      <div className="corruption-controls">
        <input
          type="number"
          min={0}
          step={10}
          value={adSpend}
          onChange={(e) => setAdSpend(Math.max(0, Number(e.target.value)))}
          style={{ width: '6rem' }}
        />
        <button onClick={() => runAdBlitzAction(adSpend)} disabled={game.campaignFunds <= 0}>
          Run Ad Blitz
        </button>
      </div>

      {lastOutcome && (
        <p className={lastOutcome.tone === 'pass' ? 'result-pass' : lastOutcome.tone === 'fail' ? 'result-fail' : 'muted'}>
          <strong>{lastOutcome.label}:</strong> {lastOutcome.detail}
        </p>
      )}

      <ul className="scandal-list">
        {sortedDonors.map((donor) => {
          const dispositionPct = Math.max(0, Math.min(100, (donor.disposition + 100) / 2));
          return (
            <li key={donor.id} className="scandal-item">
              <span style={{ flex: 1 }}>
                <strong>{donor.name}</strong> — {donor.type} — wealth {donor.wealth}
                <div className="score-bar-track" style={{ marginTop: '0.3rem' }}>
                  <div className="score-bar-fill" style={{ width: `${dispositionPct}%` }} />
                </div>
                <span className="muted">disposition {donor.disposition.toFixed(0)}</span>
              </span>
              <span className="row-actions">
                <button onClick={() => courtDonorAction(donor.id)}>Court</button>
                <button onClick={() => solicitDonationAction(donor.id)} disabled={donor.disposition < 10}>
                  Solicit
                </button>
                <button onClick={() => acceptDarkMoneyOfferAction(donor.id)} disabled={donor.disposition < 50}>
                  Dark Money
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
