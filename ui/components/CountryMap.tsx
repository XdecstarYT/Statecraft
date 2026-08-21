import { Suspense, lazy } from 'react';
import { computeDistrictLean, computeIdeologicalVoteShares, type District, type Party, type VoterBloc } from '../../engine';
import { partyColor } from '../partyColor';
import { useStatecraftStore } from '../store';

// three.js is a large dependency — code-split so it only loads when a tab
// that actually needs the map is opened, same treatment the World tab's
// Globe already gets.
const CountryMapScene = lazy(() =>
  import('./CountryMapScene').then((m) => ({ default: m.CountryMapScene }))
);

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

      {selectedDistrictId && (
        <DistrictProfile
          district={districts.find((d) => d.id === selectedDistrictId) ?? null}
          parties={game.parties}
          voterBlocs={game.voterBlocs}
        />
      )}

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

/**
 * A district's persistent political character, made visible: its
 * deterministic ideological lean (see engine/systems/elections.ts's
 * computeDistrictLean) and, from that, how well each party's own ideology
 * actually fits its voters — the same real signal generateDistrictVotes
 * now blends into every election, not just a cosmetic readout.
 */
function DistrictProfile({
  district,
  parties,
  voterBlocs,
}: {
  district: District | null;
  parties: Party[];
  voterBlocs: VoterBloc[];
}) {
  if (!district) return null;

  const lean = computeDistrictLean(district.id);
  const shares = voterBlocs.length > 0 ? computeIdeologicalVoteShares(parties, voterBlocs, lean) : null;
  const ranked = shares ? [...parties].sort((a, b) => (shares[b.id] ?? 0) - (shares[a.id] ?? 0)) : [];

  return (
    <div className="district-profile">
      <div className="panel-header">
        <h3>{district.name}</h3>
        <span className="muted">
          District lean: {lean.economic >= 0 ? '+' : ''}
          {lean.economic.toFixed(0)} economic, {lean.social >= 0 ? '+' : ''}
          {lean.social.toFixed(0)} social
        </span>
      </div>
      {shares ? (
        <ul className="district-profile-list">
          {ranked.map((party) => (
            <li key={party.id}>
              <span>{party.name}</span>
              <span>{((shares[party.id] ?? 0) * 100).toFixed(1)}% natural fit</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No voter blocs recorded for this country — ideological fit can't be estimated.</p>
      )}
    </div>
  );
}
