import { AccessibilityPanel } from './AccessibilityPanel';

interface MainMenuProps {
  onNewGame: () => void;
  onLoadGame: () => void;
  onOpenChangelog: () => void;
  hasSave: boolean;
  statusMessage: string;
}

/**
 * The title-screen entry point, shown before the player has an active game
 * or career in progress (see App.tsx's showStartScreen/menuVisible
 * routing). Every button here just flips existing App.tsx state — no new
 * gameplay logic lives here.
 */
export function MainMenu({ onNewGame, onLoadGame, onOpenChangelog, hasSave, statusMessage }: MainMenuProps) {
  return (
    <main className="app-shell main-menu-shell">
      <div className="main-menu">
        <h1 className="main-menu-title">Statecraft</h1>
        <p className="main-menu-tagline">A deep political simulation. Build a party, whip a bill, win an election.</p>
        <div className="main-menu-buttons">
          <button className="main-menu-button" onClick={onNewGame}>
            New Game
          </button>
          <button className="main-menu-button" onClick={onLoadGame} disabled={!hasSave}>
            Load Game
          </button>
          <button className="main-menu-button" onClick={onOpenChangelog}>
            Update Log
          </button>
        </div>
        {statusMessage && <p className="status-flash">{statusMessage}</p>}
        <div className="main-menu-settings">
          <AccessibilityPanel />
        </div>
      </div>
    </main>
  );
}
