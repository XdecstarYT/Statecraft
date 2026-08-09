import { useEffect, useState } from 'react';
import type { Difficulty } from '../engine';
import { STARTER_COUNTRY_OPTIONS } from '../content/countries/registry';
import { hasSavedGame } from './persistence';
import { useStatecraftStore } from './store';
import { Dashboard } from './components/Dashboard';
import { BillPanel } from './components/BillPanel';
import { ElectionPanel } from './components/ElectionPanel';
import { OpinionPanel } from './components/OpinionPanel';
import { MediaPanel } from './components/MediaPanel';
import { ElectoralLabPanel } from './components/ElectoralLabPanel';
import { CorruptionPanel } from './components/CorruptionPanel';
import { DiplomacyPanel } from './components/DiplomacyPanel';
import { EventLogPanel } from './components/EventLogPanel';
import { LegacyPanel } from './components/LegacyPanel';
import { OnboardingBanner } from './components/OnboardingBanner';

const TABS = [
  { id: 'legislature', label: 'Legislature' },
  { id: 'opinion', label: 'Opinion & Campaign' },
  { id: 'power', label: 'Power & Diplomacy' },
  { id: 'events', label: 'Events' },
  { id: 'lab', label: 'Electoral Lab' },
  { id: 'legacy', label: 'Legacy' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const game = useStatecraftStore((s) => s.game);
  const newGame = useStatecraftStore((s) => s.newGame);
  const saveGame = useStatecraftStore((s) => s.saveGame);
  const loadGame = useStatecraftStore((s) => s.loadGame);

  const [activeTab, setActiveTab] = useState<TabId>('legislature');
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('standard');
  const [pendingCountryId, setPendingCountryId] = useState(STARTER_COUNTRY_OPTIONS[0].id);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!game) {
      if (hasSavedGame()) {
        loadGame();
      } else {
        newGame();
      }
    }
  }, [game, newGame, loadGame]);

  const flashStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  if (!game) {
    return (
      <main className="app-shell">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Statecraft</h1>
        <span className="seed-tag">
          Seed: {game.seed} &middot; {game.difficulty}
        </span>
        {statusMessage && <span className="status-flash">{statusMessage}</span>}
        <div className="header-actions">
          <select value={pendingCountryId} onChange={(e) => setPendingCountryId(e.target.value)}>
            {STARTER_COUNTRY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={pendingDifficulty} onChange={(e) => setPendingDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="standard">Standard</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={() => newGame(undefined, pendingDifficulty, pendingCountryId)}>New Game</button>
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
        <div className="panel-columns">
          <BillPanel />
          <ElectionPanel />
        </div>
      )}

      {activeTab === 'opinion' && (
        <div className="panel-columns">
          <OpinionPanel />
          <MediaPanel />
        </div>
      )}

      {activeTab === 'power' && (
        <div className="panel-columns">
          <CorruptionPanel />
          <DiplomacyPanel />
        </div>
      )}

      {activeTab === 'events' && <EventLogPanel />}
      {activeTab === 'lab' && <ElectoralLabPanel />}
      {activeTab === 'legacy' && <LegacyPanel />}
    </main>
  );
}
