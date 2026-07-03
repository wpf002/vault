import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, EmptyState, LoadingState } from '@vault/module-ui';

// Workout Programming Builder — weekly planner: exercises assigned to
// days with sets × reps, a 7-day grid overview, and per-exercise move
// arrows to shuffle days. Scope note: "drag-and-drop exercise library"
// trimmed to day-select + arrows (same rationale as form-builder: no DnD
// dependency, keyboard-accessible for free).

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Exercise = { name: string; sets: number; reps: string; day: number };

export function WorkoutProgrammingBuilder({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [exercises, setExercises] = useState<StoreDoc<Exercise>[] | null>(null);
  const [name, setName] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [day, setDay] = useState(0);

  useEffect(() => {
    store.list<Exercise>('exercises').then(setExercises);
  }, [store]);

  const totalSets = (exercises ?? []).reduce((s, e) => s + e.data.sets, 0);

  async function addExercise() {
    if (!name.trim()) return;
    const e: Exercise = { name: name.trim(), sets: Number(sets) || 3, reps: reps.trim() || '10', day };
    const doc = await store.create('exercises', e);
    setExercises((prev) => [...(prev ?? []), doc]);
    setName('');
  }

  async function moveDay(doc: StoreDoc<Exercise>, dir: -1 | 1) {
    const nextDay = (doc.data.day + dir + 7) % 7;
    const updated = await store.update('exercises', doc.docId, { ...doc.data, day: nextDay });
    setExercises((prev) => (prev ?? []).map((e) => (e.docId === doc.docId ? updated : e)));
  }

  async function remove(docId: string) {
    await store.remove('exercises', docId);
    setExercises((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportProgram() {
    const rows = (exercises ?? [])
      .sort((a, b) => a.data.day - b.data.day)
      .map((e) => `${DAY_LABELS[e.data.day]},"${e.data.name}",${e.data.sets},${e.data.reps}`);
    const csv = ['day,exercise,sets,reps', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout-program.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (exercises === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="workout-programming-builder-root">
      <Section title={`Weekly Program (${totalSets} total sets)`}>
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: 6, minWidth: 800 }} data-testid="week-grid">
            {DAY_LABELS.map((label, dayIdx) => {
              const dayExercises = exercises.filter((e) => e.data.day === dayIdx);
              return (
                <div key={label} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, minHeight: 80 }} data-testid={`day-${dayIdx}`}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: dayExercises.length ? 'var(--module-accent)' : 'var(--color-text-dim)', marginBottom: 6 }}>
                    {label} {dayExercises.length === 0 && '· rest'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayExercises.map((e) => (
                      <div key={e.docId} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 7px', fontSize: 11 }} data-testid="exercise-chip">
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{e.data.name}</div>
                        <div style={{ color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ flex: 1 }}>
                            {e.data.sets}×{e.data.reps}
                          </span>
                          <button onClick={() => moveDay(e, -1)} style={{ all: 'unset', cursor: 'pointer' }} aria-label="Move to previous day">
                            ←
                          </button>
                          <button onClick={() => moveDay(e, 1)} style={{ all: 'unset', cursor: 'pointer' }} aria-label="Move to next day">
                            →
                          </button>
                          <button onClick={() => remove(e.docId)} style={{ all: 'unset', cursor: 'pointer', opacity: 0.6 }} aria-label="Remove exercise">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {exercises.length === 0 && <EmptyState icon="🏋️">Empty program — add your first exercise below.</EmptyState>}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportProgram}>
          ⬇️ Export Program as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add an Exercise">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Exercise</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Back Squat" data-testid="exercise-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 80 }}>
            <Label>Sets</Label>
            <Input type="number" min={1} value={sets} onChange={(e) => setSets(e.target.value)} data-testid="exercise-sets-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Reps</Label>
            <Input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="10 / AMRAP" data-testid="exercise-reps-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Day</Label>
            <Select value={String(day)} onChange={(e) => setDay(Number(e.target.value))} data-testid="exercise-day-select">
              {DAY_LABELS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={addExercise} data-testid="add-exercise-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
