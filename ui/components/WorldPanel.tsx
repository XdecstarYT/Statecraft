import { useMemo, useState } from 'react';
import { computeNationalTradeBalance, type CommodityType } from '../../engine';
import { TREATY_TEMPLATES } from '../../content/diplomacy/treatyTemplates';
import { useStatecraftStore } from '../store';

const COMMODITIES: CommodityType[] = ['energy', 'food', 'minerals', 'manufactured', 'technology'];
const MAX_LISTED = 60;

interface WorldPanelProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorldPanel({ selectedId, onSelect }: WorldPanelProps) {
  const game = useStatecraftStore((s) => s.game);
  const signTreatyAction = useStatecraftStore((s) => s.signTreatyAction);
  const breakTreatyAction = useStatecraftStore((s) => s.breakTreatyAction);
  const sendAidAction = useStatecraftStore((s) => s.sendAidAction);
  const imposeSanctionsAction = useStatecraftStore((s) => s.imposeSanctionsAction);
  const declareWarAction = useStatecraftStore((s) => s.declareWarAction);
  const proposeTradeDealAction = useStatecraftStore((s) => s.proposeTradeDealAction);
  const signTradeDealAction = useStatecraftStore((s) => s.signTradeDealAction);
  const setTariffAction = useStatecraftStore((s) => s.setTariffAction);
  const cancelTradeDealAction = useStatecraftStore((s) => s.cancelTradeDealAction);

  const [search, setSearch] = useState('');
  const [dealCommodity, setDealCommodity] = useState<CommodityType>('energy');
  const [dealVolume, setDealVolume] = useState(50);
  const [dealTariff, setDealTariff] = useState(0);

  const filtered = useMemo(() => {
    if (!game) return [];
    const q = search.trim().toLowerCase();
    if (!q) return game.foreignCounterparts;
    return game.foreignCounterparts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)
    );
  }, [game, search]);

  if (!game) return null;

  const selected = game.foreignCounterparts.find((c) => c.id === selectedId) ?? null;
  const relation = selected ? game.foreignRelations[selected.id] ?? 0 : 0;
  const activeWar = selected
    ? game.wars.find((w) => w.counterpartId === selected.id && w.status === 'active')
    : undefined;
  const dealsWithSelected = selected ? game.tradeDeals.filter((d) => d.counterpartId === selected.id) : [];
  const tradeBalance = selected ? computeNationalTradeBalance(selected.trade) : null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>World</h2>
        <input
          type="text"
          placeholder="Search nations or regions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="nation-picker-wrap">
        <ul className="nation-picker">
          {filtered.slice(0, MAX_LISTED).map((c) => (
            <li key={c.id}>
              <button className={c.id === selectedId ? 'active' : ''} onClick={() => onSelect(c.id)}>
                {c.name} <span className="muted">— {c.region}</span>
              </button>
            </li>
          ))}
        </ul>
        {filtered.length > MAX_LISTED && (
          <p className="muted">Showing first {MAX_LISTED} of {filtered.length} matches — refine your search.</p>
        )}
      </div>

      {!selected && <p className="muted">Select a nation from the list or the globe to see details.</p>}

      {selected && (
        <div className="nation-detail">
          <h3>{selected.name}</h3>
          <p className="muted">
            {selected.region} — Relations: {relation}
            {activeWar && <span className="status-floor bill-status"> AT WAR</span>}
          </p>

          <div className="indicator-grid">
            <div className="indicator">
              <div className="indicator-label">Military Strength</div>
              <div className="indicator-value">{selected.military.strength}</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">Personnel (k)</div>
              <div className="indicator-value">{selected.military.personnel}</div>
            </div>
            <div className="indicator">
              <div className="indicator-label">Tech Level</div>
              <div className="indicator-value">{selected.military.techLevel}</div>
            </div>
          </div>

          <div className="bill-actions">
            <button onClick={() => sendAidAction(selected.id)}>Send Aid</button>
            <button onClick={() => imposeSanctionsAction(selected.id)}>Sanction</button>
            {TREATY_TEMPLATES.map((template, i) => (
              <button key={template.type} onClick={() => signTreatyAction(selected.id, i)}>
                Sign {template.title}
              </button>
            ))}
            {!activeWar && (
              <button className="danger-button" onClick={() => declareWarAction(selected.id)}>
                Declare War
              </button>
            )}
          </div>

          <h4 className="subheading">Trade Balance</h4>
          <div className="indicator-grid">
            {COMMODITIES.map((c) => (
              <div className="indicator" key={c}>
                <div className="indicator-label">{c}</div>
                <div className="indicator-value">
                  {tradeBalance![c] >= 0 ? '+' : ''}
                  {tradeBalance![c]}
                </div>
              </div>
            ))}
          </div>

          <div className="custom-bill-form">
            <label>
              Commodity
              <select value={dealCommodity} onChange={(e) => setDealCommodity(e.target.value as CommodityType)}>
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Volume (units/turn — negative means you export)
              <input
                type="number"
                value={dealVolume}
                onChange={(e) => setDealVolume(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Tariff (0–1)
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={dealTariff}
                onChange={(e) => setDealTariff(Number(e.target.value) || 0)}
              />
            </label>
            <div className="row-actions">
              <button
                onClick={() => proposeTradeDealAction(selected.id, dealCommodity, dealVolume, dealTariff)}
              >
                Propose Trade Deal
              </button>
            </div>
          </div>

          {dealsWithSelected.length > 0 && (
            <ul className="scandal-list">
              {dealsWithSelected.map((deal) => (
                <li key={deal.id} className={`scandal-item status-${deal.status}`}>
                  <span>
                    {deal.commodity} — {deal.volume >= 0 ? 'import' : 'export'} {Math.abs(deal.volume)}/turn —
                    tariff {(deal.tariff * 100).toFixed(0)}% — {deal.status}
                  </span>
                  <span className="row-actions">
                    {deal.status === 'proposed' && (
                      <button onClick={() => signTradeDealAction(deal.id)}>Sign</button>
                    )}
                    {deal.status === 'active' && (
                      <>
                        <button onClick={() => setTariffAction(deal.id, Math.min(1, deal.tariff + 0.1))}>
                          +Tariff
                        </button>
                        <button onClick={() => setTariffAction(deal.id, Math.max(0, deal.tariff - 0.1))}>
                          −Tariff
                        </button>
                      </>
                    )}
                    {deal.status !== 'cancelled' && (
                      <button onClick={() => cancelTradeDealAction(deal.id)}>Cancel</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3 className="subheading">Treaties</h3>
      {game.treaties.length === 0 && <p className="muted">No treaties signed yet.</p>}
      <ul className="scandal-list">
        {game.treaties.map((treaty) => (
          <li key={treaty.id} className={`scandal-item status-${treaty.status}`}>
            <span>
              {treaty.title} — {treaty.status}
            </span>
            {treaty.status === 'active' && <button onClick={() => breakTreatyAction(treaty.id)}>Break</button>}
          </li>
        ))}
      </ul>

      {game.wars.length > 0 && (
        <>
          <h3 className="subheading">Wars</h3>
          <ul className="scandal-list">
            {game.wars.map((war) => {
              const counterpart = game.foreignCounterparts.find((c) => c.id === war.counterpartId);
              return (
                <li key={war.id} className={`scandal-item status-${war.status}`}>
                  <span>
                    {counterpart?.name ?? war.counterpartId} — {war.status} — advantage{' '}
                    {war.advantage.toFixed(0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
