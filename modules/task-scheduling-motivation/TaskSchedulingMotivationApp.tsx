import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Task Scheduling & Motivation App — Schedule daily tasks with motivational
// prompts. Scope note: push "reminders" need platform notification infra;
// the schedule + the motivational layer (progress-aware encouragement that
// changes as you complete things) is the module substance.

type Task = { title: string; time: string; date: string; done: boolean };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// deterministic per-day pick so preview stays stable within a session
const PROMPTS_START = [
  'Small steps count. Pick the easiest task and start there.',
  'Momentum beats motivation — do five minutes of the first task.',
  'Today has exactly as many hours as you need for this list.',
];
const PROMPTS_MID = [
  'Solid progress — the streak is alive. Keep it rolling.',
  'Halfway there. The rest is downhill.',
  'Look at that list shrinking. One more before a break?',
];
const PROMPTS_DONE = [
  'Everything done. Tomorrow-you says thanks. 🎉',
  'Clean sweep — enjoy the earned rest.',
  'List cleared. That was the whole assignment.',
];

function prompt(doneCount: number, total: number): string {
  const pool = total === 0 || doneCount === 0 ? PROMPTS_START : doneCount >= total ? PROMPTS_DONE : PROMPTS_MID;
  const daySeed = Number(todayStr().replaceAll('-', '')) % pool.length;
  return pool[daySeed]!;
}

export function TaskSchedulingMotivationApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [tasks, setTasks] = useState<StoreDoc<Task>[] | null>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    store.list<Task>('tasks').then((docs) => setTasks(docs.sort((a, b) => a.data.time.localeCompare(b.data.time))));
  }, [store]);

  const today = useMemo(() => (tasks ?? []).filter((t) => t.data.date === todayStr()), [tasks]);
  const doneCount = today.filter((t) => t.data.done).length;

  async function addTask() {
    if (!title.trim()) return;
    const doc = await store.create('tasks', { title: title.trim(), time, date: todayStr(), done: false });
    setTasks((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.time.localeCompare(b.data.time)));
    setTitle('');
  }

  async function toggle(doc: StoreDoc<Task>) {
    const updated = await store.update('tasks', doc.docId, { ...doc.data, done: !doc.data.done });
    setTasks((prev) => (prev ?? []).map((t) => (t.docId === doc.docId ? updated : t)));
  }

  async function remove(docId: string) {
    await store.remove('tasks', docId);
    setTasks((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportDay() {
    const rows = today.map((t) => `${t.data.time},"${t.data.title}",${t.data.done ? 'done' : 'open'}`);
    const csv = ['time,task,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tasks === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="task-scheduling-motivation-root">
      <Section title="Today">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={`${doneCount}/${today.length}`} label={prompt(doneCount, today.length)} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ width: 110 }}>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="task-time-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Label>Task</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="e.g. Deep work block"
              data-testid="task-title-input"
              style={{ width: '100%' }}
            />
          </div>
          <Button variant="primary" onClick={addTask} data-testid="add-task-button">
            + Schedule
          </Button>
        </div>

        {today.length === 0 ? (
          <EmptyState icon="📅">Nothing scheduled today — add your first task above.</EmptyState>
        ) : (
          <div data-testid="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {today.map((t) => (
              <div key={t.docId} className="module-list-row" data-testid="task-item" style={{ alignItems: 'center' }}>
                <Button
                  variant={t.data.done ? 'primary' : 'secondary'}
                  onClick={() => toggle(t)}
                  data-testid={`toggle-${t.docId}`}
                  style={{ padding: '4px 10px', fontSize: 12, minWidth: 34 }}
                >
                  {t.data.done ? '✓' : ''}
                </Button>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13 }}>{t.data.time}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: t.data.done ? 'line-through' : 'none', opacity: t.data.done ? 0.6 : 1 }}>
                    {t.data.title}
                  </span>
                </div>
                <IconButton label="Remove" onClick={() => remove(t.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Export">
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDay}>
          Export Today's Schedule as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
