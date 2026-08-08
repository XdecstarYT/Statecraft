import { useEffect } from 'react';
import { useStatecraftStore } from './store';
import { Dashboard } from './components/Dashboard';
import { BillPanel } from './components/BillPanel';
import { ElectionPanel } from './components/ElectionPanel';

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
    </main>
  );
}
