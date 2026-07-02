import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Tag, Section, EmptyState, LoadingState } from '@vault/module-ui';

type Habit = { name: string; checkins: string[] /* 'YYYY-MM-DD', ascending or not — treated as a set */ };

// Habit Tracker with Accountability Partners — Pairs users who check in on
// each other daily.
// Scope trim: pairing users together needs cross-account relationship
// infrastructure this platform doesn't have (the generic store is scoped
// per user, per module — there's no concept of "my partner's data" to
// read). Built the single-player half — habits, daily check-ins,
// streaks — which is the actual substance of "habit tracker"; partners
// would be a real platform feature (invites, shared visibility), not
// something one module can bolt on with what's available today.

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateStr(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function currentStreak(checkins: string[]): number {
  const set = new Set(checkins);
  let streak = 0;
  let offset = set.has(todayStr()) ? 0 : 1; // streak can still be "alive" if today just hasn't happened yet
  while (set.has(dateStr(offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

export function HabitTrackerWithAccountabilityPartners({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [habits, setHabits] = useState<StoreDoc<Habit>[] | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    store.list<Habit>('habits').then(setHabits);
  }, [store]);

  async function addHabit() {
    if (!name.trim()) return;
    const habit: Habit = { name: name.trim(), checkins: [] };
    const doc = await store.create('habits', habit);
    setHabits((prev) => [...(prev ?? []), doc]);
    setName('');
  }

  async function toggleToday(habit: StoreDoc<Habit>) {
    const today = todayStr();
    const checkins = habit.data.checkins.includes(today)
      ? habit.data.checkins.filter((d) => d !== today)
      : [...habit.data.checkins, today];
    const updated = await store.update('habits', habit.docId, { ...habit.data, checkins });
    setHabits((prev) => (prev ?? []).map((h) => (h.docId === habit.docId ? updated : h)));
  }

  async function removeHabit(docId: string) {
    await store.remove('habits', docId);
    setHabits((prev) => (prev ?? []).filter((h) => h.docId !== docId));
  }

  function exportReport() {
    const rows = (habits ?? []).map((h) => `${h.data.name},${currentStreak(h.data.checkins)},${h.data.checkins.length}`);
    const csv = ['habit,current streak,total check-ins', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habit-streak-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (habits === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="habit-tracker-root">
      <Section title="Add a Habit">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Drink water"
            data-testid="habit-name-input"
            style={{ flex: 1 }}
          />
          <Button variant="primary" onClick={addHabit} data-testid="add-habit-button">
            + Add
          </Button>
        </div>
      </Section>

      <Section title="Your Habits">
        {habits.length === 0 ? (
          <EmptyState icon="🔥">No habits yet — add one above.</EmptyState>
        ) : (
          <div data-testid="habits-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {habits.map((h) => {
              const streak = currentStreak(h.data.checkins);
              const doneToday = h.data.checkins.includes(todayStr());
              return (
                <div key={h.docId} className="module-list-row" data-testid="habit-item" style={{ alignItems: 'center' }}>
                  <div className="module-list-row-content" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{h.data.name}</span>
                    {streak > 0 && <Tag active>🔥 {streak}</Tag>}
                    <span style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
                      {Array.from({ length: 7 }, (_, i) => 6 - i).map((offset) => {
                        const filled = h.data.checkins.includes(dateStr(offset));
                        return (
                          <span
                            key={offset}
                            aria-hidden
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: filled ? 'var(--module-accent)' : 'transparent',
                              border: `1px solid ${filled ? 'var(--module-accent)' : 'var(--color-border)'}`,
                            }}
                          />
                        );
                      })}
                    </span>
                  </div>
                  <Button
                    variant={doneToday ? 'primary' : 'secondary'}
                    onClick={() => toggleToday(h)}
                    data-testid={`toggle-today-${h.docId}`}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    {doneToday ? '✓ Done' : 'Mark Today'}
                  </Button>
                  <IconButton label="Remove" onClick={() => removeHabit(h.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
          ⬇️ Export Streak Report as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
