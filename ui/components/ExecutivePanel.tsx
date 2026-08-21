import { useState } from 'react';
import { EXECUTIVE_ORDER_COOLDOWN_TURNS, canIssueExecutiveOrder } from '../../engine';
import { EXECUTIVE_ORDER_TEMPLATES } from '../../content/executive/orderTemplates';
import { useStatecraftStore } from '../store';

function titleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Presidential/semi-presidential regimes only (see Country.regimeType) —
 * bills awaiting the executive's signature or veto, vetoed bills the
 * legislature can attempt to override, and a bounded, cooldown-gated
 * executive order the legislature has no say in at all. See
 * engine/systems/executive.ts.
 */
export function ExecutivePanel() {
  const game = useStatecraftStore((s) => s.game);
  const signBillAction = useStatecraftStore((s) => s.signBillAction);
  const vetoBillAction = useStatecraftStore((s) => s.vetoBillAction);
  const attemptVetoOverrideAction = useStatecraftStore((s) => s.attemptVetoOverrideAction);
  const issueExecutiveOrderAction = useStatecraftStore((s) => s.issueExecutiveOrderAction);
  const lastSignatureOutcome = useStatecraftStore((s) => s.lastSignatureOutcome);

  const [templateId, setTemplateId] = useState(EXECUTIVE_ORDER_TEMPLATES[0].id);

  if (!game) return null;
  if (game.country.regimeType === 'parliamentary') return null;

  const awaitingSignature = game.bills.filter((b) => b.status === 'awaiting_signature');
  const vetoed = game.bills.filter((b) => b.status === 'vetoed');
  const canOrder = canIssueExecutiveOrder(game.country, game.turn, game.lastExecutiveOrderTurn);
  const recentOrders = [...game.executiveOrders].reverse().slice(0, 5);
  const selectedTemplate = EXECUTIVE_ORDER_TEMPLATES.find((t) => t.id === templateId) ?? EXECUTIVE_ORDER_TEMPLATES[0];

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Executive Powers</h2>
        <span className="muted">{titleCase(game.country.regimeType)} regime</span>
      </div>

      {awaitingSignature.length > 0 && (
        <>
          <h3>Awaiting Your Signature</h3>
          <ul className="scandal-list">
            {awaitingSignature.map((bill) => (
              <li key={bill.id} className="scandal-item">
                <span style={{ flex: 1 }}>
                  <strong>{bill.title}</strong>
                </span>
                <span className="row-actions">
                  <button onClick={() => signBillAction(bill.id)}>Sign</button>
                  <button className="ghost-button" onClick={() => vetoBillAction(bill.id)}>
                    Veto
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {vetoed.length > 0 && (
        <>
          <h3>Vetoed Bills</h3>
          <ul className="scandal-list">
            {vetoed.map((bill) => (
              <li key={bill.id} className="scandal-item">
                <span style={{ flex: 1 }}>
                  <strong>{bill.title}</strong>
                  {bill.vetoStatus === 'sustained' && <span className="muted"> — a prior override attempt failed</span>}
                </span>
                <span className="row-actions">
                  <button onClick={() => attemptVetoOverrideAction(bill.id)}>Attempt Override</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {lastSignatureOutcome?.action === 'override' && (
        <p className={lastSignatureOutcome.overridden ? 'result-pass' : 'result-fail'}>
          {lastSignatureOutcome.overridden
            ? `Override succeeded, ${lastSignatureOutcome.yes}-${lastSignatureOutcome.no}.`
            : `Override failed, ${lastSignatureOutcome.yes}-${lastSignatureOutcome.no} — the veto stands.`}
        </p>
      )}

      <h3>Executive Order</h3>
      <p className="muted">
        A real, unilateral action with no legislature vote —{' '}
        {canOrder ? 'ready to issue.' : `on cooldown until turn ${(game.lastExecutiveOrderTurn ?? 0) + EXECUTIVE_ORDER_COOLDOWN_TURNS}.`}
      </p>
      <div className="custom-bill-form">
        <label>
          Order
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {EXECUTIVE_ORDER_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{selectedTemplate.description}</p>
        <div className="row-actions">
          <button
            disabled={!canOrder}
            onClick={() =>
              issueExecutiveOrderAction(
                selectedTemplate.title,
                selectedTemplate.description,
                selectedTemplate.economyEffect,
                selectedTemplate.playerApprovalEffect
              )
            }
          >
            Issue Order
          </button>
        </div>
      </div>

      {recentOrders.length > 0 && (
        <ul className="coverage-list">
          {recentOrders.map((order) => (
            <li key={order.id} className="coverage-item frame-neutral">
              <span className="coverage-outlet">
                Turn {order.turnIssued} — {order.title}
              </span>
              <p className="coverage-headline">{order.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
