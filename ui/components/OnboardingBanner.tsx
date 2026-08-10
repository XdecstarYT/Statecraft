import { useState } from 'react';
import { hasSeenOnboarding, markOnboardingSeen } from '../persistence';

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(hasSeenOnboarding());

  if (dismissed) return null;

  const dismiss = () => {
    markOnboardingSeen();
    setDismissed(true);
  };

  return (
    <div className="onboarding-banner">
      <div>
        <strong>Welcome to Statecraft.</strong> You're a backbencher in a legislature run entirely by
        code — no chat, no AI game master. Draft and whip bills, run elections, manage scandals and
        foreign relations, and watch rival politicians act on their own. Everything replays exactly
        the same from the same seed. Use the nav bar below to jump between sections.
      </div>
      <button onClick={dismiss}>Got it</button>
    </div>
  );
}
