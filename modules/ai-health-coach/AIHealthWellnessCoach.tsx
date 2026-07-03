import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, SegmentedControl, EmptyState, LoadingState } from '@vault/module-ui';

// AI Health & Wellness Coach — a profile (goal, level, equipment, days,
// diet) drives personalized workout weeks and day-of-eating plans
// through the AI proxy. The system prompt pins the coach to general
// fitness guidance with built-in safety framing, and the UI carries a
// standing not-medical-advice disclaimer — this is a fitness planner,
// not a clinician (the mental-health modules stay deferred for exactly
// that reason). CONTRACT.md #11 failure states rendered.

type Profile = { goal: string; level: string; equipment: string; daysPerWeek: number; diet: string };
type Plan = { kind: 'workout' | 'nutrition'; title: string; body: string };

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const SYSTEM_PROMPT = [
  'You are a certified-personal-trainer-style fitness coach. Produce practical, conservative plans for healthy adults.',
  'Always include a brief warm-up note for workouts. Prefer compound movements and progressive but modest volume.',
  'Never diagnose, never promise outcomes, never give supplement or medical advice.',
  'If the request implies injury or a medical condition, advise seeing a professional instead of programming around it.',
  'Format: plain text, one line per day or meal, no markdown headers, no preamble.',
].join(' ');

export function AIHealthWellnessCoach({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [profile, setProfile] = useState<StoreDoc<Profile> | null | undefined>(undefined);
  const [plans, setPlans] = useState<StoreDoc<Plan>[] | null>(null);
  const [planKind, setPlanKind] = useState('Workout Week');
  const [draft, setDraft] = useState<Profile>({ goal: '', level: 'Beginner', equipment: '', daysPerWeek: 3, diet: '' });
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Plan | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Profile>('profile').then((docs) => setProfile(docs[0] ?? null));
    store.list<Plan>('plans').then(setPlans);
  }, [store]);

  const p = profile?.data;

  async function saveProfile() {
    if (!draft.goal.trim()) return;
    if (profile) {
      const updated = await store.update('profile', profile.docId, draft);
      setProfile(updated);
    } else {
      const doc = await store.create('profile', draft);
      setProfile(doc);
    }
    setEditing(false);
  }

  async function generate() {
    if (!ai || working || !p) return;
    setWorking(true);
    setFailure(null);
    setResult(null);
    const isWorkout = planKind === 'Workout Week';
    const prompt = isWorkout
      ? `Build a ${p.daysPerWeek}-day/week workout plan. Goal: ${p.goal}. Level: ${p.level}. Available equipment: ${p.equipment || 'bodyweight only'}. One line per day including rest days.`
      : `Build one day of eating (breakfast, lunch, dinner, one snack) supporting this goal: ${p.goal}. Dietary preference: ${p.diet || 'none'}. Include rough portions, no calorie obsession, one line per meal.`;
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt, maxTokens: 700 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setResult({ kind: isWorkout ? 'workout' : 'nutrition', title: isWorkout ? `${p.daysPerWeek}-Day ${p.level} Plan — ${p.goal}` : `Day of Eating — ${p.goal}`, body: res.text });
  }

  async function keepPlan() {
    if (!result) return;
    const doc = await store.create('plans', result);
    setPlans((prev) => [doc, ...(prev ?? [])]);
    setResult(null);
  }

  async function removePlan(docId: string) {
    await store.remove('plans', docId);
    setPlans((prev) => (prev ?? []).filter((x) => x.docId !== docId));
  }

  function exportPlans() {
    const lines = (plans ?? []).map((x) => `## ${x.data.title}\n\n${x.data.body}`);
    const md = ['# My Coaching Plans', '', '_General fitness information, not medical advice._', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coaching-plans.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profile === undefined || plans === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="ai-health-coach-root">
      <Section title="Your Profile">
        {p && !editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} data-testid="profile-summary">
            <Tag active>🎯 {p.goal}</Tag>
            <Tag>{p.level}</Tag>
            <Tag>🗓️ {p.daysPerWeek} days/week</Tag>
            <Tag>🏋️ {p.equipment || 'Bodyweight'}</Tag>
            {p.diet && <Tag>🍽️ {p.diet}</Tag>}
            <Button variant="ghost" onClick={() => { setDraft(p); setEditing(true); }} data-testid="edit-profile-button" style={{ padding: '5px 10px', fontSize: 12 }}>
              ✏️ Edit
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="profile-editor">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 170 }}>
                <Label>Goal</Label>
                <Input value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} placeholder="e.g. Run a 10k without stopping" data-testid="goal-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 140 }}>
                <Label>Level</Label>
                <Select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })} data-testid="level-select" style={{ width: '100%' }}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div style={{ width: 100 }}>
                <Label>Days/Week</Label>
                <Input type="number" value={draft.daysPerWeek} onChange={(e) => setDraft({ ...draft, daysPerWeek: Math.min(7, Math.max(1, Math.round(Number(e.target.value) || 3))) })} data-testid="days-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Equipment</Label>
                <Input value={draft.equipment} onChange={(e) => setDraft({ ...draft, equipment: e.target.value })} placeholder="e.g. Kettlebell, pull-up bar" data-testid="equipment-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Dietary Preference</Label>
                <Input value={draft.diet} onChange={(e) => setDraft({ ...draft, diet: e.target.value })} placeholder="e.g. Vegetarian" data-testid="diet-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={saveProfile} data-testid="save-profile-button">
                💾 Save Profile
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Get Coached">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SegmentedControl options={['Workout Week', 'Day of Eating'].map((v) => ({ value: v, label: v }))} value={planKind} onChange={setPlanKind} data-testid="kind-control" />
            <Button variant="primary" onClick={generate} data-testid="generate-button" disabled={working || !p}>
              {working ? '🏃 Coaching…' : '🏃 Generate Plan'}
            </Button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }} data-testid="disclaimer">
            General fitness information, not medical advice — check with a professional before starting a new program.
          </p>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited coaching.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 AI needs an account, even to try it — sign in for a few free plans.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free AI calls are used up — unlock the app to keep training.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The coach is offline right now — try again in a bit.
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="result-panel">
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }} data-testid="result-text">
                {result.body}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={keepPlan} data-testid="keep-button">
                  💾 Keep This Plan
                </Button>
                <Button variant="ghost" onClick={generate} data-testid="retry-button" disabled={working}>
                  🔁 Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Saved Plans">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="plan-count">{plans.length}</span>} label="Plans kept" />
          <StatDisplay value={plans.filter((x) => x.data.kind === 'workout').length} label="Workout weeks" />
          <StatDisplay value={plans.filter((x) => x.data.kind === 'nutrition').length} label="Eating days" />
        </div>

        {plans.length === 0 ? (
          <EmptyState icon="🏃">No plans saved yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="plans-list">
            {plans.map((x) => (
              <div key={x.docId} className="module-list-row" data-testid="plan-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag>{x.data.kind === 'workout' ? '🏋️ Workout' : '🍽️ Nutrition'}</Tag>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{x.data.title}</span>
                  </div>
                  <IconButton label="Remove" onClick={() => removePlan(x.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', whiteSpace: 'pre-wrap', marginLeft: 4 }}>{x.data.body}</div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPlans}>
          ⬇️ Export Plans as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
