import {
  computeDiplomacySummary,
  computeGovernmentSummary,
  computeIndustrySummary,
  computeJudiciarySummary,
  computeMarketSummary,
  computeMovementsSummary,
} from '../../engine';
import { useStatecraftStore } from '../store';

function Indicator({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="indicator">
      <div className="indicator-label">{label}</div>
      <div className="indicator-value">{value}</div>
    </div>
  );
}

function num(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sumRecord(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

/**
 * A single, comprehensive, real-numbers overview of the country being
 * played — every system's live state in one place, since no single tab
 * otherwise shows the whole picture at once. Purely a renderer: every
 * number here already lives in GameState or comes from a pure aggregator
 * in engine/systems/statistics.ts, nothing computed ad hoc in this
 * component beyond simple sums/formatting.
 */
export function StatisticsPanel() {
  const game = useStatecraftStore((s) => s.game);

  if (!game) return null;

  const player = game.politicians.find((p) => p.isPlayer);
  const industry = computeIndustrySummary(game);
  const market = computeMarketSummary(game);
  const judiciary = computeJudiciarySummary(game);
  const diplomacy = computeDiplomacySummary(game);
  const movements = computeMovementsSummary(game);
  const government = computeGovernmentSummary(game);

  const totalRawStockpile = sumRecord(game.rawResourceStockpile);
  const totalStateGoods = sumRecord(game.stateGoodsStockpile);
  const totalPrivateGoods = sumRecord(game.privateGoodsStockpile);
  const filledCabinetSeats = game.cabinet.length;
  const unresolvedScandals = game.scandals.filter((s) => s.status === 'unresolved').length;
  const totalPersonalWealth = sumRecord(game.personalWealth);

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <h2>{game.country.name} — Full Country Statistics</h2>
          <span className="muted">{titleCase(game.country.regimeType)} · Turn {game.turn}</span>
        </div>
        <p className="muted">
          Every number below is live state, moved by the decisions you've actually made — bills passed, wars fought,
          investments made, elections run — not a cosmetic readout.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Economy</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="GDP Growth" value={`${num(game.economy.gdpGrowth)}%`} />
          <Indicator label="Inflation" value={`${num(game.economy.inflation)}%`} />
          <Indicator label="Unemployment" value={`${num(game.economy.unemployment)}%`} />
          <Indicator label="Debt / GDP" value={`${num(game.economy.debtToGdp)}%`} />
          <Indicator label="Budget Balance" value={`${num(game.economy.budgetBalance)}% GDP`} />
          <Indicator label="Pending Effects" value={game.economy.pendingEffects.length} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Demographics</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Population" value={`${num(game.demographics.population, 0)}k`} />
          <Indicator label="Natural Growth" value={`${num(game.demographics.naturalGrowthRate, 2)}%`} />
          <Indicator label="Net Migration" value={`${num(game.demographics.netMigrationRate, 2)}%`} />
          <Indicator label="Immigration Policy" value={titleCase(game.demographics.policy)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Healthcare, Education &amp; Welfare</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Life Expectancy" value={num(game.socialPolicy.lifeExpectancy)} />
          <Indicator label="Literacy Rate" value={`${num(game.socialPolicy.literacyRate)}%`} />
          <Indicator label="Poverty Rate" value={`${num(game.socialPolicy.povertyRate)}%`} />
          <Indicator label="Healthcare Funding" value={titleCase(game.socialPolicy.healthcareFunding)} />
          <Indicator label="Education Funding" value={titleCase(game.socialPolicy.educationFunding)} />
          <Indicator label="Welfare Funding" value={titleCase(game.socialPolicy.welfareFunding)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Public Safety &amp; Crime</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Crime Rate" value={`${num(game.crime.crimeRate)}%`} />
          <Indicator label="Incarceration Rate" value={`${num(game.crime.incarcerationRate)}%`} />
          <Indicator label="Policing Funding" value={titleCase(game.crime.policingFunding)} />
          <Indicator label="Organized Crime" value={`${num(game.crime.organizedCrimeInfluence)}%`} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Environment</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Pollution Index" value={num(game.environment.pollutionIndex)} />
          <Indicator label="Renewable Share" value={`${num(game.environment.renewableShare)}%`} />
          <Indicator label="Energy Policy" value={titleCase(game.environment.energyPolicy)} />
          <Indicator label="Green Investment" value={num(game.environment.greenInvestmentCapability)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Infrastructure</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Transport" value={num(game.infrastructure.transport, 0)} />
          <Indicator label="Power" value={num(game.infrastructure.power, 0)} />
          <Indicator label="Water" value={num(game.infrastructure.water, 0)} />
          <Indicator label="Digital" value={num(game.infrastructure.digital, 0)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Research &amp; Technology</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Capability" value={num(game.research.capability, 0)} />
          <Indicator label="Accumulated Points" value={num(game.research.accumulatedPoints, 0)} />
          <Indicator label="Unlocked Techs" value={game.research.unlockedTechIds.length} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Military &amp; Intelligence</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Strength" value={num(game.playerMilitary.strength, 0)} />
          <Indicator label="Personnel" value={`${num(game.playerMilitary.personnel, 0)}k`} />
          <Indicator label="Tech Level" value={num(game.playerMilitary.techLevel, 0)} />
          <Indicator label="Intelligence Capability" value={num(game.intelligenceCapability, 0)} />
          <Indicator label="Active Wars" value={diplomacy.activeWars} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Industry &amp; Resources</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Mines" value={industry.mineCount} />
          <Indicator label="Avg. Mine Tier" value={num(industry.averageMineTier, 1)} />
          <Indicator label="Factories" value={industry.factoryCount} />
          <Indicator label="Avg. Factory Tier" value={num(industry.averageFactoryTier, 1)} />
          <Indicator label="Resource Deposits" value={industry.depositCount} />
          <Indicator label="Logistics Capability" value={num(game.logisticsNetwork.capability, 0)} />
          <Indicator label="Raw Stockpile (units)" value={num(totalRawStockpile, 0)} />
          <Indicator label="State Goods (units)" value={num(totalStateGoods, 0)} />
          <Indicator label="Private Goods (units)" value={num(totalPrivateGoods, 0)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Markets &amp; Enterprise</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Companies" value={market.companyCount} />
          <Indicator label="Publicly Traded" value={market.publicCompanyCount} />
          <Indicator label="Total Market Cap" value={num(market.totalMarketCap, 0)} />
          <Indicator label="Personal Wealth (all)" value={num(totalPersonalWealth, 0)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Government &amp; Legislature</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Total Seats" value={government.totalSeats} />
          <Indicator label="Laws Passed" value={government.billsPassedTotal} />
          <Indicator label="Bills In Flight" value={government.billsInFlight} />
          <Indicator label="Cabinet Filled" value={`${filledCabinetSeats}/4`} />
          <Indicator label="Governing Form" value={game.coalition ? 'Coalition' : 'Single-Party'} />
        </div>
        <div className="whip-table-wrap">
          <table className="whip-table">
            <thead>
              <tr>
                <th>Party</th>
                <th>Seats</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {game.parties.map((party) => (
                <tr key={party.id}>
                  <td>{party.name}</td>
                  <td>{party.seats}</td>
                  <td>{government.totalSeats > 0 ? num((party.seats / government.totalSeats) * 100, 1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Judiciary</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Confirmed Justices" value={judiciary.confirmedSeats} />
          <Indicator label="Nominated" value={judiciary.nominatedSeats} />
          <Indicator label="Vacant" value={judiciary.vacantSeats} />
          <Indicator label="Avg. Integrity" value={num(judiciary.averageJusticeIntegrity, 1)} />
          <Indicator label="Cases Pending" value={judiciary.reviewCasesPending} />
          <Indicator label="Bills Struck Down" value={judiciary.reviewCasesStruckDown} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Diplomacy &amp; Foreign Relations</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Avg. Foreign Relations" value={num(diplomacy.averageForeignRelations, 1)} />
          <Indicator label="Active Treaties" value={diplomacy.activeTreaties} />
          <Indicator label="Active Trade Deals" value={diplomacy.activeTradeDeals} />
          <Indicator label="Active Wars" value={diplomacy.activeWars} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Public Opinion</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Public Approval" value={`${num(player?.approval.public ?? 50, 0)}%`} />
          <Indicator label="Base Approval" value={`${num(player?.approval.base ?? 50, 0)}%`} />
          <Indicator label="Party Elite Approval" value={`${num(player?.approval.partyElite ?? 50, 0)}%`} />
        </div>
        <div className="whip-table-wrap">
          <table className="whip-table">
            <thead>
              <tr>
                <th>Voter Bloc</th>
                <th>Size</th>
                <th>Persuadability</th>
              </tr>
            </thead>
            <tbody>
              {game.voterBlocs.map((bloc) => (
                <tr key={bloc.id}>
                  <td>{bloc.name}</td>
                  <td>{num(bloc.size * 100, 1)}%</td>
                  <td>{num(bloc.persuadability * 100, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Media &amp; Social Media</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Media Outlets" value={game.mediaOutlets.length} />
          <Indicator label="Chirp Followers" value={num(game.socialMedia.followerCount, 0)} />
          <Indicator label="Chirp Posts" value={game.socialMedia.posts.length} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Corruption &amp; Unrest</h3>
        </div>
        <div className="indicator-grid">
          <Indicator label="Unresolved Scandals" value={unresolvedScandals} />
          <Indicator label="Total Scandals" value={game.scandals.length} />
          <Indicator label="Active Protests" value={game.protests.filter((p) => p.status === 'protesting' || p.status === 'riot').length} />
          <Indicator label="Grassroots Movements" value={movements.count} />
          <Indicator label="Movement Members (abstracted)" value={num(movements.totalSize, 0)} />
        </div>
      </section>
    </>
  );
}
