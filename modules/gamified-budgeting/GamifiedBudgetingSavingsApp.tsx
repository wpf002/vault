import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Gamified Budgeting & Savings App — savings goals with progress bars,
// self-set challenges that pay out XP on completion, and a level track
// (250 XP per level). Money is integer cents. Scope note: linked bank
// accounts / real reward redemption are third-party integrations —
// the game loop and savings math live here.

type Goal = { name: string; targetCents: number; savedCents: number; emoji: string };
type Challenge = { title: string; rewardXp: number; status: 'active' | 'done' };
type Profile = { xp: number };

const XP_PER_LEVEL = 250;

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function GamifiedBudgetingSavingsApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [goals, setGoals] = useState<StoreDoc<Goal>[] | null>(null);
  const [challenges, setChallenges] = useState<StoreDoc<Challenge>[] | null>(null);
  const [profile, setProfile] = useState<StoreDoc<Profile> | null | undefined>(undefined);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [deposits, setDeposits] = useState<Record<string, string>>({});
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeXp, setChallengeXp] = useState('100');

  useEffect(() => {
    store.list<Goal>('goals').then(setGoals);
    store.list<Challenge>('challenges').then(setChallenges);
    store.list<Profile>('profile').then((docs) => setProfile(docs[0] ?? null));
  }, [store]);

  const xp = profile?.data.xp ?? 0;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  const totalSaved = (goals ?? []).reduce((s, g) => s + g.data.savedCents, 0);

  async function addXp(amount: number) {
    const nextXp = xp + amount;
    if (profile) {
      const updated = await store.update('profile', profile.docId, { xp: nextXp });
      setProfile(updated);
    } else {
      const doc = await store.create('profile', { xp: nextXp });
      setProfile(doc);
    }
  }

  async function addGoal() {
    if (!goalName.trim()) return;
    const g: Goal = { name: goalName.trim(), targetCents: Math.round((Number(goalTarget) || 0) * 100), savedCents: 0, emoji: '🎯' };
    const doc = await store.create('goals', g);
    setGoals((prev) => [...(prev ?? []), doc]);
    setGoalName('');
    setGoalTarget('');
  }

  async function deposit(doc: StoreDoc<Goal>) {
    const amountCents = Math.round((Number(deposits[doc.docId]) || 0) * 100);
    if (amountCents <= 0) return;
    const wasComplete = doc.data.savedCents >= doc.data.targetCents;
    const next = { ...doc.data, savedCents: doc.data.savedCents + amountCents };
    const updated = await store.update('goals', doc.docId, next);
    setGoals((prev) => (prev ?? []).map((g) => (g.docId === doc.docId ? updated : g)));
    setDeposits((prev) => ({ ...prev, [doc.docId]: '' }));
    // every deposit earns a little XP; crossing the finish line earns a bonus
    const bonus = !wasComplete && next.savedCents >= next.targetCents && next.targetCents > 0 ? 100 : 0;
    await addXp(10 + bonus);
  }

  async function removeGoal(docId: string) {
    await store.remove('goals', docId);
    setGoals((prev) => (prev ?? []).filter((g) => g.docId !== docId));
  }

  async function addChallenge() {
    if (!challengeTitle.trim()) return;
    const c: Challenge = { title: challengeTitle.trim(), rewardXp: Number(challengeXp) || 100, status: 'active' };
    const doc = await store.create('challenges', c);
    setChallenges((prev) => [...(prev ?? []), doc]);
    setChallengeTitle('');
  }

  async function completeChallenge(doc: StoreDoc<Challenge>) {
    const next: Challenge = { ...doc.data, status: 'done' };
    const updated = await store.update('challenges', doc.docId, next);
    setChallenges((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
    await addXp(doc.data.rewardXp);
  }

  async function removeChallenge(docId: string) {
    await store.remove('challenges', docId);
    setChallenges((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportProgress() {
    const goalRows = (goals ?? []).map((g) => `goal,"${g.data.name}",${(g.data.savedCents / 100).toFixed(2)},${(g.data.targetCents / 100).toFixed(2)}`);
    const challengeRows = (challenges ?? []).map((c) => `challenge,"${c.data.title}",${c.data.rewardXp},${c.data.status}`);
    const csv = ['type,name,value,target/status', ...goalRows, ...challengeRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'savings-progress.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (goals === null || challenges === null || profile === undefined) return <LoadingState />;

  return (
    <div className="module-card" data-testid="gamified-budgeting-root">
      <Section title="Your Progress">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
          <StatDisplay value={<span data-testid="level-value">Level {level}</span>} label={`${intoLevel} / ${XP_PER_LEVEL} XP to next level`} />
          <StatDisplay value={<span data-testid="xp-value">{xp} XP</span>} label="Lifetime experience" />
          <StatDisplay value={fmt(totalSaved)} label="Total saved across goals" />
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(intoLevel / XP_PER_LEVEL) * 100}%`, background: 'var(--module-accent)', borderRadius: 4, transition: 'width 200ms' }} data-testid="level-bar" />
        </div>
      </Section>

      <Divider />

      <Section title="Savings Goals">
        {goals.length === 0 ? (
          <EmptyState icon="🎯">No goals yet — set your first target below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {goals.map((g) => {
              const pct = g.data.targetCents > 0 ? Math.min(100, (g.data.savedCents / g.data.targetCents) * 100) : 0;
              const complete = g.data.savedCents >= g.data.targetCents && g.data.targetCents > 0;
              return (
                <div key={g.docId} className="module-list-row" data-testid="goal-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{g.data.emoji}</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, flex: 1 }}>{g.data.name}</span>
                    {complete && <Tag active>🏆 Complete</Tag>}
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>
                      {fmt(g.data.savedCents)} / {fmt(g.data.targetCents)}
                    </span>
                    <IconButton label="Remove" onClick={() => removeGoal(g.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--module-accent)', borderRadius: 3, transition: 'width 200ms' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      type="number"
                      value={deposits[g.docId] ?? ''}
                      onChange={(e) => setDeposits((prev) => ({ ...prev, [g.docId]: e.target.value }))}
                      placeholder="Amount ($)"
                      data-testid={`deposit-input-${g.docId}`}
                      style={{ width: 120 }}
                    />
                    <Button variant="secondary" onClick={() => deposit(g)} data-testid={`deposit-button-${g.docId}`} style={{ padding: '5px 12px', fontSize: 12 }}>
                      Deposit (+10 XP)
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Goal</Label>
            <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g. New Laptop" data-testid="goal-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Target ($)</Label>
            <Input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} data-testid="goal-target-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addGoal} data-testid="add-goal-button">
            + Add Goal
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Challenges">
        {challenges.length === 0 ? (
          <EmptyState icon="🎮">No challenges — dare yourself below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="challenges-list">
            {challenges.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="challenge-item" style={{ alignItems: 'center', opacity: c.data.status === 'done' ? 0.6 : 1 }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: c.data.status === 'done' ? 'line-through' : 'none' }}>{c.data.title}</span>
                </div>
                <Tag active={c.data.status === 'done'}>
                  {c.data.status === 'done' ? `✓ +${c.data.rewardXp} XP earned` : `⚡ ${c.data.rewardXp} XP`}
                </Tag>
                {c.data.status === 'active' && (
                  <Button variant="secondary" onClick={() => completeChallenge(c)} data-testid={`complete-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    ✓ Done
                  </Button>
                )}
                <IconButton label="Remove" onClick={() => removeChallenge(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Challenge</Label>
            <Input value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} placeholder="e.g. No-Coffee-Shop Week" data-testid="challenge-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Reward XP</Label>
            <Input type="number" value={challengeXp} onChange={(e) => setChallengeXp(e.target.value)} data-testid="challenge-xp-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addChallenge} data-testid="add-challenge-button">
            + Add Challenge
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportProgress}>
          Export Progress as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
