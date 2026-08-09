import { useEffect } from 'react';
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

export default function App() {
  const game = useStatecraftStore((s) => s.game);
  const newGame = useStatecraftStore((s) => s.newGame);

  useEffect(() => {
    if (!game) newGame();
  }, [game, newGame]);

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
        <span className="seed-tag">Seed: {game.seed}</span>
        <button onClick={() => newGame()}>New Game</button>
      </header>

      <Dashboard />
      <div className="panel-columns">
        <BillPanel />
        <ElectionPanel />
      </div>
      <div className="panel-columns">
        <OpinionPanel />
        <MediaPanel />
      </div>
      <div className="panel-columns">
        <CorruptionPanel />
        <DiplomacyPanel />
      </div>
      <EventLogPanel />
      <ElectoralLabPanel />
    </main>
  );
}
