import { getProvinces } from '../../engine';
import { useStatecraftStore } from '../store';

/**
 * Every domestic province's own governing administration — governor,
 * ruling party, approval, and when their term is next up — read straight
 * off GameState.stateGovernments (see engine/systems/stateGovernance.ts).
 * Purely a renderer: nothing here is computed ad hoc.
 */
export function StateGovernancePanel() {
  const game = useStatecraftStore((s) => s.game);
  if (!game) return null;

  const provinces = getProvinces(game.country);
  const provinceNameById = new Map(provinces.map((p) => [p.id, p.name]));
  const partyById = new Map(game.parties.map((p) => [p.id, p]));

  if (game.stateGovernments.length === 0) return null;

  const recentHistory = [...game.stateElectionHistory].reverse().slice(0, 8);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>State &amp; Provincial Governments</h2>
        <span className="muted">{game.stateGovernments.length} provinces, each electing its own governor</span>
      </div>
      <div className="whip-table-wrap">
        <table className="whip-table">
          <thead>
            <tr>
              <th>Province</th>
              <th>Governor</th>
              <th>Party</th>
              <th>Approval</th>
              <th>Terms</th>
              <th>Next Election</th>
            </tr>
          </thead>
          <tbody>
            {game.stateGovernments.map((gov) => {
              const party = partyById.get(gov.partyId);
              return (
                <tr key={gov.provinceId}>
                  <td>{provinceNameById.get(gov.provinceId) ?? gov.provinceName}</td>
                  <td>{gov.governorName}</td>
                  <td>{party?.name ?? 'Independent'}</td>
                  <td>
                    <div className="score-bar-label">{Math.round(gov.approval)}%</div>
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: `${gov.approval}%` }} />
                    </div>
                  </td>
                  <td>{gov.termsServed}</td>
                  <td>Turn {gov.nextElectionTurn}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {recentHistory.length > 0 && (
        <>
          <h3>Recent Gubernatorial Elections</h3>
          <ul className="coverage-list">
            {recentHistory.map((result, i) => {
              const previousParty = partyById.get(result.previousPartyId)?.name ?? 'an unaffiliated bloc';
              const newParty = partyById.get(result.newPartyId)?.name ?? 'an unaffiliated bloc';
              return (
                <li key={`${result.provinceId}-${result.turn}-${i}`} className="coverage-item frame-neutral">
                  <span className="coverage-outlet">Turn {result.turn} — {result.provinceName}</span>
                  <p className="coverage-headline">
                    {result.incumbentPartyRetained
                      ? `${newParty} held the governorship — ${result.newGovernorName} elected.`
                      : `Flipped from ${previousParty} to ${newParty} — ${result.newGovernorName} elected governor.`}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
