import { useEffect, useState } from 'react';
import type { Difficulty } from '../engine';
import { STARTER_COUNTRY_OPTIONS } from '../content/countries/registry';
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
import { WorldTab } from './components/WorldTab';
import { EventLogPanel } from './components/EventLogPanel';
import { LegacyPanel } from './components/LegacyPanel';
import { OnboardingBanner } from './components/OnboardingBanner';

const TABS = [
  { id: 'legislature', label: 'Legislature' },
  { id: 'opinion', label: 'Opinion & Campaign' },
  { id: 'power', label: 'Power' },
  { id: 'world', label: 'World' },
  { id: 'events', label: 'Events' },
  { id: 'lab', label: 'Electoral Lab' },
  { id: 'legacy', label: 'Legacy' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const game = useStatecraftStore((s) => s.game);
  const career = useStatecraftStore((s) => s.career);
  const newGame = useStatecraftStore((s) => s.newGame);
  const startCareer = useStatecraftStore((s) => s.startCareer);
  const saveGame = useStatecraftStore((s) => s.saveGame);
  const loadGame = useStatecraftStore((s) => s.loadGame);

  const [activeTab, setActiveTab] = useState<TabId>('legislature');
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('standard');
  const [pendingCountryId, setPendingCountryId] = useState(STARTER_COUNTRY_OPTIONS[0].id);
  const [careerNameDraft, setCareerNameDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [bootstrapped, setBootstrapped] = useState(false);
  const [forceStartScreen, setForceStartScreen] = useState(false);

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
                <button
                  onClick={() => {
                    newGame(undefined, pendingDifficulty, pendingCountryId);
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
    <main className="app-shell">
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

      <OnboardingBanner />

      <Dashboard />

      <nav className="app-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'legislature' && (
        <>
          <div className="panel-columns">
            <BillPanel />
            <ElectionPanel />
          </div>
          <PartyFoundingPanel />
        </>
      )}

      {activeTab === 'opinion' && (
        <div className="panel-columns">
          <OpinionPanel />
          <MediaPanel />
        </div>
      )}

      {activeTab === 'power' && (
        <>
          <div className="panel-columns">
            <CorruptionPanel />
            <LobbyingPanel />
          </div>
          <LeadershipPanel />
          <SecessionPanel />
        </>
      )}
      {activeTab === 'world' && <WorldTab />}

      {activeTab === 'events' && <EventLogPanel />}
      {activeTab === 'lab' && <ElectoralLabPanel />}
      {activeTab === 'legacy' && <LegacyPanel />}
    </main>
  );
}
