import type { SocialFundingTier } from '../../engine';
import { useStatecraftStore } from '../store';

export function SocialPolicyPanel() {
  const game = useStatecraftStore((s) => s.game);
  const setHealthcareFundingAction = useStatecraftStore((s) => s.setHealthcareFundingAction);
  const setEducationFundingAction = useStatecraftStore((s) => s.setEducationFundingAction);
  const setWelfareFundingAction = useStatecraftStore((s) => s.setWelfareFundingAction);

  if (!game) return null;

  const sp = game.socialPolicy;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Healthcare, Education &amp; Welfare</h2>
        <span className="muted">Three real programs, each with an ongoing cost</span>
      </div>

      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Life Expectancy</div>
          <div className="indicator-value">{sp.lifeExpectancy.toFixed(1)}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Literacy Rate</div>
          <div className="indicator-value">{sp.literacyRate.toFixed(1)}%</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Poverty Rate</div>
          <div className="indicator-value">{sp.povertyRate.toFixed(1)}%</div>
        </div>
      </div>

      <div className="custom-bill-form">
        <label>
          Healthcare Funding
          <select
            value={sp.healthcareFunding}
            onChange={(e) => setHealthcareFundingAction(e.target.value as SocialFundingTier)}
          >
            <option value="minimal">Minimal</option>
            <option value="standard">Standard</option>
            <option value="generous">Generous</option>
          </select>
        </label>
        <label>
          Education Funding
          <select
            value={sp.educationFunding}
            onChange={(e) => setEducationFundingAction(e.target.value as SocialFundingTier)}
          >
            <option value="minimal">Minimal</option>
            <option value="standard">Standard</option>
            <option value="generous">Generous</option>
          </select>
        </label>
        <label>
          Welfare Funding
          <select value={sp.welfareFunding} onChange={(e) => setWelfareFundingAction(e.target.value as SocialFundingTier)}>
            <option value="minimal">Minimal</option>
            <option value="standard">Standard</option>
            <option value="generous">Generous</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Outcomes drift toward each tier's implied target over several turns rather than jumping instantly, and feed
        back into your public approval.
      </p>
    </section>
  );
}
