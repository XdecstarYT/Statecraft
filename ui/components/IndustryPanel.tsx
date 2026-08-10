import { useMemo, useState } from 'react';
import {
  MAX_FACTORY_TIER,
  MAX_MINE_TIER,
  getProvinces,
  type FacilityLocationType,
  type FacilityOwnership,
  type ProcessedGoodType,
  type RawResourceType,
} from '../../engine';
import { RAW_RESOURCES } from '../../content/resources/resourceTypes';
import { MANUFACTURING_RECIPES } from '../../content/resources/recipes';
import { useStatecraftStore } from '../store';

const RESOURCE_NAMES: Record<string, string> = Object.fromEntries(RAW_RESOURCES.map((r) => [r.id, r.name]));

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function IndustryPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastFacilityOutcome = useStatecraftStore((s) => s.lastFacilityOutcome);
  const lastSale = useStatecraftStore((s) => s.lastSale);
  const buildMineAction = useStatecraftStore((s) => s.buildMineAction);
  const upgradeMineAction = useStatecraftStore((s) => s.upgradeMineAction);
  const buildFactoryAction = useStatecraftStore((s) => s.buildFactoryAction);
  const upgradeFactoryAction = useStatecraftStore((s) => s.upgradeFactoryAction);
  const sellRawResourceAction = useStatecraftStore((s) => s.sellRawResourceAction);
  const sellProcessedGoodAction = useStatecraftStore((s) => s.sellProcessedGoodAction);
  const investInLogisticsAction = useStatecraftStore((s) => s.investInLogisticsAction);

  const [factoryLocationType, setFactoryLocationType] = useState<FacilityLocationType>('domestic');
  const [factoryLocationId, setFactoryLocationId] = useState('');
  const [factoryRecipeId, setFactoryRecipeId] = useState(MANUFACTURING_RECIPES[0].id);
  const [factoryOwnership, setFactoryOwnership] = useState<FacilityOwnership>('state');

  const [sellRawId, setSellRawId] = useState<RawResourceType>('iron_ore');
  const [sellRawUnits, setSellRawUnits] = useState(50);
  const [sellRawAs, setSellRawAs] = useState<FacilityOwnership>('state');

  const [sellGoodId, setSellGoodId] = useState<ProcessedGoodType>('steel');
  const [sellGoodUnits, setSellGoodUnits] = useState(20);
  const [sellGoodOwnership, setSellGoodOwnership] = useState<FacilityOwnership>('state');

  const provinces = useMemo(() => (game ? getProvinces(game.country) : []), [game]);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const domesticDeposits = game.resourceDeposits.filter((d) => d.locationType === 'domestic');
  const foreignDeposits = game.resourceDeposits.filter((d) => d.locationType === 'foreign');

  const locationName = (id: string, type: FacilityLocationType): string =>
    type === 'domestic'
      ? provinces.find((p) => p.id === id)?.name ?? id
      : game.foreignCounterparts.find((c) => c.id === id)?.name ?? id;

  const mineForDeposit = (depositId: string) => game.mines.find((m) => m.depositId === depositId);

  const locationOptions =
    factoryLocationType === 'domestic'
      ? provinces.map((p) => ({ id: p.id, name: p.name }))
      : game.foreignCounterparts.map((c) => ({ id: c.id, name: c.name }));

  const renderDepositList = (deposits: typeof domesticDeposits, locationType: FacilityLocationType) => (
    <ul className="scandal-list">
      {deposits.map((d) => {
        const mine = mineForDeposit(d.id);
        return (
          <li key={d.id} className="scandal-item">
            <span style={{ flex: 1 }}>
              <strong>{RESOURCE_NAMES[d.resource] ?? titleCase(d.resource)}</strong> —{' '}
              {locationName(d.locationId, locationType)}
              <span className="muted">
                {' '}
                · richness {d.richness.toFixed(0)} · reserves {d.remainingReserves.toFixed(0)}
              </span>
              {mine && (
                <div className="muted">
                  Mine: tier {mine.tier}/{MAX_MINE_TIER} ({mine.ownership})
                </div>
              )}
            </span>
            <span className="row-actions">
              {!mine && d.remainingReserves > 0 && (
                <>
                  <button onClick={() => buildMineAction(d.id, 'state')}>Build (State)</button>
                  <button onClick={() => buildMineAction(d.id, 'private')}>Build (Private)</button>
                </>
              )}
              {mine && mine.tier < MAX_MINE_TIER && <button onClick={() => upgradeMineAction(mine.id)}>Upgrade</button>}
            </span>
          </li>
        );
      })}
      {deposits.length === 0 && <p className="muted">No deposits here.</p>}
    </ul>
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Industry</h2>
        <span className="muted">Mine real resources, ship them, refine them, sell them</span>
      </div>

      <h4 className="subheading">National Logistics Network</h4>
      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Capability</div>
          <div className="indicator-value">{game.logisticsNetwork.capability.toFixed(0)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Your Personal Wealth</div>
          <div className="indicator-value">{(player ? game.personalWealth[player.id] ?? 0 : 0).toFixed(0)}</div>
        </div>
      </div>
      <div className="bill-actions">
        <button onClick={() => investInLogisticsAction('modest')}>Invest (Modest)</button>
        <button onClick={() => investInLogisticsAction('major')}>Invest (Major)</button>
      </div>

      {lastFacilityOutcome && !lastFacilityOutcome.success && (
        <p className="result-fail">Action failed: {lastFacilityOutcome.reason?.replace(/_/g, ' ')}</p>
      )}
      {lastSale && lastSale.unitsSold > 0 && (
        <p className="result-pass">
          Sold {lastSale.unitsSold} {titleCase(lastSale.good)} for {lastSale.revenue.toFixed(1)}
        </p>
      )}

      <div className="panel-columns">
        <div>
          <h4 className="subheading">Domestic Deposits</h4>
          {renderDepositList(domesticDeposits, 'domestic')}
        </div>
        <div>
          <h4 className="subheading">Foreign Deposits</h4>
          {renderDepositList(foreignDeposits, 'foreign')}
        </div>
      </div>

      <h4 className="subheading">Factories</h4>
      <div className="custom-bill-form">
        <label>
          Location Type
          <select
            value={factoryLocationType}
            onChange={(e) => {
              setFactoryLocationType(e.target.value as FacilityLocationType);
              setFactoryLocationId('');
            }}
          >
            <option value="domestic">Domestic</option>
            <option value="foreign">Foreign</option>
          </select>
        </label>
        <label>
          Location
          <select value={factoryLocationId} onChange={(e) => setFactoryLocationId(e.target.value)}>
            <option value="">Select…</option>
            {locationOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recipe
          <select value={factoryRecipeId} onChange={(e) => setFactoryRecipeId(e.target.value)}>
            {MANUFACTURING_RECIPES.map((r) => (
              <option key={r.id} value={r.id}>
                {titleCase(r.outputGood)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ownership
          <select value={factoryOwnership} onChange={(e) => setFactoryOwnership(e.target.value as FacilityOwnership)}>
            <option value="state">State</option>
            <option value="private">Private</option>
          </select>
        </label>
        <div className="row-actions">
          <button
            disabled={!factoryLocationId}
            onClick={() =>
              factoryLocationId &&
              buildFactoryAction(factoryLocationId, factoryLocationType, factoryRecipeId, factoryOwnership)
            }
          >
            Build Factory
          </button>
        </div>
      </div>

      <table className="whip-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Output</th>
            <th>Tier</th>
            <th>Ownership</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {game.factories.map((f) => {
            const recipe = MANUFACTURING_RECIPES.find((r) => r.id === f.recipeId);
            return (
              <tr key={f.id}>
                <td>{locationName(f.locationId, f.locationType)}</td>
                <td>{recipe ? titleCase(recipe.outputGood) : f.recipeId}</td>
                <td>
                  {f.tier}/{MAX_FACTORY_TIER}
                </td>
                <td>{f.ownership}</td>
                <td>
                  {f.tier < MAX_FACTORY_TIER && <button onClick={() => upgradeFactoryAction(f.id)}>Upgrade</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {game.factories.length === 0 && <p className="muted">No factories built yet.</p>}

      <h4 className="subheading">Raw Resource Stockpile &amp; Market</h4>
      <table className="whip-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Stockpile</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {RAW_RESOURCES.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{(game.rawResourceStockpile[r.id] ?? 0).toFixed(0)}</td>
              <td>{(game.marketPrices[r.id] ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="custom-bill-form">
        <label>
          Resource
          <select value={sellRawId} onChange={(e) => setSellRawId(e.target.value as RawResourceType)}>
            {RAW_RESOURCES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Units
          <input
            type="number"
            min={1}
            value={sellRawUnits}
            onChange={(e) => setSellRawUnits(Math.max(1, Number(e.target.value)))}
          />
        </label>
        <label>
          Sell As
          <select value={sellRawAs} onChange={(e) => setSellRawAs(e.target.value as FacilityOwnership)}>
            <option value="state">State (Budget)</option>
            <option value="private">Private (Personal Wealth)</option>
          </select>
        </label>
        <div className="row-actions">
          <button onClick={() => sellRawResourceAction(sellRawId, sellRawUnits, sellRawAs)}>Sell</button>
        </div>
      </div>

      <h4 className="subheading">Finished Goods Stockpile &amp; Market</h4>
      <table className="whip-table">
        <thead>
          <tr>
            <th>Good</th>
            <th>State Stock</th>
            <th>Private Stock</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {MANUFACTURING_RECIPES.map((r) => (
            <tr key={r.outputGood}>
              <td>{titleCase(r.outputGood)}</td>
              <td>{(game.stateGoodsStockpile[r.outputGood] ?? 0).toFixed(0)}</td>
              <td>{(game.privateGoodsStockpile[r.outputGood] ?? 0).toFixed(0)}</td>
              <td>{(game.marketPrices[r.outputGood] ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="custom-bill-form">
        <label>
          Good
          <select value={sellGoodId} onChange={(e) => setSellGoodId(e.target.value as ProcessedGoodType)}>
            {MANUFACTURING_RECIPES.map((r) => (
              <option key={r.outputGood} value={r.outputGood}>
                {titleCase(r.outputGood)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Units
          <input
            type="number"
            min={1}
            value={sellGoodUnits}
            onChange={(e) => setSellGoodUnits(Math.max(1, Number(e.target.value)))}
          />
        </label>
        <label>
          From
          <select value={sellGoodOwnership} onChange={(e) => setSellGoodOwnership(e.target.value as FacilityOwnership)}>
            <option value="state">State Stockpile</option>
            <option value="private">Private Stockpile</option>
          </select>
        </label>
        <div className="row-actions">
          <button onClick={() => sellProcessedGoodAction(sellGoodId, sellGoodUnits, sellGoodOwnership)}>Sell</button>
        </div>
      </div>
    </section>
  );
}
