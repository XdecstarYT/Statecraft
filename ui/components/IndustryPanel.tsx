import { Fragment, useMemo, useState } from 'react';
import {
  MAX_FACTORY_TIER,
  MAX_MINE_TIER,
  getProvinces,
  type FacilityLocationType,
  type FacilityOwnership,
  type ProcessedGoodType,
  type RawResourceType,
  type ResourceDeposit,
} from '../../engine';
import { RAW_RESOURCES } from '../../content/resources/resourceTypes';
import { MANUFACTURING_RECIPES } from '../../content/resources/recipes';
import { useStatecraftStore } from '../store';

const RESOURCE_NAMES: Record<string, string> = Object.fromEntries(RAW_RESOURCES.map((r) => [r.id, r.name]));

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Groups resources/goods into broad categories purely for display — doesn't affect any game math.
const RESOURCE_CATEGORY: Record<RawResourceType, string> = {
  iron_ore: 'Metals & Minerals',
  copper_ore: 'Metals & Minerals',
  bauxite: 'Metals & Minerals',
  gold_ore: 'Metals & Minerals',
  rare_earth_minerals: 'Metals & Minerals',
  stone: 'Metals & Minerals',
  coal: 'Fuels & Energy',
  crude_oil: 'Fuels & Energy',
  natural_gas: 'Fuels & Energy',
  grain: 'Agriculture & Timber',
  timber: 'Agriculture & Timber',
};
const RESOURCE_CATEGORY_ORDER = ['Metals & Minerals', 'Fuels & Energy', 'Agriculture & Timber'];

const GOOD_CATEGORY: Record<ProcessedGoodType, string> = {
  steel: 'Metals & Alloys',
  copper_wire: 'Metals & Alloys',
  aluminum: 'Metals & Alloys',
  machinery: 'Metals & Alloys',
  jewelry: 'Metals & Alloys',
  refined_fuel: 'Energy & Chemicals',
  chemicals: 'Energy & Chemicals',
  lumber: 'Agriculture & Timber',
  processed_food: 'Agriculture & Timber',
  electronics: 'Electronics',
};
const GOOD_CATEGORY_ORDER = ['Metals & Alloys', 'Energy & Chemicals', 'Agriculture & Timber', 'Electronics'];

function groupByCategory<T>(items: T[], categoryOf: (item: T) => string, order: string[]): [string, T[]][] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const category = categoryOf(item);
    const bucket = buckets.get(category);
    if (bucket) bucket.push(item);
    else buckets.set(category, [item]);
  }
  return order.filter((category) => buckets.has(category)).map((category) => [category, buckets.get(category)!]);
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

  const [foreignSearch, setForeignSearch] = useState('');

  const provinces = useMemo(() => (game ? getProvinces(game.country) : []), [game]);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const domesticDeposits = game.resourceDeposits.filter((d) => d.locationType === 'domestic');

  const locationName = (id: string, type: FacilityLocationType): string =>
    type === 'domestic'
      ? provinces.find((p) => p.id === id)?.name ?? id
      : game.foreignCounterparts.find((c) => c.id === id)?.name ?? id;

  const foreignSearchQuery = foreignSearch.trim().toLowerCase();
  const foreignDeposits = game.resourceDeposits.filter((d) => {
    if (d.locationType !== 'foreign') return false;
    if (!foreignSearchQuery) return true;
    const resourceLabel = (RESOURCE_NAMES[d.resource] ?? d.resource).toLowerCase();
    const nationLabel = locationName(d.locationId, 'foreign').toLowerCase();
    return resourceLabel.includes(foreignSearchQuery) || nationLabel.includes(foreignSearchQuery);
  });

  const mineForDeposit = (depositId: string) => game.mines.find((m) => m.depositId === depositId);

  const locationOptions =
    factoryLocationType === 'domestic'
      ? provinces.map((p) => ({ id: p.id, name: p.name }))
      : game.foreignCounterparts.map((c) => ({ id: c.id, name: c.name }));

  const renderDepositList = (deposits: ResourceDeposit[], locationType: FacilityLocationType) => (
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

  const renderCategorizedDeposits = (
    deposits: ResourceDeposit[],
    locationType: FacilityLocationType,
    defaultOpen: boolean
  ) => {
    const groups = groupByCategory(deposits, (d) => RESOURCE_CATEGORY[d.resource] ?? 'Other', RESOURCE_CATEGORY_ORDER);
    if (groups.length === 0) return <p className="muted">No deposits found.</p>;
    return groups.map(([category, items]) => (
      <details key={category} className="category-group" open={defaultOpen}>
        <summary>
          <span>{category}</span>
          <span className="category-count">{items.length}</span>
        </summary>
        {renderDepositList(items, locationType)}
      </details>
    ));
  };

  const rawResourcesByCategory = groupByCategory(RAW_RESOURCES, (r) => RESOURCE_CATEGORY[r.id] ?? 'Other', RESOURCE_CATEGORY_ORDER);
  const recipesByCategory = groupByCategory(
    MANUFACTURING_RECIPES,
    (r) => GOOD_CATEGORY[r.outputGood] ?? 'Other',
    GOOD_CATEGORY_ORDER
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
          {renderCategorizedDeposits(domesticDeposits, 'domestic', true)}
        </div>
        <div>
          <h4 className="subheading">Foreign Deposits</h4>
          <input
            type="text"
            placeholder="Search resource or nation…"
            value={foreignSearch}
            onChange={(e) => setForeignSearch(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
          />
          {renderCategorizedDeposits(foreignDeposits, 'foreign', foreignSearchQuery.length > 0)}
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
            {GOOD_CATEGORY_ORDER.map((category) => (
              <optgroup key={category} label={category}>
                {MANUFACTURING_RECIPES.filter((r) => GOOD_CATEGORY[r.outputGood] === category).map((r) => (
                  <option key={r.id} value={r.id}>
                    {titleCase(r.outputGood)}
                  </option>
                ))}
              </optgroup>
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
          {rawResourcesByCategory.map(([category, resources]) => (
            <Fragment key={category}>
              <tr className="table-category-row">
                <td colSpan={3}>{category}</td>
              </tr>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{(game.rawResourceStockpile[r.id] ?? 0).toFixed(0)}</td>
                  <td>{(game.marketPrices[r.id] ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="custom-bill-form">
        <label>
          Resource
          <select value={sellRawId} onChange={(e) => setSellRawId(e.target.value as RawResourceType)}>
            {RESOURCE_CATEGORY_ORDER.map((category) => (
              <optgroup key={category} label={category}>
                {RAW_RESOURCES.filter((r) => RESOURCE_CATEGORY[r.id] === category).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
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
          {recipesByCategory.map(([category, recipes]) => (
            <Fragment key={category}>
              <tr className="table-category-row">
                <td colSpan={4}>{category}</td>
              </tr>
              {recipes.map((r) => (
                <tr key={r.outputGood}>
                  <td>{titleCase(r.outputGood)}</td>
                  <td>{(game.stateGoodsStockpile[r.outputGood] ?? 0).toFixed(0)}</td>
                  <td>{(game.privateGoodsStockpile[r.outputGood] ?? 0).toFixed(0)}</td>
                  <td>{(game.marketPrices[r.outputGood] ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="custom-bill-form">
        <label>
          Good
          <select value={sellGoodId} onChange={(e) => setSellGoodId(e.target.value as ProcessedGoodType)}>
            {GOOD_CATEGORY_ORDER.map((category) => (
              <optgroup key={category} label={category}>
                {MANUFACTURING_RECIPES.filter((r) => GOOD_CATEGORY[r.outputGood] === category).map((r) => (
                  <option key={r.outputGood} value={r.outputGood}>
                    {titleCase(r.outputGood)}
                  </option>
                ))}
              </optgroup>
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
