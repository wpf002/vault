import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Smart Recipe Planner & Pantry Manager — keep the pantry current (with
// a "use it soon" nudge baked into the data), then generate meal plans
// through the proxy from exactly what's on hand: dinners first for
// whatever is going soft, plus the short shopping-gap list of what would
// unlock the plan. CONTRACT.md #11 failure states rendered.

type PantryItem = { item: string; qty: string; staple: boolean };
type MealPlan = { title: string; body: string };

const SYSTEM_PROMPT = [
  'You are a home cook planning meals STRICTLY from a pantry list. Produce the requested number of dinners, one line each starting "Dinner N:",',
  'prioritizing ingredients described as soft/wilting/expiring. Only use listed ingredients plus water, oil, salt, pepper, and basic dried spices.',
  'End with one line starting "Shopping gap:" listing at most 3 cheap items that would improve the plan.',
  'No headers, no commentary — just the dinner lines and the shopping gap line.',
].join(' ');

export function SmartRecipePlannerPantryManager({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [pantry, setPantry] = useState<StoreDoc<PantryItem>[] | null>(null);
  const [plans, setPlans] = useState<StoreDoc<MealPlan>[] | null>(null);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [dinners, setDinners] = useState('3');
  const [working, setWorking] = useState(false);
  const [current, setCurrent] = useState<MealPlan | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<PantryItem>('pantry').then(setPantry);
    store.list<MealPlan>('plans').then(setPlans);
  }, [store]);

  const pantryList = pantry ?? [];

  async function plan() {
    if (!ai || working || pantryList.length < 3) return;
    setWorking(true);
    setFailure(null);
    setCurrent(null);
    const n = Math.min(7, Math.max(1, Math.round(Number(dinners) || 3)));
    const inventory = pantryList.map((p) => `${p.data.item} (${p.data.qty})`).join(', ');
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `My pantry: ${inventory}. Plan ${n} dinners.`, maxTokens: 600 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setCurrent({ title: `${n} dinners from what's on hand`, body: res.text.trim() });
  }

  async function keepPlan() {
    if (!current) return;
    const doc = await store.create('plans', current);
    setPlans((prev) => [doc, ...(prev ?? [])]);
    setCurrent(null);
  }

  async function removePlan(docId: string) {
    await store.remove('plans', docId);
    setPlans((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  async function addItem() {
    if (!item.trim()) return;
    const doc = await store.create('pantry', { item: item.trim(), qty: qty.trim() || 'Some', staple: false });
    setPantry((prev) => [...(prev ?? []), doc]);
    setItem('');
    setQty('');
  }

  async function toggleStaple(doc: StoreDoc<PantryItem>) {
    const updated = await store.update('pantry', doc.docId, { ...doc.data, staple: !doc.data.staple });
    setPantry((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function removeItem(docId: string) {
    await store.remove('pantry', docId);
    setPantry((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportPlan() {
    const lines = (plans ?? []).map((p) => `## ${p.data.title}\n\n${p.data.body}`);
    const md = ['# Meal Plans', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meal-plans.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (pantry === null || plans === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="recipe-planner-pantry-root">
      <Section title="Plan From the Pantry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 90 }}>
              <Label>Dinners</Label>
              <Input type="number" value={dinners} onChange={(e) => setDinners(e.target.value)} data-testid="dinners-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={plan} data-testid="plan-button" disabled={working || pantryList.length < 3}>
              {working ? 'Cooking up a plan…' : 'Plan My Dinners'}
            </Button>
            {pantryList.length < 3 && <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Stock at least 3 pantry items first.</span>}
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'plan' : 'plans'} left in preview — unlock the app for dinner every night.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Planning needs an account, even to try it — sign in for a few free plans.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free plans are used up — unlock the app to keep dinner sorted.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The planner is offline right now — your pantry is safe, try again in a bit.
            </div>
          )}

          {current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="result-panel">
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }} data-testid="plan-text">
                {current.body}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={keepPlan} data-testid="keep-button">
                  Keep This Plan
                </Button>
                <Button variant="ghost" onClick={plan} data-testid="retry-button" disabled={working}>
                  Different Dinners
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Pantry">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="pantry-count">{pantryList.length}</span>} label="Items on hand" />
          <StatDisplay value={pantryList.filter((p) => p.data.staple).length} label="Staples" />
          <StatDisplay value={plans.length} label="Plans kept" />
        </div>

        {pantryList.length === 0 ? (
          <EmptyState icon="🥘">Empty pantry — add what's actually in your kitchen.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="pantry-list">
            {pantryList.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="pantry-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.item}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{p.data.qty}</span>
                </div>
                <Tag active={p.data.staple} onClick={() => toggleStaple(p)}>
                  {p.data.staple ? '📌 Staple' : 'One-Off'}
                </Tag>
                <IconButton label="Remove" onClick={() => removeItem(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Ingredient</Label>
            <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Sweet potatoes" data-testid="item-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 180 }}>
            <Label>Quantity / Condition</Label>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 3, one going soft" data-testid="qty-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addItem} data-testid="add-item-button">
            + Stock It
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPlan}>
          Export Meal Plans as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
