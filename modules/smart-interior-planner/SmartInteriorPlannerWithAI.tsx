import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Smart Interior Planner with AI — describe the room (size, light,
// what's staying, what feels wrong) and get a numbered, concrete decor
// and layout plan through the proxy. Scope note: the catalog's "snap a
// photo" needs image upload (file-blob infra the platform doesn't have)
// — a good written brief captures what a photo would, and the detailed
// form makes writing one easy. CONTRACT.md #11 failure states rendered.

type Plan = { room: string; brief: string; body: string };

const SYSTEM_PROMPT = [
  'You are an interior designer giving actionable advice for real budgets. From the room brief, produce a numbered plan of 5-6 concrete moves:',
  'specific placement (with measurements where useful), lighting, textiles, color, and one plant or art suggestion.',
  'Work WITH the furniture they are keeping. Name real material/color choices, not vague vibes. No preamble, no headers — just the numbered lines.',
].join(' ');

const STYLES = ['Warm minimal', 'Scandinavian', 'Mid-century', 'Industrial', 'Cozy maximal', 'Japandi'];

export function SmartInteriorPlannerWithAI({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [plans, setPlans] = useState<StoreDoc<Plan>[] | null>(null);
  const [room, setRoom] = useState('');
  const [style, setStyle] = useState('Warm minimal');
  const [keeping, setKeeping] = useState('');
  const [problem, setProblem] = useState('');
  const [working, setWorking] = useState(false);
  const [current, setCurrent] = useState<Plan | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Plan>('plans').then(setPlans);
  }, [store]);

  async function design() {
    if (!ai || working || !room.trim() || !problem.trim()) return;
    setWorking(true);
    setFailure(null);
    setCurrent(null);
    const brief = `${keeping.trim() ? `Keeping: ${keeping.trim()} · ` : ''}style: ${style.toLowerCase()} · problem: ${problem.trim()}`;
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Room: ${room.trim()}. ${brief}`, maxTokens: 700 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setCurrent({ room: room.trim(), brief, body: res.text.trim() });
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

  function exportPlans() {
    const lines = (plans ?? []).map((p) => `## ${p.data.room}\n_${p.data.brief}_\n\n${p.data.body}`);
    const md = ['# Room Plans', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room-plans.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (plans === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="smart-interior-planner-root">
      <Section title="Describe the Room">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 170 }}>
              <Label>Room & Size</Label>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Bedroom, 3×4m, south window" data-testid="room-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 160 }}>
              <Label>Target Style</Label>
              <Select value={style} onChange={(e) => setStyle(e.target.value)} data-testid="style-select" style={{ width: '100%' }}>
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>What's Staying</Label>
            <Input value={keeping} onChange={(e) => setKeeping(e.target.value)} placeholder="e.g. queen bed, white wardrobe, blue rug" data-testid="keeping-input" style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Label>What Feels Wrong</Label>
              <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. Cluttered, no place to read, harsh evening light…" data-testid="problem-input" rows={2} style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={design} data-testid="design-button" disabled={working || !room.trim() || !problem.trim()}>
              {working ? 'Designing…' : 'Design It'}
            </Button>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'plan' : 'plans'} left in preview — unlock the app for unlimited rooms.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The planner needs an account, even to try it — sign in for a few free room plans.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free plans are used up — unlock the app to redesign the whole place.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The planner is offline right now — try again in a bit.
            </div>
          )}

          {current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="result-panel">
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }} data-testid="plan-text">
                {current.body}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={keepPlan} data-testid="keep-button">
                  Save This Plan
                </Button>
                <Button variant="ghost" onClick={design} data-testid="retry-button" disabled={working}>
                  Try Another Take
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Saved Room Plans">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="plan-count">{plans.length}</span>} label="Rooms planned" />
        </div>

        {plans.length === 0 ? (
          <EmptyState icon="🛋️">No plans yet — describe your most annoying room.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="plans-list">
            {plans.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="plan-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag>🛋️</Tag>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.room}</span>
                    <div style={{ fontSize: 11, marginTop: 2, color: 'var(--color-text-dim)' }}>{p.data.brief}</div>
                  </div>
                  <IconButton label="Remove" onClick={() => removePlan(p.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', whiteSpace: 'pre-wrap', marginLeft: 4 }}>{p.data.body}</div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPlans}>
          Export Plans as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
