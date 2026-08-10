import { Suspense, lazy } from 'react';
import { useStatecraftStore } from '../store';

// three.js is a large dependency — code-split so it only loads when a tab
// that actually needs the map is opened, same treatment the World tab's
// Globe already gets.
const CountryMapScene = lazy(() =>
  import('./CountryMapScene').then((m) => ({ default: m.CountryMapScene }))
);

/** A stable, vivid color per party, hashed from its id — kept in sync with the same hash CountryMapScene uses for the 3D tiles, just rendered as a flat CSS color for the 2D legend swatch. */
function partyColor(partyId: string): string {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 62%, 48%)`;
}

interface CountryMapProps {
  onSelectDistrict?: (districtId: string) => void;
  selectedDistrictId?: string | null;
}

/**
 * A 3D, stylized (not real-geography) hex-tile map of the player's own
 * legislature's districts — see CountryMapScene.tsx for the three.js
 * rendering itself. This wrapper owns the panel chrome, the PR-country
 * fallback (no single-member districts to map), and the party-seat legend.
 */
export function CountryMap({ onSelectDistrict, selectedDistrictId }: CountryMapProps) {
  const game = useStatecraftStore((s) => s.game);
  const lastElection = useStatecraftStore((s) => s.lastElection);

  if (!game) return null;

  const districts = game.country.legislature.districts;

  if (districts.length === 0) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>District Map</h2>
        </div>
        <div className="country-map-empty">
          <p className="muted">
            {game.country.legislature.name} is elected by proportional representation — there are no
            single-member districts to map. See the National Assembly seat table for the party breakdown.
          </p>
        </div>
      </section>
    );
  }

  const winningPartyIds = lastElection?.districtResults
    ? new Set(
        lastElection.districtResults.map((result) => {
          let best: { partyId: string; votes: number } | null = null;
          for (const [partyId, votes] of Object.entries(result.votesByParty)) {
            if (!best || votes > best.votes) best = { partyId, votes };
          }
          return best?.partyId ?? '';
        })
      )
    : new Set<string>();

  const legendParties = [...game.parties].filter((p) => winningPartyIds.has(p.id)).sort((a, b) => b.seats - a.seats);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>District Map</h2>
        <span className="muted">
          {lastElection?.districtResults
            ? "Colored by the last election's district winners · drag to orbit, scroll to zoom"
            : 'Drag to orbit, scroll to zoom · run an election to see results here'}
        </span>
      </div>

      <Suspense fallback={<div className="country-map-3d-container" />}>
        <CountryMapScene onSelectDistrict={onSelectDistrict} selectedDistrictId={selectedDistrictId} />
      </Suspense>

      {legendParties.length > 0 && (
        <div className="country-map-legend">
          {legendParties.map((party) => (
            <span className="country-map-legend-item" key={party.id}>
              <span className="country-map-legend-swatch" style={{ background: partyColor(party.id) }} />
              {party.name} ({party.seats})
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
