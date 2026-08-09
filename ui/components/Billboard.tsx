import { Suspense, lazy, useEffect, useState } from 'react';
import { computeRunningTally, getProvinces, type GameState } from '../../engine';
import { useStatecraftStore } from '../store';
import type { EconomySnapshot } from '../store';

const EconomyChart = lazy(() => import('./EconomyChart'));

/** How many weeks out the billboard starts flagging the scheduled election. */
const ELECTION_WEEK_LOOKAHEAD = 4;
/** Roughly 1 week in 4 shows a bulletin instead of the chart, if there's news to show. */
const BULLETIN_INTERVAL = 4;

type BillboardMode = 'chart' | 'bulletin' | 'electionWeek' | 'electionNight';

const MODE_LABELS: Record<BillboardMode, string> = {
  chart: 'Economy',
  bulletin: 'Bulletin',
  electionWeek: 'Election Watch',
  electionNight: 'Election Night',
};

function computeDefaultMode(game: GameState): BillboardMode {
  if (game.electionNight) return 'electionNight';
  if (game.nextElectionTurn - game.turn <= ELECTION_WEEK_LOOKAHEAD) return 'electionWeek';
  if (game.turn % BULLETIN_INTERVAL === 0 && game.eventLog.length > 0) return 'bulletin';
  return 'chart';
}

/**
 * The dashboard's chart area doubles as a rotating billboard: the economy
 * chart most weeks, a news bulletin from the event log on some weeks, an
 * election-watch countdown once the scheduled election is close, and a
 * live compact results ticker whenever an election night is actually in
 * progress. The player can always override the auto-picked slide with the
 * tabs when more than one is available.
 */
export function Billboard() {
  const game = useStatecraftStore((s) => s.game);
  const economyHistory = useStatecraftStore((s) => s.economyHistory);
  const [manualMode, setManualMode] = useState<BillboardMode | null>(null);

  const turn = game?.turn;
  const electionNightStatus = game?.electionNight?.status;
  useEffect(() => {
    setManualMode(null);
  }, [turn, electionNightStatus]);

  if (!game) return null;

  const defaultMode = computeDefaultMode(game);
  const availableModes: BillboardMode[] = ['chart'];
  if (game.eventLog.length > 0) availableModes.push('bulletin');
  if (defaultMode === 'electionWeek') availableModes.push('electionWeek');
  if (defaultMode === 'electionNight') availableModes.push('electionNight');

  const mode = manualMode && availableModes.includes(manualMode) ? manualMode : defaultMode;

  return (
    <div className="billboard">
      {availableModes.length > 1 && (
        <div className="billboard-tabs">
          {availableModes.map((m) => (
            <button key={m} className={mode === m ? 'active' : ''} onClick={() => setManualMode(m)}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {mode === 'chart' && (
        <Suspense fallback={<div style={{ height: 260 }} />}>
          <EconomyChart data={economyHistory} />
        </Suspense>
      )}
      {mode === 'bulletin' && <BulletinSlide game={game} economyHistory={economyHistory} />}
      {mode === 'electionWeek' && <ElectionWeekSlide game={game} />}
      {mode === 'electionNight' && <ElectionNightSlide game={game} />}
    </div>
  );
}

function BulletinSlide({ game, economyHistory }: { game: GameState; economyHistory: EconomySnapshot[] }) {
  const latest = game.eventLog[game.eventLog.length - 1];
  if (!latest) {
    return <p className="muted">No news yet this term. {economyHistory.length} weeks on record.</p>;
  }
  return (
    <div className="billboard-slide">
      <span className="bill-status status-floor">{latest.category.replace(/_/g, ' ')}</span>
      <h3>{latest.title}</h3>
      <p className="muted">{latest.description}</p>
    </div>
  );
}

function ElectionWeekSlide({ game }: { game: GameState }) {
  const weeksUntil = Math.max(0, game.nextElectionTurn - game.turn);
  const totalSeats = game.parties.reduce((sum, p) => sum + p.seats, 0);

  return (
    <div className="billboard-slide">
      <span className="bill-status status-floor">
        {weeksUntil === 0 ? 'Election Due This Week' : `Election In ${weeksUntil} Week${weeksUntil === 1 ? '' : 's'}`}
      </span>
      <h3>{game.country.legislature.name} — Current Standings</h3>
      <div className="indicator-grid">
        {game.parties.map((party) => (
          <div className="indicator" key={party.id}>
            <div className="indicator-label">{party.name}</div>
            <div className="indicator-value">
              {totalSeats > 0 ? ((party.seats / totalSeats) * 100).toFixed(0) : '0'}%
            </div>
          </div>
        ))}
      </div>
      <p className="muted">Head to the Legislature tab to start election night.</p>
    </div>
  );
}

function ElectionNightSlide({ game }: { game: GameState }) {
  const night = game.electionNight;
  if (!night) return null;

  const provinces = getProvinces(game.country);
  const tally = computeRunningTally(night, provinces);
  const leaderEntry = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  const leaderParty = leaderEntry ? game.parties.find((p) => p.id === leaderEntry[0]) : null;
  const winnerParty = night.winnerPartyId ? game.parties.find((p) => p.id === night.winnerPartyId) : null;

  const tallyTotal = Object.values(tally).reduce((a, b) => a + b, 0);
  const countLabel = night.status === 'reporting' && night.system !== 'FPTP' ? 'votes' : 'seats';

  return (
    <div className="billboard-slide">
      <span className="bill-status status-active">Election Night — {night.status}</span>
      <h3>
        {night.status === 'concluded' && winnerParty
          ? `${winnerParty.name} Wins`
          : leaderParty
            ? `${leaderParty.name} Leading`
            : 'Awaiting First Returns'}
      </h3>
      <p className="muted">
        {night.reportedProvinceIds.length}/{night.reportingOrder.length} provinces reporting
        {tallyTotal > 0 && ` — ${tallyTotal} ${countLabel} counted`}
      </p>
      <p className="muted">See the Legislature tab for full live results.</p>
    </div>
  );
}
