import { useEffect, useState } from 'react';
import type { Difficulty, HouseRules } from '../engine';
import { STARTER_COUNTRY_OPTIONS } from '../content/countries/registry';
import { SCENARIO_PRESETS } from '../content/scenarios/presets';
import { hasSavedCareer, hasSavedGame } from './persistence';
import { useStatecraftStore } from './store';
import { CareerScreen } from './components/CareerScreen';
import { NationBuilderPanel } from './components/NationBuilderPanel';
import { Dashboard } from './components/Dashboard';
import { BillPanel } from './components/BillPanel';
import { ElectionPanel } from './components/ElectionPanel';
import { OpinionPanel } from './components/OpinionPanel';
import { MediaPanel } from './components/MediaPanel';
import { ElectoralLabPanel } from './components/ElectoralLabPanel';
import { CorruptionPanel } from './components/CorruptionPanel';
import { LobbyingPanel } from './components/LobbyingPanel';
import { LeadershipPanel } from './components/LeadershipPanel';
import { PartyFoundingPanel } from './components/PartyFoundingPanel';
import { SecessionPanel } from './components/SecessionPanel';
import { BallotInitiativePanel } from './components/BallotInitiativePanel';
import { UnrestPanel } from './components/UnrestPanel';
import { PollingPanel } from './components/PollingPanel';
import { SummitPanel } from './components/SummitPanel';
import { WorldTab } from './components/WorldTab';
import { EventLogPanel } from './components/EventLogPanel';
import { LegacyPanel } from './components/LegacyPanel';
import { StatisticsPanel } from './components/StatisticsPanel';
import { OnboardingBanner } from './components/OnboardingBanner';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { IndustryPanel } from './components/IndustryPanel';
import { JudiciaryPanel } from './components/JudiciaryPanel';
import { ResearchPanel } from './components/ResearchPanel';
import { DemographicsPanel } from './components/DemographicsPanel';
import { SocialPolicyPanel } from './components/SocialPolicyPanel';
import { MarketsPanel } from './components/MarketsPanel';
import { CrimePanel } from './components/CrimePanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { InfrastructurePanel } from './components/InfrastructurePanel';
import { ChirpPanel } from './components/ChirpPanel';
import { MovementsPanel } from './components/MovementsPanel';
import { CountryMap } from './components/CountryMap';
import { ElectionResultsDrawer } from './components/ElectionResultsDrawer';
import { ParliamentHemicycle } from './components/ParliamentHemicycle';
import { CampaignPromisesPanel } from './components/CampaignPromisesPanel';
import { TopHud } from './components/TopHud';
import { TimelineScrubber } from './components/TimelineScrubber';
import { AchievementsOverlay } from './components/AchievementsOverlay';
import { DilemmaPanel } from './components/DilemmaPanel';
import { CampaignFinancePanel } from './components/CampaignFinancePanel';
import { MediaEcosystemPanel } from './components/MediaEcosystemPanel';
import { ThinkTankPanel } from './components/ThinkTankPanel';
import { WhipDisciplinePanel } from './components/WhipDisciplinePanel';
import { InternationalCourtPanel } from './components/InternationalCourtPanel';
import { PowerDynamicsPanel } from './components/PowerDynamicsPanel';

const TABS = [
  { id: 'legislature', label: 'Legislature', icon: '🏛️' },
  { id: 'opinion', label: 'Opinion & Campaign', icon: '📣' },
  { id: 'power', label: 'Power', icon: '🕴️' },
  { id: 'world', label: 'World', icon: '🌍' },
  { id: 'industry', label: 'Industry', icon: '🏭' },
  { id: 'markets', label: 'Markets', icon: '📊' },
  { id: 'governance', label: 'Governance', icon: '⚖️' },
  { id: 'society', label: 'Society', icon: '🏙️' },
  { id: 'chirp', label: 'Chirp', icon: '🐦' },
  { id: 'events', label: 'Events', icon: '📰' },
  { id: 'lab', label: 'Electoral Lab', icon: '🗳️' },
  { id: 'statistics', label: 'Statistics', icon: '📈' },
  { id: 'legacy', label: 'Legacy', icon: '🏆' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const game = useStatecraftStore((s) => s.game);
  const career = useStatecraftStore((s) => s.career);
  const newGame = useStatecraftStore((s) => s.newGame);
  const newGameFromScenario = useStatecraftStore((s) => s.newGameFromScenario);
  const startCareer = useStatecraftStore((s) => s.startCareer);
  const saveGame = useStatecraftStore((s) => s.saveGame);
  const loadGame = useStatecraftStore((s) => s.loadGame);

  const [activeTab, setActiveTab] = useState<TabId>('legislature');
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('standard');
  const [pendingCountryId, setPendingCountryId] = useState(STARTER_COUNTRY_OPTIONS[0].id);
  const [pendingScenarioId, setPendingScenarioId] = useState(SCENARIO_PRESETS[0].id);
  const [pendingHouseRules, setPendingHouseRules] = useState<HouseRules>({
    disableTermLimits: false,
    doubleEventFrequency: false,
    noCorruption: false,
  });
  const [careerNameDraft, setCareerNameDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [bootstrapped, setBootstrapped] = useState(false);
  const [forceStartScreen, setForceStartScreen] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  useEffect(() => {
    if (!bootstrapped) {
      if (!game && !career) loadGame();
      setBootstrapped(true);
    }
  }, [bootstrapped, game, career, loadGame]);

  const flashStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  if (!bootstrapped) {
    return (
      <main className="app-shell">
        <p>Loading...</p>
      </main>
    );
  }

  const showStartScreen = forceStartScreen || (!game && !career);

  if (showStartScreen) {
    return (
      <main className="app-shell">
        <header className="app-header">
          <h1>Statecraft</h1>
          <div className="header-actions">
            <AccessibilityPanel />
          </div>
        </header>
        <section className="panel">
          <div className="panel-header">
            <h2>Start Your Story</h2>
          </div>
          <div className="panel-columns">
            <div className="nation-detail">
              <h3>Quick Start</h3>
              <p className="muted">Jump straight in as a sitting legislator, mid-term.</p>
              <div className="custom-bill-form">
                <label>
                  Country
                  <select value={pendingCountryId} onChange={(e) => setPendingCountryId(e.target.value)}>
                    {STARTER_COUNTRY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Difficulty
                  <select value={pendingDifficulty} onChange={(e) => setPendingDifficulty(e.target.value as Difficulty)}>
                    <option value="easy">Easy</option>
                    <option value="standard">Standard</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label>
                  Historical Scenario
                  <select value={pendingScenarioId} onChange={(e) => setPendingScenarioId(e.target.value)}>
                    {SCENARIO_PRESETS.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                </label>
                {pendingScenarioId !== 'standard' && (
                  <p className="muted">
                    {SCENARIO_PRESETS.find((s) => s.id === pendingScenarioId)?.description}
                  </p>
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pendingHouseRules.disableTermLimits}
                    onChange={(e) => setPendingHouseRules((r) => ({ ...r, disableTermLimits: e.target.checked }))}
                  />
                  House Rule: No Term Limits
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pendingHouseRules.doubleEventFrequency}
                    onChange={(e) => setPendingHouseRules((r) => ({ ...r, doubleEventFrequency: e.target.checked }))}
                  />
                  House Rule: Double Crisis Frequency
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pendingHouseRules.noCorruption}
                    onChange={(e) => setPendingHouseRules((r) => ({ ...r, noCorruption: e.target.checked }))}
                  />
                  House Rule: No Corruption
                </label>
                <button
                  onClick={() => {
                    if (pendingScenarioId === 'standard') {
                      newGame(undefined, pendingDifficulty, pendingCountryId, pendingHouseRules);
                    } else {
                      newGameFromScenario(pendingScenarioId, pendingCountryId, undefined, pendingHouseRules);
                    }
                    setForceStartScreen(false);
                  }}
                >
                  Start as a Legislator
                </button>
              </div>
            </div>

            <div className="nation-detail">
              <h3>Start From Nothing</h3>
              <p className="muted">
                Begin at 17 with nothing — build attributes through school and work, organize for a party,
                win a local council seat, and earn a real national nomination.
              </p>
              <div className="custom-bill-form">
                <label>
                  Your Name
                  <input
                    type="text"
                    value={careerNameDraft}
                    onChange={(e) => setCareerNameDraft(e.target.value)}
                    placeholder="A Nobody From Nowhere"
                  />
                </label>
                <label>
                  Country
                  <select value={pendingCountryId} onChange={(e) => setPendingCountryId(e.target.value)}>
                    {STARTER_COUNTRY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => {
                    startCareer(careerNameDraft, pendingCountryId);
                    setForceStartScreen(false);
                  }}
                >
                  Begin at 17
                </button>
              </div>
            </div>
          </div>

          {(hasSavedGame() || hasSavedCareer()) && (
            <div className="bill-actions">
              <button
                onClick={() => {
                  flashStatus(loadGame() ? 'Loaded' : 'No save found');
                  setForceStartScreen(false);
                }}
              >
                Continue Saved Game
              </button>
            </div>
          )}
          {statusMessage && <p className="status-flash">{statusMessage}</p>}

          <NationBuilderPanel onCreated={() => setForceStartScreen(false)} />
        </section>
      </main>
    );
  }

  if (career) {
    return <CareerScreen />;
  }

  if (!game) return null;

  return (
    <div className="app-shell-layout">
      <nav className="app-sidebar">
        <div className="app-sidebar-brand">SC</div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="app-sidebar-icon">{tab.icon}</span>
            <span className="app-sidebar-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-shell app-main">
        <header className="app-header">
          <h1>Statecraft</h1>
          <span className="seed-tag">
            Seed: {game.seed} &middot; {game.difficulty}
          </span>
          {statusMessage && <span className="status-flash">{statusMessage}</span>}
          <div className="header-actions">
            <button onClick={() => setForceStartScreen(true)}>New Game</button>
            <button onClick={() => { saveGame(); flashStatus('Saved'); }}>Save Game</button>
            <button
              onClick={() => {
                flashStatus(loadGame() ? 'Loaded' : 'No save found');
              }}
            >
              Load Game
            </button>
          </div>
        </header>

        <TopHud />

        <OnboardingBanner />

        <DilemmaPanel />

        <Dashboard />

        <AchievementsOverlay />

      {activeTab === 'legislature' && (
        <>
          <CountryMap onSelectDistrict={setSelectedDistrictId} selectedDistrictId={selectedDistrictId} />
          <ElectionResultsDrawer />
          <ParliamentHemicycle />
          <CampaignPromisesPanel />
          <div className="panel-columns">
            <BillPanel />
            <ElectionPanel />
          </div>
          <PartyFoundingPanel />
          <WhipDisciplinePanel />
        </>
      )}

      {activeTab === 'opinion' && (
        <>
          <div className="panel-columns">
            <OpinionPanel />
            <MediaPanel />
          </div>
          <MovementsPanel />
          <div className="panel-columns">
            <CampaignFinancePanel />
            <MediaEcosystemPanel />
          </div>
        </>
      )}

      {activeTab === 'power' && (
        <>
          <div className="panel-columns">
            <CorruptionPanel />
            <LobbyingPanel />
          </div>
          <LeadershipPanel />
          <SecessionPanel />
          <UnrestPanel />
          <BallotInitiativePanel />
          <PowerDynamicsPanel />
        </>
      )}
      {activeTab === 'world' && (
        <>
          <WorldTab />
          <SummitPanel />
          <InternationalCourtPanel />
        </>
      )}

      {activeTab === 'industry' && <IndustryPanel />}

      {activeTab === 'markets' && <MarketsPanel />}

      {activeTab === 'governance' && (
        <>
          <div className="panel-columns">
            <JudiciaryPanel />
            <ResearchPanel />
          </div>
          <div className="panel-columns">
            <DemographicsPanel />
            <SocialPolicyPanel />
          </div>
          <ThinkTankPanel />
        </>
      )}

      {activeTab === 'society' && (
        <>
          <div className="panel-columns">
            <CrimePanel />
            <EnvironmentPanel />
          </div>
          <InfrastructurePanel />
        </>
      )}

      {activeTab === 'chirp' && <ChirpPanel />}

      {activeTab === 'events' && <EventLogPanel />}
      {activeTab === 'lab' && (
        <>
          <ElectoralLabPanel />
          <PollingPanel />
        </>
      )}
      {activeTab === 'statistics' && <StatisticsPanel />}
      {activeTab === 'legacy' && <LegacyPanel />}
      </main>

      <TimelineScrubber />
    </div>
  );
}
