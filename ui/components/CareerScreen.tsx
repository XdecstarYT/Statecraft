import { useState } from 'react';
import {
  EDUCATION_TRACKS,
  JOB_LISTINGS,
  CAMPAIGN_ACTIVITIES,
  CITIZEN_INITIATIVE_COST,
  PARTY_OFFICER_STANDING_REQUIREMENT,
  computeCareerAge,
  computeNominationProbability,
  computePartyLeadershipProbability,
  computePersonalAppeal,
  type CampaignActivityOutcome,
  type CampaignActivityType,
  type CareerState,
  type CitizenInitiativeOutcome,
  type EducationTrack,
  type GovernanceOutcome,
  type IdeologyPosition,
  type LocalRaceOutcome,
  type NominationOutcome,
  type Party,
  type PartyLeadershipOutcome,
  type PartyWorkOutcome,
} from '../../engine';
import { STARTER_COUNTRY_OPTIONS } from '../../content/countries/registry';
import { CITIZEN_ISSUE_TEMPLATES } from '../../content/career/issues';
import {
  CAMPAIGN_ACTIVITY_FLAVOR,
  CITIZEN_INITIATIVE_FAIL_FLAVOR,
  CITIZEN_INITIATIVE_PASS_FLAVOR,
  EDUCATION_START_FLAVOR,
  GOVERNANCE_FLAVOR,
  LOCAL_RACE_LOSS_FLAVOR,
  LOCAL_RACE_WIN_FLAVOR,
  NOMINATION_REJECTION_FLAVOR,
  NOMINATION_SUCCESS_FLAVOR,
  PARTY_LEADERSHIP_LOSS_FLAVOR,
  PARTY_LEADERSHIP_WIN_FLAVOR,
  PARTY_WORK_FLAVOR,
  REGIONAL_RACE_LOSS_FLAVOR,
  REGIONAL_RACE_WIN_FLAVOR,
  pickFlavorIndex,
} from '../../content/career/flavor';
import { useStatecraftStore } from '../store';

const STAGE_LABELS: Record<string, string> = {
  student: 'Student',
  working: 'Working',
  party_volunteer: 'Party Volunteer',
  local_officeholder: 'Local Officeholder',
  regional_officeholder: 'Regional Officeholder',
  graduated: 'Graduated',
};

const RELATIONSHIP_LABELS: Record<CareerState['relationshipStatus'], string> = {
  single: 'Single',
  dating: 'Dating',
  married: 'Married',
  divorced: 'Divorced',
};

export function CareerScreen() {
  const career = useStatecraftStore((s) => s.career);
  const saveGame = useStatecraftStore((s) => s.saveGame);
  const abandonCareer = useStatecraftStore((s) => s.abandonCareer);
  const careerAdvanceTurnAction = useStatecraftStore((s) => s.careerAdvanceTurnAction);
  const careerStartEducationAction = useStatecraftStore((s) => s.careerStartEducationAction);
  const careerApplyForJobAction = useStatecraftStore((s) => s.careerApplyForJobAction);
  const careerJoinPartyAction = useStatecraftStore((s) => s.careerJoinPartyAction);
  const careerFoundOwnPartyAction = useStatecraftStore((s) => s.careerFoundOwnPartyAction);
  const careerDoPartyWorkAction = useStatecraftStore((s) => s.careerDoPartyWorkAction);
  const careerAttemptLocalRaceAction = useStatecraftStore((s) => s.careerAttemptLocalRaceAction);
  const careerAttemptRegionalRaceAction = useStatecraftStore((s) => s.careerAttemptRegionalRaceAction);
  const careerDoLocalGovernanceAction = useStatecraftStore((s) => s.careerDoLocalGovernanceAction);
  const careerAttemptNominationAction = useStatecraftStore((s) => s.careerAttemptNominationAction);
  const careerAttemptCitizenInitiativeAction = useStatecraftStore((s) => s.careerAttemptCitizenInitiativeAction);
  const careerRunCampaignActivityAction = useStatecraftStore((s) => s.careerRunCampaignActivityAction);
  const careerAttemptPartyLeadershipBidAction = useStatecraftStore((s) => s.careerAttemptPartyLeadershipBidAction);
  const careerRestAndRecoverAction = useStatecraftStore((s) => s.careerRestAndRecoverAction);
  const lastPartyWork = useStatecraftStore((s) => s.lastCareerPartyWorkOutcome);
  const lastLocalRace = useStatecraftStore((s) => s.lastCareerLocalRaceOutcome);
  const lastRegionalRace = useStatecraftStore((s) => s.lastCareerRegionalRaceOutcome);
  const lastGovernance = useStatecraftStore((s) => s.lastCareerGovernanceOutcome);
  const lastNomination = useStatecraftStore((s) => s.lastCareerNominationOutcome);
  const lastCitizenInitiative = useStatecraftStore((s) => s.lastCareerCitizenInitiativeOutcome);
  const lastCampaignActivity = useStatecraftStore((s) => s.lastCareerCampaignActivityOutcome);
  const lastPartyLeadership = useStatecraftStore((s) => s.lastCareerPartyLeadershipOutcome);

  const [statusMessage, setStatusMessage] = useState('');

  if (!career) return null;

  const option = STARTER_COUNTRY_OPTIONS.find((o) => o.id === career.countryOptionId) ?? STARTER_COUNTRY_OPTIONS[0];
  const age = computeCareerAge(career.turn);
  const appeal = computePersonalAppeal(career.attributes, career.partyStanding, career.civicRecord, career.campaignMomentum);
  const partyLeadershipProbability = career.partyId ? computePartyLeadershipProbability(career) : 0;
  const nominationProbability = career.partyId ? computeNominationProbability(career) : 0;

  const flashStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Statecraft</h1>
        <span className="seed-tag">
          {career.name} &middot; Age {age.toFixed(1)} &middot; {option.label}
        </span>
        {statusMessage && <span className="status-flash">{statusMessage}</span>}
        <div className="header-actions">
          <button onClick={() => { saveGame(); flashStatus('Saved'); }}>Save Career</button>
          <button className="danger-button" onClick={abandonCareer}>
            Abandon Career
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>{career.name} — {STAGE_LABELS[career.stage]}</h2>
          <div className="row-actions">
            <button className="ghost-button" onClick={careerRestAndRecoverAction}>Rest &amp; Recover</button>
            <button onClick={careerAdvanceTurnAction}>Advance Season</button>
          </div>
        </div>

        <div className="indicator-grid">
          <div className="indicator">
            <div className="indicator-label">Age</div>
            <div className="indicator-value">{age.toFixed(1)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Money</div>
            <div className="indicator-value">${career.money.toFixed(0)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Health</div>
            <div className="indicator-value">{career.health.toFixed(0)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Personal Life</div>
            <div className="indicator-value">{RELATIONSHIP_LABELS[career.relationshipStatus]}{career.hasChildren ? ' + Kid' : ''}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Party Standing</div>
            <div className="indicator-value">{career.partyStanding.toFixed(0)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Civic Record</div>
            <div className="indicator-value">{career.civicRecord.toFixed(0)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Campaign Momentum</div>
            <div className="indicator-value">{career.campaignMomentum.toFixed(0)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Personal Appeal</div>
            <div className="indicator-value">{(appeal * 100).toFixed(0)}%</div>
          </div>
        </div>

        {career.health < 30 && (
          <p className="result-fail">Burnout is dragging down how much your work and study actually pay off. Consider resting.</p>
        )}

        <h4 className="subheading">Attributes</h4>
        <div className="indicator-grid">
          <div className="indicator">
            <div className="indicator-label">Charisma</div>
            <div className="indicator-value">{career.attributes.charisma.toFixed(1)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Intellect</div>
            <div className="indicator-value">{career.attributes.intellect.toFixed(1)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Integrity</div>
            <div className="indicator-value">{career.attributes.integrity.toFixed(1)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Network</div>
            <div className="indicator-value">{career.attributes.network.toFixed(1)}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Media Savvy</div>
            <div className="indicator-value">{career.attributes.mediaSavvy.toFixed(1)}</div>
          </div>
        </div>

        {career.eventLog.length > 0 && (
          <>
            <h4 className="subheading">Life &amp; Career Log</h4>
            <ul className="scandal-list">
              {career.eventLog
                .slice(-6)
                .reverse()
                .map((entry, i) => (
                  <li key={i} className="scandal-item status-resolved">
                    <span>
                      Season {entry.turn} — <strong>{entry.title}</strong> — {entry.description}
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

      <CitizenInitiativeSection
        career={career}
        onAttempt={careerAttemptCitizenInitiativeAction}
        lastOutcome={lastCitizenInitiative}
      />

      <div className="panel-columns">
        <EducationSection career={career} onStart={careerStartEducationAction} onApplyForJob={careerApplyForJobAction} />
        <PartySection
          career={career}
          parties={option.parties}
          onJoin={careerJoinPartyAction}
          onFound={careerFoundOwnPartyAction}
          onDoPartyWork={careerDoPartyWorkAction}
          lastPartyWork={lastPartyWork}
          leadershipProbability={partyLeadershipProbability}
          onSeekLeadership={careerAttemptPartyLeadershipBidAction}
          lastLeadershipOutcome={lastPartyLeadership}
        />
      </div>

      <CampaignSection career={career} onRun={careerRunCampaignActivityAction} lastOutcome={lastCampaignActivity} />

      <div className="panel-columns">
        <LocalRaceSection career={career} onAttempt={careerAttemptLocalRaceAction} lastOutcome={lastLocalRace} />
        <RegionalRaceSection career={career} onAttempt={careerAttemptRegionalRaceAction} lastOutcome={lastRegionalRace} />
      </div>

      <div className="panel-columns">
        <LocalGovernanceSection career={career} onGovern={careerDoLocalGovernanceAction} lastOutcome={lastGovernance} />
        <NominationSection
          career={career}
          probability={nominationProbability}
          onAttempt={() => careerAttemptNominationAction()}
          lastOutcome={lastNomination}
        />
      </div>
    </main>
  );
}

function EducationSection({
  career,
  onStart,
  onApplyForJob,
}: {
  career: CareerState;
  onStart: (track: EducationTrack) => void;
  onApplyForJob: (jobId: string) => void;
}) {
  const tracks = Object.values(EDUCATION_TRACKS);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Education &amp; Work</h2>
      </div>

      {career.educationTrack ? (
        <p className="muted">
          Studying: <strong>{EDUCATION_TRACKS[career.educationTrack].label}</strong> —{' '}
          {career.educationTurnsRemaining} season{career.educationTurnsRemaining === 1 ? '' : 's'} remaining.
          <br />
          &ldquo;{EDUCATION_START_FLAVOR[career.educationTrack]}&rdquo;
        </p>
      ) : (
        <div className="bill-actions">
          {tracks.map((track) => {
            const available =
              !track.prerequisite || career.completedEducationTracks.includes(track.prerequisite);
            return (
              <button key={track.id} disabled={!available} onClick={() => onStart(track.id)}>
                {track.label} ({track.durationTurns} seasons)
              </button>
            );
          })}
        </div>
      )}
      {career.completedEducationTracks.length > 0 && (
        <p className="muted">
          Completed: {career.completedEducationTracks.map((t) => EDUCATION_TRACKS[t].label).join(', ')}
        </p>
      )}

      <h4 className="subheading">Job</h4>
      {career.jobId ? (
        <p className="muted">
          Currently: <strong>{JOB_LISTINGS.find((j) => j.id === career.jobId)?.title}</strong>
        </p>
      ) : (
        <p className="muted">Unemployed.</p>
      )}
      <div className="bill-actions">
        {JOB_LISTINGS.map((job) => {
          const meetsEducation = !job.requiresEducation || career.completedEducationTracks.includes(job.requiresEducation);
          const meetsParty = !job.requiresParty || !!career.partyId;
          const available = meetsEducation && meetsParty && career.jobId !== job.id;
          return (
            <button key={job.id} disabled={!available} onClick={() => onApplyForJob(job.id)}>
              {job.title} (${job.incomePerTurn}/season)
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PartySection({
  career,
  parties,
  onJoin,
  onFound,
  onDoPartyWork,
  lastPartyWork,
  leadershipProbability,
  onSeekLeadership,
  lastLeadershipOutcome,
}: {
  career: CareerState;
  parties: Party[];
  onJoin: (partyId: string) => void;
  onFound: (partyId: string, name: string) => void;
  onDoPartyWork: () => void;
  lastPartyWork: PartyWorkOutcome | null;
  leadershipProbability: number;
  onSeekLeadership: () => void;
  lastLeadershipOutcome: PartyLeadershipOutcome | null;
}) {
  const party = career.foundedParty ?? parties.find((p) => p.id === career.partyId);
  const [newPartyName, setNewPartyName] = useState('');

  const handleFound = () => {
    const trimmed = newPartyName.trim();
    if (!trimmed) return;
    const id = `career-party-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    onFound(id, trimmed);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Party</h2>
      </div>

      {!party && (
        <>
          <p className="muted">Get involved with a party to start building standing — or found your own.</p>
          <div className="bill-actions">
            {parties.map((p) => (
              <button key={p.id} onClick={() => onJoin(p.id)}>
                Join {p.name}
              </button>
            ))}
          </div>
          <div className="custom-bill-form">
            <label>
              Found Your Own Party
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="The New Way"
              />
            </label>
            <div className="row-actions">
              <button onClick={handleFound} disabled={!newPartyName.trim()}>
                Found Party
              </button>
            </div>
          </div>
        </>
      )}

      {party && (
        <>
          <p className="muted">
            {career.foundedParty ? 'Leading' : 'Volunteering with'} <strong>{party.name}</strong>
            {career.foundedParty && ' — your own party.'}
          </p>
          <div className="score-bar">
            <div className="score-bar-label">
              <span>Party Standing</span>
              <span>{career.partyStanding.toFixed(0)}</span>
            </div>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, career.partyStanding))}%` }} />
            </div>
          </div>
          <div className="bill-actions">
            <button onClick={onDoPartyWork}>Do Party Work</button>
          </div>
          {lastPartyWork && (
            <p className={lastPartyWork.outcome === 'setback' ? 'result-fail' : 'result-pass'}>
              {PARTY_WORK_FLAVOR[lastPartyWork.outcome][
                pickFlavorIndex(`${career.turn}-work`, PARTY_WORK_FLAVOR[lastPartyWork.outcome].length)
              ]}{' '}
              ({lastPartyWork.standingDelta >= 0 ? '+' : ''}
              {lastPartyWork.standingDelta.toFixed(0)} standing)
            </p>
          )}

          <h4 className="subheading">Party Leadership</h4>
          {career.partyOfficer ? (
            <p className="muted">You hold a formal officer post in the party — a floor under your standing, not just goodwill.</p>
          ) : career.partyStanding >= PARTY_OFFICER_STANDING_REQUIREMENT ? (
            <>
              <p className="muted">
                Estimated odds the delegates seat you as an officer: <strong>{(leadershipProbability * 100).toFixed(0)}%</strong>
              </p>
              <div className="bill-actions">
                <button onClick={onSeekLeadership}>Seek Party Leadership</button>
              </div>
            </>
          ) : (
            <p className="muted">Reach {PARTY_OFFICER_STANDING_REQUIREMENT} party standing to make a leadership bid.</p>
          )}
          {lastLeadershipOutcome && (
            <p className={lastLeadershipOutcome.won ? 'result-pass' : 'result-fail'}>
              {(lastLeadershipOutcome.won ? PARTY_LEADERSHIP_WIN_FLAVOR : PARTY_LEADERSHIP_LOSS_FLAVOR)[
                pickFlavorIndex(
                  `${career.turn}-leadership`,
                  (lastLeadershipOutcome.won ? PARTY_LEADERSHIP_WIN_FLAVOR : PARTY_LEADERSHIP_LOSS_FLAVOR).length
                )
              ]}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function CampaignSection({
  career,
  onRun,
  lastOutcome,
}: {
  career: CareerState;
  onRun: (activityType: CampaignActivityType) => void;
  lastOutcome: CampaignActivityOutcome | null;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Campaign Activity</h2>
        <span className="muted">Short-lived buzz that sharpens your odds in the next race or nomination attempt</span>
      </div>
      <div className="score-bar">
        <div className="score-bar-label">
          <span>Campaign Momentum</span>
          <span>{career.campaignMomentum.toFixed(0)}</span>
        </div>
        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, career.campaignMomentum))}%` }} />
        </div>
      </div>
      <div className="bill-actions">
        <button onClick={() => onRun('canvass')} disabled={career.money < CAMPAIGN_ACTIVITIES.canvass.cost}>
          {CAMPAIGN_ACTIVITIES.canvass.label} (${CAMPAIGN_ACTIVITIES.canvass.cost})
        </button>
        <button onClick={() => onRun('media_blitz')} disabled={career.money < CAMPAIGN_ACTIVITIES.media_blitz.cost}>
          {CAMPAIGN_ACTIVITIES.media_blitz.label} (${CAMPAIGN_ACTIVITIES.media_blitz.cost})
        </button>
      </div>
      {lastOutcome && (
        <p className={lastOutcome.outcome === 'setback' ? 'result-fail' : 'result-pass'}>
          {CAMPAIGN_ACTIVITY_FLAVOR[lastOutcome.activityType][lastOutcome.outcome][
            pickFlavorIndex(`${career.turn}-campaign`, CAMPAIGN_ACTIVITY_FLAVOR[lastOutcome.activityType][lastOutcome.outcome].length)
          ]}{' '}
          ({lastOutcome.momentumDelta >= 0 ? '+' : ''}
          {lastOutcome.momentumDelta.toFixed(0)} momentum)
        </p>
      )}
    </section>
  );
}

function LocalRaceSection({
  career,
  onAttempt,
  lastOutcome,
}: {
  career: CareerState;
  onAttempt: () => void;
  lastOutcome: LocalRaceOutcome | null;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Local Council Race</h2>
      </div>
      <p className="muted">
        {career.localSeatWon
          ? 'You hold a local council seat.'
          : 'Win a local seat to prove you can actually get elected. Costs $60 to run.'}
      </p>
      <div className="bill-actions">
        <button onClick={onAttempt} disabled={career.money < 60}>
          Run for Local Council
        </button>
      </div>
      {lastOutcome && (
        <p className={lastOutcome.won ? 'result-pass' : 'result-fail'}>
          {(lastOutcome.won ? LOCAL_RACE_WIN_FLAVOR : LOCAL_RACE_LOSS_FLAVOR)[
            pickFlavorIndex(`${career.turn}-local`, (lastOutcome.won ? LOCAL_RACE_WIN_FLAVOR : LOCAL_RACE_LOSS_FLAVOR).length)
          ]}{' '}
          ({(lastOutcome.playerShare * 100).toFixed(0)}% of the vote against {lastOutcome.opponentNames.length} rival
          {lastOutcome.opponentNames.length === 1 ? '' : 's'})
        </p>
      )}
      {career.localRaceHistory.length > 0 && (
        <ul className="scandal-list">
          {career.localRaceHistory
            .slice(-5)
            .reverse()
            .map((race, i) => (
              <li key={i} className={`scandal-item status-${race.won ? 'resolved' : 'unresolved'}`}>
                <span>
                  Season {race.turn} — {race.won ? 'Won' : 'Lost'} — {(race.playerShare * 100).toFixed(0)}% of the vote
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function RegionalRaceSection({
  career,
  onAttempt,
  lastOutcome,
}: {
  career: CareerState;
  onAttempt: () => void;
  lastOutcome: LocalRaceOutcome | null;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Regional Legislature Race</h2>
      </div>
      {!career.localSeatWon ? (
        <p className="muted">Win a local council seat first — the ladder climbs in order.</p>
      ) : (
        <p className="muted">
          {career.regionalSeatWon
            ? 'You hold a regional legislature seat.'
            : 'A tougher field than the local race. Costs $150 to run.'}
        </p>
      )}
      <div className="bill-actions">
        <button onClick={onAttempt} disabled={!career.localSeatWon || career.money < 150}>
          Run for Regional Legislature
        </button>
      </div>
      {lastOutcome && (
        <p className={lastOutcome.won ? 'result-pass' : 'result-fail'}>
          {(lastOutcome.won ? REGIONAL_RACE_WIN_FLAVOR : REGIONAL_RACE_LOSS_FLAVOR)[
            pickFlavorIndex(`${career.turn}-regional`, (lastOutcome.won ? REGIONAL_RACE_WIN_FLAVOR : REGIONAL_RACE_LOSS_FLAVOR).length)
          ]}{' '}
          ({(lastOutcome.playerShare * 100).toFixed(0)}% of the vote against {lastOutcome.opponentNames.length} rival
          {lastOutcome.opponentNames.length === 1 ? '' : 's'})
        </p>
      )}
      {career.regionalRaceHistory.length > 0 && (
        <ul className="scandal-list">
          {career.regionalRaceHistory
            .slice(-5)
            .reverse()
            .map((race, i) => (
              <li key={i} className={`scandal-item status-${race.won ? 'resolved' : 'unresolved'}`}>
                <span>
                  Season {race.turn} — {race.won ? 'Won' : 'Lost'} — {(race.playerShare * 100).toFixed(0)}% of the vote
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function LocalGovernanceSection({
  career,
  onGovern,
  lastOutcome,
}: {
  career: CareerState;
  onGovern: () => void;
  lastOutcome: GovernanceOutcome | null;
}) {
  const holdsOffice = career.localSeatWon || career.regionalSeatWon;
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Governing</h2>
      </div>
      {!holdsOffice ? (
        <p className="muted">Win a seat to start actually governing — constituency work, committee votes, the real job.</p>
      ) : (
        <p className="muted">
          {career.regionalSeatWon
            ? 'Drawing a regional legislator\'s stipend each season.'
            : 'Drawing a local councilmember\'s stipend each season.'}
        </p>
      )}
      <div className="bill-actions">
        <button onClick={onGovern} disabled={!holdsOffice}>
          Do the Work of Governing
        </button>
      </div>
      {lastOutcome && (
        <p className={lastOutcome.outcome === 'setback' ? 'result-fail' : 'result-pass'}>
          {GOVERNANCE_FLAVOR[lastOutcome.outcome][pickFlavorIndex(`${career.turn}-govern`, GOVERNANCE_FLAVOR[lastOutcome.outcome].length)]}{' '}
          ({lastOutcome.civicRecordDelta >= 0 ? '+' : ''}
          {lastOutcome.civicRecordDelta.toFixed(0)} civic record)
        </p>
      )}
    </section>
  );
}

function NominationSection({
  career,
  probability,
  onAttempt,
  lastOutcome,
}: {
  career: CareerState;
  probability: number;
  onAttempt: () => void;
  lastOutcome: NominationOutcome | null;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>National Nomination</h2>
      </div>
      {!career.partyId ? (
        <p className="muted">Join a party first — the nomination is theirs to give.</p>
      ) : (
        <>
          <p className="muted">
            Estimated chance the party puts your name forward this attempt: <strong>{(probability * 100).toFixed(0)}%</strong>
          </p>
          <div className="bill-actions">
            <button onClick={onAttempt}>Seek the Nomination</button>
          </div>
        </>
      )}
      {lastOutcome && (
        <p className={lastOutcome.selected ? 'result-pass' : 'result-fail'}>
          {(lastOutcome.selected ? NOMINATION_SUCCESS_FLAVOR : NOMINATION_REJECTION_FLAVOR)[
            pickFlavorIndex(
              `${career.turn}-nom`,
              (lastOutcome.selected ? NOMINATION_SUCCESS_FLAVOR : NOMINATION_REJECTION_FLAVOR).length
            )
          ]}
        </p>
      )}
      {career.nominationHistory.length > 0 && (
        <ul className="scandal-list">
          {career.nominationHistory
            .slice(-5)
            .reverse()
            .map((n, i) => (
              <li key={i} className={`scandal-item status-${n.selected ? 'resolved' : 'unresolved'}`}>
                <span>
                  Season {n.turn} — {n.selected ? 'Selected' : 'Passed over'} — {(n.probability * 100).toFixed(0)}% odds
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function CitizenInitiativeSection({
  career,
  onAttempt,
  lastOutcome,
}: {
  career: CareerState;
  onAttempt: (title: string, stance: IdeologyPosition) => void;
  lastOutcome: CitizenInitiativeOutcome | null;
}) {
  const [customTitle, setCustomTitle] = useState('');
  const [economic, setEconomic] = useState(0);
  const [social, setSocial] = useState(0);
  const canAfford = career.money >= CITIZEN_INITIATIVE_COST;

  const handleTemplate = (templateId: string) => {
    const template = CITIZEN_ISSUE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    onAttempt(template.title, template.stance);
  };

  const handleCustom = () => {
    const trimmed = customTitle.trim();
    if (!trimmed) return;
    onAttempt(trimmed, { economic, social });
    setCustomTitle('');
    setEconomic(0);
    setSocial(0);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Citizen Petitions</h2>
        <span className="muted">No seat, no party required — put an issue to the neighborhood directly. Costs ${CITIZEN_INITIATIVE_COST}.</span>
      </div>

      <div className="bill-actions">
        {CITIZEN_ISSUE_TEMPLATES.map((template) => (
          <button key={template.id} disabled={!canAfford} onClick={() => handleTemplate(template.id)} title={template.description}>
            {template.title}
          </button>
        ))}
      </div>

      <h4 className="subheading">Or File Your Own</h4>
      <div className="custom-bill-form">
        <label>
          Title
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Fix the Pothole on 5th Street Petition"
          />
        </label>
        <label>
          Economic Stance ({economic})
          <input type="range" min={-100} max={100} value={economic} onChange={(e) => setEconomic(Number(e.target.value))} />
        </label>
        <label>
          Social Stance ({social})
          <input type="range" min={-100} max={100} value={social} onChange={(e) => setSocial(Number(e.target.value))} />
        </label>
        <div className="row-actions">
          <button onClick={handleCustom} disabled={!canAfford || !customTitle.trim()}>
            File Petition
          </button>
        </div>
      </div>

      {lastOutcome && (
        <p className={lastOutcome.passed ? 'result-pass' : 'result-fail'}>
          {(lastOutcome.passed ? CITIZEN_INITIATIVE_PASS_FLAVOR : CITIZEN_INITIATIVE_FAIL_FLAVOR)[
            pickFlavorIndex(
              `${career.turn}-citizen`,
              (lastOutcome.passed ? CITIZEN_INITIATIVE_PASS_FLAVOR : CITIZEN_INITIATIVE_FAIL_FLAVOR).length
            )
          ]}{' '}
          ({(lastOutcome.supportShare * 100).toFixed(0)}% support)
        </p>
      )}

      {career.citizenInitiatives.length > 0 && (
        <ul className="scandal-list">
          {career.citizenInitiatives
            .slice(-5)
            .reverse()
            .map((initiative, i) => (
              <li key={i} className={`scandal-item status-${initiative.passed ? 'resolved' : 'unresolved'}`}>
                <span>
                  Season {initiative.turn} — {initiative.title} — {initiative.passed ? 'Passed' : 'Failed'} —{' '}
                  {(initiative.supportShare * 100).toFixed(0)}% support
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
