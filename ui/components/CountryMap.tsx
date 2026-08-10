import { useMemo } from 'react';
import { resolveFPTPDistrict } from '../../engine';
import { computeDistrictLayout, axialToPixel, hexPolygonPoints } from './hexLayout';
import { useStatecraftStore } from '../store';

const HEX_SIZE = 27;
const HEX_GAP = 3;

/** A stable, vivid color per party, hashed from its id — no hand-authored palette to keep in sync as parties merge/split/get founded mid-game. */
function partyColor(partyId: string): string {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 68%, 52%)`;
}

function partyColorDark(partyId: string): string {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 34%)`;
}

interface CountryMapProps {
  onSelectDistrict?: (districtId: string) => void;
  selectedDistrictId?: string | null;
}

/**
 * A stylized hex-grid map of the player's own legislature's districts — not
 * real geography (Statecraft never tracks real boundary data for any
 * country, including custom/fictional ones), just a deterministic, organic
 * arrangement from hexLayout.ts. Each hex is colored by whichever party won
 * that district in the most recent FPTP election this session; before any
 * election has run, or for PR countries with no single-member districts,
 * it falls back to a neutral, uncolored grid or a short explanatory note.
 */
export function CountryMap({ onSelectDistrict, selectedDistrictId }: CountryMapProps) {
  const game = useStatecraftStore((s) => s.game);
  const lastElection = useStatecraftStore((s) => s.lastElection);

  const districts = game?.country.legislature.districts ?? [];
  const layout = useMemo(() => computeDistrictLayout(districts.map((d) => d.id)), [districts]);

  if (!game) return null;

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

  const winnerByDistrict = new Map<string, string>();
  if (lastElection?.districtResults) {
    for (const result of lastElection.districtResults) {
      winnerByDistrict.set(result.districtId, resolveFPTPDistrict(result));
    }
  }

  const points = layout.map((cell) => {
    const { x, y } = axialToPixel(cell.q, cell.r, HEX_SIZE + HEX_GAP);
    return { ...cell, x, y };
  });

  const minX = Math.min(...points.map((p) => p.x)) - HEX_SIZE - 8;
  const maxX = Math.max(...points.map((p) => p.x)) + HEX_SIZE + 8;
  const minY = Math.min(...points.map((p) => p.y)) - HEX_SIZE - 8;
  const maxY = Math.max(...points.map((p) => p.y)) + HEX_SIZE + 8;
  const width = maxX - minX;
  const height = maxY - minY;

  const districtsById = new Map(districts.map((d) => [d.id, d]));

  // Legend: every party that currently holds at least one district, in seat order.
  const legendParties = lastElection?.districtResults
    ? [...game.parties]
        .filter((p) => [...winnerByDistrict.values()].includes(p.id))
        .sort((a, b) => b.seats - a.seats)
    : [];

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>District Map</h2>
        <span className="muted">
          {lastElection?.districtResults ? 'Colored by the last election\'s district winners' : 'Run an election to see results here'}
        </span>
      </div>

      <div className="country-map-wrap">
        <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="country-map-svg" role="img" aria-label="District map">
          <defs>
            <radialGradient id="country-map-vignette" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="rgba(148,163,184,0.08)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0)" />
            </radialGradient>
            <filter id="country-map-hex-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
            </filter>
            {[...winnerByDistrict.values()].filter((v, i, arr) => arr.indexOf(v) === i).map((partyId) => (
              <radialGradient key={partyId} id={`country-map-fill-${partyId}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor={partyColor(partyId)} />
                <stop offset="100%" stopColor={partyColorDark(partyId)} />
              </radialGradient>
            ))}
          </defs>

          <rect x={minX} y={minY} width={width} height={height} fill="url(#country-map-vignette)" />

          <g filter="url(#country-map-hex-shadow)">
            {points.map((cell) => {
              const district = districtsById.get(cell.districtId);
              const winnerPartyId = winnerByDistrict.get(cell.districtId);
              const fill = winnerPartyId ? `url(#country-map-fill-${winnerPartyId})` : 'var(--bg-elevated)';
              const isSelected = cell.districtId === selectedDistrictId;
              return (
                <polygon
                  key={cell.districtId}
                  points={hexPolygonPoints(cell.x, cell.y, HEX_SIZE)}
                  fill={fill}
                  stroke={isSelected ? 'var(--accent)' : 'rgba(8,12,20,0.55)'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeLinejoin="round"
                  className="country-map-hex"
                  onClick={() => onSelectDistrict?.(cell.districtId)}
                >
                  <title>{district?.name ?? cell.districtId}</title>
                </polygon>
              );
            })}
          </g>
        </svg>
      </div>

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
