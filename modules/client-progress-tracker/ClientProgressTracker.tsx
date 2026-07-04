import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Client Progress Tracker — Timeline with milestone markers and file
// attachments. Attachments are named references (the generic store holds
// JSON, not blobs) — the timeline, completion state, and progress readout
// are the substance.

type Milestone = { project: string; title: string; date: string; done: boolean; attachment: string };

export function ClientProgressTracker({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [milestones, setMilestones] = useState<StoreDoc<Milestone>[] | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [project, setProject] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [attachment, setAttachment] = useState('');

  useEffect(() => {
    store.list<Milestone>('milestones').then((docs) => setMilestones(docs.sort((a, b) => a.data.date.localeCompare(b.data.date))));
  }, [store]);

  const projects = useMemo(() => Array.from(new Set((milestones ?? []).map((m) => m.data.project))).sort(), [milestones]);
  const visible = activeProject ? (milestones ?? []).filter((m) => m.data.project === activeProject) : milestones ?? [];
  const doneCount = visible.filter((m) => m.data.done).length;
  const pct = visible.length ? Math.round((doneCount / visible.length) * 100) : 0;

  async function addMilestone() {
    if (!title.trim() || !project.trim() || !date) return;
    const m: Milestone = { project: project.trim(), title: title.trim(), date, done: false, attachment: attachment.trim() };
    const doc = await store.create('milestones', m);
    setMilestones((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.date.localeCompare(b.data.date)));
    setTitle('');
    setAttachment('');
  }

  async function toggle(doc: StoreDoc<Milestone>) {
    const updated = await store.update('milestones', doc.docId, { ...doc.data, done: !doc.data.done });
    setMilestones((prev) => (prev ?? []).map((m) => (m.docId === doc.docId ? updated : m)));
  }

  async function remove(docId: string) {
    await store.remove('milestones', docId);
    setMilestones((prev) => (prev ?? []).filter((m) => m.docId !== docId));
  }

  function exportTimeline() {
    const rows = (milestones ?? []).map((m) => `${m.data.project},"${m.data.title}",${m.data.date},${m.data.done ? 'done' : 'upcoming'},"${m.data.attachment}"`);
    const csv = ['project,milestone,date,status,attachment', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'progress-timeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (milestones === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="client-progress-tracker-root">
      <Section title="Add a Milestone">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Project</Label>
            <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Acme Rebrand" data-testid="milestone-project-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 2, minWidth: 170 }}>
            <Label>Milestone</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Logo concepts round 1" data-testid="milestone-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="milestone-date-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Attachment (Name)</Label>
            <Input value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="Optional file name" data-testid="milestone-attachment-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addMilestone} data-testid="add-milestone-button">
            + Add
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Timeline">
        {projects.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeProject === null} onClick={() => setActiveProject(null)}>
              All Projects
            </Tag>
            {projects.map((p) => (
              <Tag key={p} active={activeProject === p} onClick={() => setActiveProject(p)}>
                {p}
              </Tag>
            ))}
          </div>
        )}

        {visible.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <StatDisplay value={`${pct}%`} label={`${doneCount} of ${visible.length} milestones reached`} />
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="📈">No milestones yet — map out the project above.</EmptyState>
        ) : (
          <div data-testid="timeline" style={{ position: 'relative', paddingLeft: 22, marginBottom: 16 }}>
            <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--color-border)' }} aria-hidden />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visible.map((m) => (
                <div key={m.docId} style={{ position: 'relative' }} data-testid="milestone-item">
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: -22,
                      top: 12,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: m.data.done ? 'var(--module-accent)' : 'var(--color-surface)',
                      border: `2px solid ${m.data.done ? 'var(--module-accent)' : 'var(--color-border)'}`,
                    }}
                  />
                  <div className="module-list-row" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{m.data.title}</span>
                      <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.data.date}</span>
                        {!activeProject && projects.length > 1 && <Tag>{m.data.project}</Tag>}
                        {m.data.attachment && <span>📎 {m.data.attachment}</span>}
                      </div>
                    </div>
                    <Button
                      variant={m.data.done ? 'primary' : 'secondary'}
                      onClick={() => toggle(m)}
                      data-testid={`toggle-${m.docId}`}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      {m.data.done ? '✓ Reached' : 'Mark Reached'}
                    </Button>
                    <IconButton label="Remove" onClick={() => remove(m.docId)}>
                      ✕
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportTimeline}>
          Export Timeline as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
