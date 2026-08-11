import { useState } from 'react';
import type { GameState, Party } from '../../engine';
import { partyColor } from '../partyColor';
import { useStatecraftStore } from '../store';

// Concentric-arc hemicycle layout — the same style real parliament seat
// charts use. Rows fan out from a minimum radius, each row's seat count
// scaled to its arc length so seat-to-seat spacing stays roughly constant
// across rows; seats are then assigned by sweeping all rows' positions
// left-to-right by angle and handing them out to parties ordered by
// economic ideology, so each party forms one contiguous wedge rather than
// being scattered across the chamber.
const ROW_STEP = 1;
const MIN_RADIUS = 4;
const SEAT_RADIUS = 0.4;

interface HemicycleSeat {
  x: number;
  y: number;
  partyId: string;
}

function layoutHemicycleSeats(parties: Party[]): HemicycleSeat[] {
  const totalSeats = parties.reduce((sum, p) => sum + Math.max(0, p.seats), 0);
  if (totalSeats <= 0) return [];

  let numRows = 1;
  let rowCapacity: number[] = [];
  while (true) {
    rowCapacity = [];
    for (let i = 0; i < numRows; i++) {
      const radius = MIN_RADIUS + i * ROW_STEP;
      rowCapacity.push(Math.floor((Math.PI * radius) / ROW_STEP) + 1);
    }
    if (rowCapacity.reduce((a, b) => a + b, 0) >= totalSeats || numRows >= 60) break;
    numRows++;
  }

  const totalCapacity = rowCapacity.reduce((a, b) => a + b, 0);
  let remaining = totalSeats;
  const seatsPerRow = rowCapacity.map((cap, i) => {
    if (i === rowCapacity.length - 1) return remaining;
    const share = Math.max(0, Math.min(cap, Math.round((cap / totalCapacity) * totalSeats)));
    remaining -= share;
    return share;
  });

  const slots: { x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < numRows; i++) {
    const radius = MIN_RADIUS + i * ROW_STEP;
    const n = seatsPerRow[i];
    if (n <= 0) continue;
    for (let s = 0; s < n; s++) {
      const t = n === 1 ? 0.5 : s / (n - 1);
      const angle = Math.PI - t * Math.PI;
      slots.push({ x: Math.cos(angle) * radius, y: -Math.sin(angle) * radius, angle });
    }
  }
  slots.sort((a, b) => b.angle - a.angle);

  const orderedParties = [...parties].filter((p) => p.seats > 0).sort((a, b) => a.ideology.economic - b.ideology.economic);
  const seatPartyIds: string[] = [];
  for (const p of orderedParties) for (let i = 0; i < p.seats; i++) seatPartyIds.push(p.id);

  return slots.map((slot, i) => ({ x: slot.x, y: slot.y, partyId: seatPartyIds[i] ?? '' }));
}

/**
 * The legislature's presiding officer, as far as the data model actually
 * tracks one: the recorded leader (partyLeaderId) of whichever party holds
 * the most seats. Returns null rather than guessing when either is missing.
 */
function findPresidingOfficer(game: GameState) {
  const largest = [...game.parties].sort((a, b) => b.seats - a.seats)[0];
  if (!largest) return null;
  const leaderId = game.partyLeaderId[largest.id];
  const leader = leaderId ? game.politicians.find((p) => p.id === leaderId) : undefined;
  if (!leader) return null;
  return { name: leader.name, partyName: largest.name };
}

export function ParliamentHemicycle() {
  const game = useStatecraftStore((s) => s.game);
  const [hoveredPartyId, setHoveredPartyId] = useState<string | null>(null);

  if (!game) return null;

  const totalSeats = game.parties.reduce((sum, p) => sum + Math.max(0, p.seats), 0);
  if (totalSeats <= 0) return null;

  const seats = layoutHemicycleSeats(game.parties);
  const maxRadius = seats.reduce((max, s) => Math.max(max, Math.hypot(s.x, s.y)), MIN_RADIUS) + SEAT_RADIUS;
  const viewMinX = -maxRadius;
  const viewMinY = -maxRadius;
  const viewWidth = maxRadius * 2;
  const viewHeight = maxRadius + SEAT_RADIUS * 2;

  const partyById = new Map(game.parties.map((p) => [p.id, p]));
  const rankedParties = [...game.parties].filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats);
  const presidingOfficer = findPresidingOfficer(game);
  const coalition = game.coalition && game.coalition.status === 'governing' ? game.coalition : null;
  const weeksUntilElection = Math.max(0, game.nextElectionTurn - game.turn);

  return (
    <section className="panel parliament-panel">
      <div className="panel-header">
        <h2>{game.country.legislature.name}</h2>
        <span className="muted">
          {totalSeats} seats · {rankedParties.length} {rankedParties.length === 1 ? 'party' : 'parties'} represented
        </span>
      </div>

      <div className="parliament-layout">
        <svg
          className="parliament-hemicycle"
          viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={`Seat chart for the ${game.country.legislature.name}`}
        >
          {seats.map((seat, i) => (
            <circle
              key={i}
              cx={seat.x}
              cy={seat.y}
              r={SEAT_RADIUS}
              fill={seat.partyId ? partyColor(seat.partyId) : '#3a4358'}
              opacity={hoveredPartyId && hoveredPartyId !== seat.partyId ? 0.22 : 1}
            />
          ))}
        </svg>

        <div className="parliament-info">
          <dl className="parliament-info-list">
            <div>
              <dt>Electoral system</dt>
              <dd>{game.country.legislature.electoralSystem === 'FPTP' ? 'First-past-the-post' : 'Party-list PR (D’Hondt)'}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>{totalSeats}</dd>
            </div>
            {presidingOfficer && (
              <div>
                <dt>Presiding officer</dt>
                <dd>
                  {presidingOfficer.name} <span className="muted">({presidingOfficer.partyName})</span>
                </dd>
              </div>
            )}
            {coalition && (
              <div>
                <dt>Governing coalition</dt>
                <dd>{coalition.memberPartyIds.map((id) => partyById.get(id)?.name ?? id).join(', ')}</dd>
              </div>
            )}
            <div>
              <dt>Next election</dt>
              <dd>
                {weeksUntilElection === 0
                  ? 'This week'
                  : `In ${weeksUntilElection} week${weeksUntilElection === 1 ? '' : 's'}`}
              </dd>
            </div>
          </dl>

          <ul className="parliament-party-list">
            {rankedParties.map((party) => (
              <li
                key={party.id}
                onMouseEnter={() => setHoveredPartyId(party.id)}
                onMouseLeave={() => setHoveredPartyId(null)}
              >
                <span className="parliament-party-swatch" style={{ background: partyColor(party.id) }} />
                <span className="parliament-party-name">{party.name}</span>
                <span className="parliament-party-seats">
                  {party.seats} <span className="muted">({((party.seats / totalSeats) * 100).toFixed(1)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
