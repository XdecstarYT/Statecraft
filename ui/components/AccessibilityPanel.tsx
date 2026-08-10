import { useEffect, useState } from 'react';
import {
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  type AccessibilitySettings,
  type FontScale,
} from '../persistence';

/** Applies the given settings to the document root, where the CSS in styles.css keys off them. */
function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;
  root.dataset.colorblind = String(settings.colorblindMode);
  root.dataset.fontScale = settings.fontScale;
  root.dataset.reducedMotion = String(settings.reducedMotion);
}

export function AccessibilityPanel() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => loadAccessibilitySettings());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyAccessibilitySettings(settings);
    saveAccessibilitySettings(settings);
  }, [settings]);

  return (
    <div style={{ position: 'relative' }}>
      <button className="ghost-button" onClick={() => setOpen((v) => !v)}>
        Accessibility
      </button>
      {open && (
        <div
          className="panel"
          style={{ position: 'absolute', right: 0, top: '2.2rem', zIndex: 20, width: '260px' }}
        >
          <div className="settings-form">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.colorblindMode}
                onChange={(e) => setSettings((s) => ({ ...s, colorblindMode: e.target.checked }))}
              />
              Colorblind-safe palette
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => setSettings((s) => ({ ...s, reducedMotion: e.target.checked }))}
              />
              Reduce motion
            </label>
            <label>
              Text Size
              <select
                value={settings.fontScale}
                onChange={(e) => setSettings((s) => ({ ...s, fontScale: e.target.value as FontScale }))}
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
