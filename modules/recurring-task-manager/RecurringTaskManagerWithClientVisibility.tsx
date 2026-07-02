import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Recurring Task Manager with Client Visibility — Task list with recurring
// schedules and shared client view.
// Scope note: "shared client view" is a per-task visibility flag plus a
// client-view toggle that renders exactly what a client would see (shared
// tasks only). A real external client URL needs platform-level share
// links — the flag is the module-side half of that feature.

const CADENCES = ['daily', 'weekly', 'monthly'] as const;
type Cadence = (typeof CADENCES)[number];
const CADENCE_DAYS: Record<Cadence, number> = { daily: 1, weekly: 7, monthly: 30 };

type Task = { title: string; cadence: Cadence; client: string; lastDone: string; shared: boolean };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.parse(todayStr()) - Date.parse(dateStr)) / 86400000);
}

function isDue(task: Task): boolean {
  return daysSince(task.lastDone) >= CADENCE_DAYS[task.cadence];
}

export function RecurringTaskManagerWithClientVisibility({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [tasks, setTasks] = useState<StoreDoc<Task>[] | null>(null);
  const [view, setView] = useState<'internal' | 'client'>('internal');
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [cadence, setCadence] = useState<Cadence>('weekly');
  const [shared, setShared] = useState(false);

  useEffect(() => {
    store.list<Task>('tasks').then(setTasks);
  }, [store]);

  const visible = (tasks ?? []).filter((t) => (view === 'client' ? t.data.shared : true));
  const dueCount = visible.filter((t) => isDue(t.data)).length;

  async function addTask() {
    if (!title.trim()) return;
    const task: Task = { title: title.trim(), cadence, client: client.trim() || 'Internal', lastDone: '1970-01-01', shared };
    const doc = await store.create('tasks', task);
    setTasks((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setClient('');
  }

  async function markDone(doc: StoreDoc<Task>) {
    const updated = await store.update('tasks', doc.docId, { ...doc.data, lastDone: todayStr() });
    setTasks((prev) => (prev ?? []).map((t) => (t.docId === doc.docId ? updated : t)));
  }

  async function toggleShared(doc: StoreDoc<Task>) {
    const updated = await store.update('tasks', doc.docId, { ...doc.data, shared: !doc.data.shared });
    setTasks((prev) => (prev ?? []).map((t) => (t.docId === doc.docId ? updated : t)));
  }

  async function remove(docId: string) {
    await store.remove('tasks', docId);
    setTasks((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportSchedule() {
    const rows = (tasks ?? []).map((t) => `"${t.data.title}",${t.data.cadence},${t.data.client},${t.data.lastDone},${t.data.shared ? 'shared' : 'internal'}`);
    const csv = ['task,cadence,client,last done,visibility', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recurring-tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tasks === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="recurring-task-manager-root">
      <Section title="View">
        <SegmentedControl
          options={[
            { value: 'internal', label: '🗂 Internal View' },
            { value: 'client', label: '👤 Client View' },
          ]}
          value={view}
          onChange={setView}
        />
        {view === 'client' && (
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '10px 0 0' }}>
            Showing only tasks marked Shared — exactly what a client would see.
          </p>
        )}
      </Section>

      {view === 'internal' && (
        <>
          <Divider />
          <Section title="Add a Recurring Task">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <Label>Task</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send weekly report" data-testid="task-title-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <Label>Client</Label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Internal" data-testid="task-client-input" style={{ width: '100%' }} />
              </div>
              <div>
                <Label>Repeats</Label>
                <Select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} data-testid="task-cadence-select">
                  {CADENCES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant={shared ? 'primary' : 'secondary'} onClick={() => setShared((s) => !s)} data-testid="task-shared-toggle">
                {shared ? '👤 Shared' : 'Internal'}
              </Button>
              <Button variant="primary" onClick={addTask} data-testid="add-task-button">
                + Add
              </Button>
            </div>
          </Section>
        </>
      )}

      <Divider />

      <Section title={`Tasks (${dueCount} due)`}>
        {visible.length === 0 ? (
          <EmptyState icon="🔁">{view === 'client' ? 'No tasks are shared with clients yet.' : 'No recurring tasks yet — add one above.'}</EmptyState>
        ) : (
          <div data-testid="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((t) => {
              const due = isDue(t.data);
              return (
                <div key={t.docId} className="module-list-row" data-testid="task-item" style={{ alignItems: 'center' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{t.data.title}</span>
                    <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                      <Tag>{t.data.cadence}</Tag>
                      <span>{t.data.client}</span>
                      {due ? (
                        <Tag active>Due</Tag>
                      ) : (
                        <span>
                          Done {daysSince(t.data.lastDone) === 0 ? 'today' : `${daysSince(t.data.lastDone)}d ago`}
                        </span>
                      )}
                    </div>
                  </div>
                  {view === 'internal' && (
                    <>
                      <Button variant={due ? 'primary' : 'secondary'} onClick={() => markDone(t)} data-testid={`done-${t.docId}`} style={{ padding: '6px 12px', fontSize: 12 }}>
                        ✓ Done
                      </Button>
                      <Button variant="ghost" onClick={() => toggleShared(t)} data-testid={`share-${t.docId}`} style={{ padding: '6px 10px', fontSize: 12 }}>
                        {t.data.shared ? '👤' : '🔒'}
                      </Button>
                      <IconButton label="Remove" onClick={() => remove(t.docId)}>
                        ✕
                      </IconButton>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {view === 'internal' && (
          <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSchedule}>
            ⬇️ Export Schedule as CSV
          </GatedAction>
        )}
      </Section>
    </div>
  );
}
