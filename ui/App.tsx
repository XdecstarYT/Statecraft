import { useEffect, useState } from 'react';
import type { Difficulty } from '../engine';
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

const NAV_SECTIONS = [
  { id: 'section-dashboard', label: 'Dashboard' },
  { id: 'section-legislature', label: 'Legislature' },
  { id: 'section-opinion', label: 'Opinion & Media' },
  { id: 'section-power', label: 'Power & Diplomacy' },
  { id: 'section-events', label: 'Events' },
  { id: 'section-lab', label: 'Electoral Lab' },
  { id: 'section-legacy', label: 'Legacy' },
];

export default function App() {
  const game = useStatecraftStore((s) => s.game);
  const newGame = useStatecraftStore((s) => s.newGame);
  const saveGame = useStatecraftStore((s) => s.saveGame);
  const loadGame = useStatecraftStore((s) => s.loadGame);

  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('standard');
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
          <select value={pendingDifficulty} onChange={(e) => setPendingDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="standard">Standard</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={() => newGame(undefined, pendingDifficulty)}>New Game</button>
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

      <nav className="app-nav">
        {NAV_SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <div id="section-dashboard">
        <Dashboard />
      </div>

      <div id="section-legislature" className="panel-columns">
        <BillPanel />
        <ElectionPanel />
      </div>

      <div id="section-opinion" className="panel-columns">
        <OpinionPanel />
        <MediaPanel />
      </div>

      <div id="section-power" className="panel-columns">
        <CorruptionPanel />
        <DiplomacyPanel />
      </div>

      <div id="section-events">
        <EventLogPanel />
      </div>

      <div id="section-lab">
        <ElectoralLabPanel />
      </div>

      <div id="section-legacy">
        <LegacyPanel />
      </div>
    </main>
  );
}
