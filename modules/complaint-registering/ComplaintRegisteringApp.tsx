import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Complaint Registering App — file complaints with a reference ID and a
// department routing, track each through the civic lifecycle (submitted
// → acknowledged → in progress → resolved), log follow-ups, and export
// a formal record. Scope note: direct submission into a government
// portal is a per-city API integration — this is the resident's ledger:
// the record you file, the trail you keep.

type Complaint = { refId: string; title: string; department: string; location: string; description: string; status: 'submitted' | 'acknowledged' | 'in_progress' | 'resolved'; followUps: number; dateFiled: string };

const DEPARTMENTS = ['Roads', 'Sanitation', 'Water', 'Parks', 'Noise', 'Zoning'];

const STATUS_FLOW: Complaint['status'][] = ['submitted', 'acknowledged', 'in_progress', 'resolved'];
const STATUS_LABELS: Record<Complaint['status'], string> = {
  submitted: '📨 Submitted',
  acknowledged: '👀 Acknowledged',
  in_progress: '🔧 In Progress',
  resolved: '✅ Resolved',
};

function daysOpen(dateFiled: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(dateFiled)) / 86400000));
}

export function ComplaintRegisteringApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [complaints, setComplaints] = useState<StoreDoc<Complaint>[] | null>(null);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Roads');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    store.list<Complaint>('complaints').then(setComplaints);
  }, [store]);

  const list = complaints ?? [];
  const open = list.filter((c) => c.data.status !== 'resolved');
  const resolvedCount = list.length - open.length;
  const oldestOpen = open.length > 0 ? Math.max(...open.map((c) => daysOpen(c.data.dateFiled))) : 0;

  async function fileComplaint() {
    if (!title.trim() || !description.trim()) return;
    // ref numbers continue from the highest on file, so they stay unique and sequential
    const maxRef = list.reduce((m, c) => Math.max(m, Number(c.data.refId.replace('CMP-', '')) || 0), 1000);
    const c: Complaint = {
      refId: `CMP-${maxRef + 1}`,
      title: title.trim(),
      department,
      location: location.trim() || 'Not specified',
      description: description.trim(),
      status: 'submitted',
      followUps: 0,
      dateFiled: new Date().toISOString().slice(0, 10),
    };
    const doc = await store.create('complaints', c);
    setComplaints((prev) => [doc, ...(prev ?? [])]);
    setTitle('');
    setLocation('');
    setDescription('');
  }

  async function advance(doc: StoreDoc<Complaint>) {
    const idx = STATUS_FLOW.indexOf(doc.data.status);
    if (idx >= STATUS_FLOW.length - 1) return;
    const next: Complaint = { ...doc.data, status: STATUS_FLOW[idx + 1]! };
    const updated = await store.update('complaints', doc.docId, next);
    setComplaints((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function logFollowUp(doc: StoreDoc<Complaint>) {
    const updated = await store.update('complaints', doc.docId, { ...doc.data, followUps: doc.data.followUps + 1 });
    setComplaints((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function remove(docId: string) {
    await store.remove('complaints', docId);
    setComplaints((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportRecord() {
    const lines = list.map((c) =>
      [
        `## ${c.data.refId} — ${c.data.title}`,
        `- **Department:** ${c.data.department}`,
        `- **Location:** ${c.data.location}`,
        `- **Filed:** ${c.data.dateFiled} (${daysOpen(c.data.dateFiled)} days ago)`,
        `- **Status:** ${c.data.status.replace('_', ' ')}`,
        `- **Follow-ups sent:** ${c.data.followUps}`,
        '',
        c.data.description,
      ].join('\n'),
    );
    const md = ['# Complaint Record', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'complaint-record.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (complaints === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="complaint-registering-root">
      <Section title="Case Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="open-count">{open.length}</span>} label="Open complaints" />
          <StatDisplay value={<span data-testid="resolved-count">{resolvedCount}</span>} label="Resolved" />
          <StatDisplay value={oldestOpen > 0 ? `${oldestOpen} days` : '—'} label="Longest open case" />
        </div>
      </Section>

      <Divider />

      <Section title="File a Complaint">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 170 }}>
              <Label>Subject</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Broken crosswalk signal" data-testid="title-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 140 }}>
              <Label>Department</Label>
              <Select value={department} onChange={(e) => setDepartment(e.target.value)} data-testid="department-select" style={{ width: '100%' }}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ width: 180 }}>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main St & 3rd Ave" data-testid="location-input" style={{ width: '100%' }} />
            </div>
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue — what, where, since when, and its impact." data-testid="description-input" rows={3} style={{ width: '100%' }} />
          <Button variant="primary" onClick={fileComplaint} data-testid="file-button" style={{ alignSelf: 'flex-start' }}>
            Register Complaint
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Your Cases">
        {list.length === 0 ? (
          <EmptyState icon="📮">No complaints on file.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="complaints-list">
            {list.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="complaint-item" style={{ alignItems: 'center' }}>
                <span style={{ color: 'var(--module-accent)', fontWeight: 700, fontSize: 12, minWidth: 74, fontVariantNumeric: 'tabular-nums' }}>{c.data.refId}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {c.data.department} · {c.data.location} · filed {c.data.dateFiled}
                    {c.data.followUps > 0 ? ` · ${c.data.followUps} follow-ups` : ''}
                  </div>
                </div>
                <Tag active={c.data.status === 'resolved'} data-testid={`status-${c.data.refId}`}>
                  {STATUS_LABELS[c.data.status]}
                </Tag>
                {c.data.status !== 'resolved' && (
                  <>
                    <Button variant="secondary" onClick={() => advance(c)} data-testid={`advance-${c.data.refId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      → {STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(c.data.status) + 1]!].split(' ')[1]}
                    </Button>
                    <Button variant="ghost" onClick={() => logFollowUp(c)} data-testid={`followup-${c.data.refId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Follow Up
                    </Button>
                  </>
                )}
                <IconButton label="Remove" onClick={() => remove(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportRecord}>
          Export Formal Record as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
