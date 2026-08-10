import { useState } from 'react';
import { computeHoldingValue, computeMarketIndex, type CompanySector } from '../../engine';
import { useStatecraftStore } from '../store';

const SECTOR_ORDER: CompanySector[] = ['industrial', 'technology', 'finance', 'energy', 'consumer', 'agriculture'];
const SECTOR_LABELS: Record<CompanySector, string> = {
  industrial: 'Industrial',
  technology: 'Technology',
  finance: 'Finance',
  energy: 'Energy',
  consumer: 'Consumer',
  agriculture: 'Agriculture',
};

export function MarketsPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastEnterpriseOutcome = useStatecraftStore((s) => s.lastEnterpriseOutcome);
  const lastIpoProceeds = useStatecraftStore((s) => s.lastIpoProceeds);
  const foundCompanyAction = useStatecraftStore((s) => s.foundCompanyAction);
  const ipoCompanyAction = useStatecraftStore((s) => s.ipoCompanyAction);
  const buySharesAction = useStatecraftStore((s) => s.buySharesAction);
  const sellSharesAction = useStatecraftStore((s) => s.sellSharesAction);

  const [companyName, setCompanyName] = useState('');
  const [companySector, setCompanySector] = useState<CompanySector>('technology');
  const [tradeAmount, setTradeAmount] = useState<Record<string, number>>({});

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const marketIndex = computeMarketIndex(game.companies);

  const amountFor = (companyId: string) => tradeAmount[companyId] ?? 50;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Markets</h2>
        <span className="muted">Found a company, take it public, and trade on a real market</span>
      </div>

      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Market Index</div>
          <div className="indicator-value">{marketIndex.toFixed(1)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Your Personal Wealth</div>
          <div className="indicator-value">{(player ? game.personalWealth[player.id] ?? 0 : 0).toFixed(0)}</div>
        </div>
      </div>

      {lastEnterpriseOutcome && !lastEnterpriseOutcome.success && (
        <p className="result-fail">Action failed: {lastEnterpriseOutcome.reason?.replace(/_/g, ' ')}</p>
      )}
      {lastEnterpriseOutcome?.success && lastIpoProceeds !== null && lastIpoProceeds > 0 && (
        <p className="result-pass">IPO complete — raised {lastIpoProceeds.toFixed(0)}.</p>
      )}

      <div className="custom-bill-form">
        <label>
          Company Name
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
        </label>
        <label>
          Sector
          <select value={companySector} onChange={(e) => setCompanySector(e.target.value as CompanySector)}>
            {SECTOR_ORDER.map((sector) => (
              <option key={sector} value={sector}>
                {SECTOR_LABELS[sector]}
              </option>
            ))}
          </select>
        </label>
        <div className="row-actions">
          <button
            disabled={!companyName.trim()}
            onClick={() => {
              if (!companyName.trim()) return;
              foundCompanyAction(companyName.trim(), companySector);
              setCompanyName('');
            }}
          >
            Found Company
          </button>
        </div>
      </div>

      {game.companies.length === 0 && <p className="muted">You haven't founded any companies yet.</p>}

      {SECTOR_ORDER.map((sector) => {
        const companies = game.companies.filter((c) => c.sector === sector);
        if (companies.length === 0) return null;
        return (
          <details key={sector} className="category-group" open>
            <summary>
              <span>{SECTOR_LABELS[sector]}</span>
              <span className="category-count">{companies.length}</span>
            </summary>
            <ul className="scandal-list">
              {companies.map((company) => (
                <li key={company.id} className="scandal-item">
                  <span style={{ flex: 1 }}>
                    <strong>{company.name}</strong> <span className="muted">({company.isPublic ? 'public' : 'private'})</span>
                    <div className="muted">
                      Fundamentals {company.fundamentals.toFixed(0)}/100
                      {company.isPublic && <> · Share price {company.sharePrice.toFixed(2)}</>}
                      {' · '}
                      Your shares {company.playerShares.toFixed(company.isPublic ? 1 : 0)} (
                      {computeHoldingValue(company).toFixed(0)} value)
                    </div>
                  </span>
                  <span className="row-actions">
                    {!company.isPublic && <button onClick={() => ipoCompanyAction(company.id)}>Take Public (IPO)</button>}
                    {company.isPublic && (
                      <>
                        <input
                          type="number"
                          min={1}
                          style={{ width: '5.5rem' }}
                          value={amountFor(company.id)}
                          onChange={(e) =>
                            setTradeAmount((prev) => ({ ...prev, [company.id]: Math.max(1, Number(e.target.value)) }))
                          }
                        />
                        <button onClick={() => buySharesAction(company.id, amountFor(company.id))}>Buy</button>
                        <button
                          onClick={() => sellSharesAction(company.id, amountFor(company.id) / company.sharePrice)}
                        >
                          Sell
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
