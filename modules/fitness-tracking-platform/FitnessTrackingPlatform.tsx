import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Fitness Tracking Platform — a training log with a 7-day activity
// dashboard, plus an AI coach that reads your recent sessions and gives
// ONE specific, actionable tip (through the proxy — CONTRACT.md #11).
// Scope note: the catalog's "community" half is cross-account social
// infra — the dashboard + AI-tips loop is the substance. Tips carry the
// standing not-medical-advice line.

type Workout = { date: string; activity: string; minutes: number; intensity: 'easy' | 'moderate' | 'hard'; note: string };
type Tip = { tip: string; basedOn: string };

const SYSTEM_PROMPT = [
  'You are a fitness coach reviewing a training log. Give exactly ONE specific, actionable tip based on the pattern you see',
  '(balance, recovery, progression, variety). 2-3 sentences, plain text, no preamble, no lists.',
  'Never diagnose or give medical advice; if the log mentions pain or injury, the tip is to see a professional.',
].join(' ');

function daysAgoStr(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function FitnessTrackingPlatform({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [workouts, setWorkouts] = useState<StoreDoc<Workout>[] | null>(null);
  const [tips, setTips] = useState<StoreDoc<Tip>[] | null>(null);
  const [activity, setActivity] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [intensity, setIntensity] = useState<Workout['intensity']>('moderate');
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Workout>('workouts').then(setWorkouts);
    store.list<Tip>('tips').then(setTips);
  }, [store]);

  const list = workouts ?? [];
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => daysAgoStr(6 - i));
    return days.map((d) => ({ date: d, minutes: list.filter((w) => w.data.date === d).reduce((s, w) => s + w.data.minutes, 0) }));
  }, [list]);
  const weekMinutes = week.reduce((s, d) => s + d.minutes, 0);
  const weekSessions = list.filter((w) => week.some((d) => d.date === w.data.date)).length;
  const maxDay = Math.max(1, ...week.map((d) => d.minutes));

  async function logWorkout() {
    if (!activity.trim()) return;
    const w: Workout = { date: daysAgoStr(0), activity: activity.trim(), minutes: Math.max(1, Math.round(Number(minutes) || 30)), intensity, note: note.trim() };
    const doc = await store.create('workouts', w);
    setWorkouts((prev) => [doc, ...(prev ?? [])]);
    setActivity('');
    setNote('');
  }

  async function removeWorkout(docId: string) {
    await store.remove('workouts', docId);
    setWorkouts((prev) => (prev ?? []).filter((w) => w.docId !== docId));
  }

  async function getTip() {
    if (!ai || working || list.length < 3) return;
    setWorking(true);
    setFailure(null);
    const recent = list.slice(0, 10).map((w) => `${w.data.date}: ${w.data.activity}, ${w.data.minutes}min, ${w.data.intensity}${w.data.note ? ` (${w.data.note})` : ''}`);
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `My recent training log:\n${recent.join('\n')}`, maxTokens: 300 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const doc = await store.create('tips', { tip: res.text.trim(), basedOn: `${Math.min(10, list.length)} recent sessions` });
    setTips((prev) => [doc, ...(prev ?? [])]);
  }

  async function removeTip(docId: string) {
    await store.remove('tips', docId);
    setTips((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportLog() {
    const rows = list.map((w) => `${w.data.date},"${w.data.activity}",${w.data.minutes},${w.data.intensity},"${w.data.note}"`);
    const csv = ['date,activity,minutes,intensity,note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (workouts === null || tips === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="fitness-tracking-platform-root">
      <Section title="This Week">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="week-minutes">{weekMinutes}</span>} label="Active minutes (7 days)" />
          <StatDisplay value={weekSessions} label="Sessions" />
          <StatDisplay value={tips.length} label="Coach tips received" />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 70 }} data-testid="week-chart">
          {week.map((d) => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: `${(d.minutes / maxDay) * 52}px`, minHeight: 2, borderRadius: 4, background: d.minutes > 0 ? 'var(--module-accent)' : 'var(--color-surface-2, rgba(255,255,255,0.08))' }} />
              <span style={{ fontSize: 9, color: 'var(--color-text-dim)' }}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      <Section title="AI Coach">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={getTip} data-testid="tip-button" disabled={working || list.length < 3}>
              {working ? '⌚ Reading your log…' : '⌚ Get a Coaching Tip'}
            </Button>
            {list.length < 3 && <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Log at least 3 workouts first.</span>}
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>General fitness info, not medical advice.</span>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited coaching.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The AI coach needs an account, even to try it — sign in for a few free tips.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free coaching calls are used up — unlock the app to keep the coach.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The coach is offline right now — your log is safe, try again in a bit.
            </div>
          )}

          {tips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="tips-list">
              {tips.map((t) => (
                <div key={t.docId} className="module-list-row" data-testid="tip-item" style={{ alignItems: 'flex-start' }}>
                  <span style={{ minWidth: 24 }}>💡</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontSize: 13, lineHeight: 1.6 }}>{t.data.tip}</span>
                    <div style={{ fontSize: 11, marginTop: 4, color: 'var(--color-text-dim)' }}>Based on {t.data.basedOn}</div>
                  </div>
                  <IconButton label="Remove" onClick={() => removeTip(t.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Training Log">
        {list.length === 0 ? (
          <EmptyState icon="⌚">No workouts logged — today counts.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="workouts-list">
            {list.map((w) => (
              <div key={w.docId} className="module-list-row" data-testid="workout-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{w.data.activity}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {w.data.date}
                    {w.data.note ? ` · ${w.data.note}` : ''}
                  </div>
                </div>
                <Tag active={w.data.intensity === 'hard'}>{w.data.intensity === 'easy' ? '🟢 Easy' : w.data.intensity === 'moderate' ? '🟡 Moderate' : '🔴 Hard'}</Tag>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{w.data.minutes} min</span>
                <IconButton label="Remove" onClick={() => removeWorkout(w.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Activity</Label>
            <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Run — easy 5k" data-testid="activity-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Minutes</Label>
            <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} data-testid="minutes-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Intensity</Label>
            <Select value={intensity} onChange={(e) => setIntensity(e.target.value as Workout['intensity'])} data-testid="intensity-select" style={{ width: '100%' }}>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" data-testid="note-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={logWorkout} data-testid="log-button">
            + Log It
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLog}>
          ⬇️ Export Training Log as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
