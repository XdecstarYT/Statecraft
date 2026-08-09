import { Suspense, lazy, useState } from 'react';
import { WorldPanel } from './WorldPanel';

// three.js is a large dependency — code-split so it only loads when the
// World tab is actually opened, same treatment EconomyChart/recharts gets.
const Globe = lazy(() => import('./Globe').then((m) => ({ default: m.Globe })));

export function WorldTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="panel-columns">
      <section className="panel globe-panel">
        <div className="panel-header">
          <h2>Globe</h2>
          <span className="muted">Drag to orbit · scroll to zoom · click a marker to select</span>
        </div>
        <Suspense fallback={<div className="globe-container" />}>
          <Globe selectedId={selectedId} onSelect={setSelectedId} />
        </Suspense>
      </section>
      <WorldPanel selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}
