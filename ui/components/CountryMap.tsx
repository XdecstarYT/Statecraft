import { useMemo } from 'react';
import { resolveFPTPDistrict } from '../../engine';
import { computeDistrictLayout, axialToPixel, hexPolygonPoints } from './hexLayout';
import { useStatecraftStore } from '../store';

const HEX_SIZE = 26;
const HEX_GAP = 2;

/** A stable, low-saturation color per party, hashed from its id — no hand-authored palette to keep in sync as parties merge/split/get founded mid-game. */
function partyColor(partyId: string): string {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 42%)`;
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
      <div className="country-map-empty">
        <p className="muted">
          {game.country.legislature.name} is elected by proportional representation — there are no
          single-member districts to map. See the National Assembly seat table for the party breakdown.
        </p>
      </div>
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

  const minX = Math.min(...points.map((p) => p.x)) - HEX_SIZE;
  const maxX = Math.max(...points.map((p) => p.x)) + HEX_SIZE;
  const minY = Math.min(...points.map((p) => p.y)) - HEX_SIZE;
  const maxY = Math.max(...points.map((p) => p.y)) + HEX_SIZE;
  const width = maxX - minX;
  const height = maxY - minY;

  const districtsById = new Map(districts.map((d) => [d.id, d]));

  return (
    <div className="country-map-wrap">
      <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="country-map-svg" role="img" aria-label="District map">
        {points.map((cell) => {
          const district = districtsById.get(cell.districtId);
          const winnerPartyId = winnerByDistrict.get(cell.districtId);
          const fill = winnerPartyId ? partyColor(winnerPartyId) : 'var(--bg-elevated-2)';
          const isSelected = cell.districtId === selectedDistrictId;
          return (
            <polygon
              key={cell.districtId}
              points={hexPolygonPoints(cell.x, cell.y, HEX_SIZE)}
              fill={fill}
              stroke={isSelected ? 'var(--accent)' : 'var(--border-soft)'}
              strokeWidth={isSelected ? 2.5 : 1}
              className="country-map-hex"
              onClick={() => onSelectDistrict?.(cell.districtId)}
            >
              <title>{district?.name ?? cell.districtId}</title>
            </polygon>
          );
        })}
      </svg>
    </div>
  );
}
