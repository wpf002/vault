import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Employee Onboarding Checklist — Step-by-step onboarding with assignees,
// due dates, and tracking.

type Task = { title: string; assignee: string; dueDate: string; done: boolean; hire: string };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeOnboardingChecklist({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [tasks, setTasks] = useState<StoreDoc<Task>[] | null>(null);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [hire, setHire] = useState('');
  const [activeHire, setActiveHire] = useState<string | null>(null);

  useEffect(() => {
    store.list<Task>('tasks').then((docs) => setTasks(docs.sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate))));
  }, [store]);

  const hires = useMemo(() => Array.from(new Set((tasks ?? []).map((t) => t.data.hire))).sort(), [tasks]);
  const visible = activeHire ? (tasks ?? []).filter((t) => t.data.hire === activeHire) : tasks ?? [];
  const doneCount = visible.filter((t) => t.data.done).length;
  const pct = visible.length ? Math.round((doneCount / visible.length) * 100) : 0;

  async function addTask() {
    if (!title.trim() || !hire.trim()) return;
    const task: Task = {
      title: title.trim(),
      assignee: assignee.trim() || 'Unassigned',
      dueDate: dueDate || todayStr(),
      done: false,
      hire: hire.trim(),
    };
    const doc = await store.create('tasks', task);
    setTasks((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate)));
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

  function exportChecklist() {
    const rows = (tasks ?? []).map((t) => `${t.data.hire},"${t.data.title}",${t.data.assignee},${t.data.dueDate},${t.data.done ? 'done' : 'open'}`);
    const csv = ['hire,task,assignee,due,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onboarding-checklist.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tasks === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="employee-onboarding-checklist-root">
      <Section title="Add a Step">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Task</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Create accounts" data-testid="task-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <Label>New Hire</Label>
            <Input value={hire} onChange={(e) => setHire(e.target.value)} placeholder="Jordan Lee" data-testid="task-hire-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Assignee</Label>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="IT / HR / Manager" data-testid="task-assignee-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Due</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="task-due-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addTask} data-testid="add-task-button">
            + Add
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Checklist">
        {hires.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeHire === null} onClick={() => setActiveHire(null)}>
              All Hires
            </Tag>
            {hires.map((h) => (
              <Tag key={h} active={activeHire === h} onClick={() => setActiveHire(h)}>
                {h}
              </Tag>
            ))}
          </div>
        )}

        {visible.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <StatDisplay value={`${pct}%`} label={`${doneCount} of ${visible.length} steps complete`} />
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="📑">No onboarding steps yet — add the first one.</EmptyState>
        ) : (
          <div data-testid="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((t) => {
              const overdue = !t.data.done && t.data.dueDate < todayStr();
              return (
                <div key={t.docId} className="module-list-row" data-testid="task-item" style={{ alignItems: 'center' }}>
                  <Button
                    variant={t.data.done ? 'primary' : 'secondary'}
                    onClick={() => toggle(t)}
                    data-testid={`toggle-${t.docId}`}
                    style={{ padding: '4px 10px', fontSize: 12, minWidth: 34 }}
                  >
                    {t.data.done ? '✓' : ''}
                  </Button>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: t.data.done ? 'line-through' : 'none', opacity: t.data.done ? 0.6 : 1 }}>
                      {t.data.title}
                    </span>
                    <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                      <Tag>{t.data.assignee}</Tag>
                      <span style={{ color: overdue ? '#ff6b5e' : 'var(--color-text-dim)' }}>
                        {overdue ? 'Overdue — ' : 'Due '}
                        {t.data.dueDate}
                      </span>
                      {hires.length > 1 && !activeHire && <span>· {t.data.hire}</span>}
                    </div>
                  </div>
                  <IconButton label="Remove" onClick={() => remove(t.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportChecklist}>
          ⬇️ Export Checklist as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
