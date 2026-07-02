import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Creative Collaboration Hub for Artists — project board where artists
// post work seeking collaborators across disciplines. Hub-keeper side:
// projects carry open roles and a collaborator roster; filling a role
// moves the person onto the roster. Cross-account artist logins are
// platform-level work.

type Project = { title: string; disciplines: string[]; summary: string; openRoles: string[]; collaborators: string[]; status: 'open' | 'in-progress' | 'done' };

export function CreativeCollaborationHubForArtists({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [projects, setProjects] = useState<StoreDoc<Project>[] | null>(null);
  const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [disciplines, setDisciplines] = useState('');
  const [summary, setSummary] = useState('');
  const [roles, setRoles] = useState('');
  const [fillDrafts, setFillDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Project>('projects').then(setProjects);
  }, [store]);

  const allDisciplines = useMemo(() => Array.from(new Set((projects ?? []).flatMap((p) => p.data.disciplines))).sort(), [projects]);
  const visible = (projects ?? []).filter((p) => !activeDiscipline || p.data.disciplines.includes(activeDiscipline));

  async function addProject() {
    if (!title.trim()) return;
    const p: Project = {
      title: title.trim(),
      disciplines: disciplines.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
      summary: summary.trim(),
      openRoles: roles.split(',').map((r) => r.trim()).filter(Boolean),
      collaborators: [],
      status: 'open',
    };
    const doc = await store.create('projects', p);
    setProjects((prev) => [doc, ...(prev ?? [])]);
    setTitle('');
    setDisciplines('');
    setSummary('');
    setRoles('');
  }

  async function fillRole(doc: StoreDoc<Project>, roleIndex: number) {
    const person = (fillDrafts[doc.docId] ?? '').trim();
    if (!person) return;
    const role = doc.data.openRoles[roleIndex]!;
    const openRoles = doc.data.openRoles.filter((_, i) => i !== roleIndex);
    const next: Project = {
      ...doc.data,
      openRoles,
      collaborators: [...doc.data.collaborators, `${person} (${role})`],
      status: openRoles.length === 0 ? 'in-progress' : doc.data.status,
    };
    const updated = await store.update('projects', doc.docId, next);
    setProjects((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
    setFillDrafts((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function markDone(doc: StoreDoc<Project>) {
    const next: Project = { ...doc.data, status: 'done' };
    const updated = await store.update('projects', doc.docId, next);
    setProjects((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('projects', docId);
    setProjects((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportBoard() {
    const rows = (projects ?? []).map((p) => `"${p.data.title}","${p.data.disciplines.join(' ')}",${p.data.status},"${p.data.openRoles.join('; ')}","${p.data.collaborators.join('; ')}"`);
    const csv = ['project,disciplines,status,open roles,collaborators', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collab-board.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (projects === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="creative-collaboration-hub-root">
      <Section title="Projects Seeking Collaborators">
        {allDisciplines.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeDiscipline === null} onClick={() => setActiveDiscipline(null)}>
              All
            </Tag>
            {allDisciplines.map((d) => (
              <Tag key={d} active={activeDiscipline === d} onClick={() => setActiveDiscipline(d)}>
                🎨 {d}
              </Tag>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="🎨">No projects on the board — post one below.</EmptyState>
        ) : (
          <div data-testid="projects-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {visible.map((p) => (
              <div key={p.docId} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12, opacity: p.data.status === 'done' ? 0.6 : 1 }} data-testid="project-item">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <strong style={{ color: 'var(--color-text)', flex: 1 }}>{p.data.title}</strong>
                  {p.data.disciplines.map((d) => (
                    <Tag key={d}>{d}</Tag>
                  ))}
                  <Tag active={p.data.status !== 'done'}>{p.data.status}</Tag>
                  {p.data.status === 'in-progress' && (
                    <Button variant="ghost" onClick={() => markDone(p)} data-testid={`done-${p.docId}`} style={{ padding: '4px 8px', fontSize: 12 }}>
                      Mark Done
                    </Button>
                  )}
                  <IconButton label="Remove" onClick={() => remove(p.docId)}>
                    ✕
                  </IconButton>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 8px' }}>{p.data.summary}</p>
                {p.data.collaborators.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '0 0 8px' }}>👥 {p.data.collaborators.join(' · ')}</p>
                )}
                {p.data.openRoles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {p.data.openRoles.map((role, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Tag active>Open: {role}</Tag>
                        <Input
                          value={fillDrafts[p.docId] ?? ''}
                          onChange={(e) => setFillDrafts((prev) => ({ ...prev, [p.docId]: e.target.value }))}
                          placeholder="Who's joining?"
                          data-testid={`fill-input-${p.docId}`}
                          style={{ width: 140, padding: '5px 8px', fontSize: 12 }}
                        />
                        <Button variant="secondary" onClick={() => fillRole(p, i)} data-testid={`fill-${p.docId}-${i}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                          Fill Role
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          ⬇️ Export Board as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Post a Project">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" data-testid="project-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Disciplines (Comma Separated)</Label>
            <Input value={disciplines} onChange={(e) => setDisciplines(e.target.value)} placeholder="illustration, writing" data-testid="project-disciplines-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <Label>Summary</Label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What are you making, and what do you need?" data-testid="project-summary-input" style={{ minHeight: 60 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label>Open Roles (Comma Separated)</Label>
            <Input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Illustrator, Motion designer" data-testid="project-roles-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProject} data-testid="add-project-button">
            + Post
          </Button>
        </div>
      </Section>
    </div>
  );
}
