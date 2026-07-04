import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, EmptyState, LoadingState } from '@vault/module-ui';

// Customizable Personal Dashboard — Widgets for to-do lists, shortcuts, and
// notes.
// Scope note: the catalog mentions weather/news widgets — those need
// third-party API calls the module runtime doesn't proxy (and shouldn't:
// preview must work offline per CONTRACT.md #2). The customizable-widget
// substance is here with three self-contained widget kinds; API-backed
// kinds can join once the platform grows an outbound-fetch story.

const KINDS = ['todo', 'links', 'notes'] as const;
type Kind = (typeof KINDS)[number];
const KIND_META: Record<Kind, { label: string; icon: string; placeholder: string }> = {
  todo: { label: 'To-Do List', icon: '☑️', placeholder: 'New task' },
  links: { label: 'Shortcuts', icon: '🔗', placeholder: 'example.com' },
  notes: { label: 'Notes', icon: '📝', placeholder: 'Jot something down' },
};

type Widget = { kind: Kind; title: string; items: string[] };

export function CustomizablePersonalDashboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [widgets, setWidgets] = useState<StoreDoc<Widget>[] | null>(null);
  const [newKind, setNewKind] = useState<Kind>('todo');
  const [newTitle, setNewTitle] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Widget>('widgets').then(setWidgets);
  }, [store]);

  async function addWidget() {
    if (!newTitle.trim()) return;
    const doc = await store.create('widgets', { kind: newKind, title: newTitle.trim(), items: [] });
    setWidgets((prev) => [...(prev ?? []), doc]);
    setNewTitle('');
  }

  async function addItem(doc: StoreDoc<Widget>) {
    const text = (drafts[doc.docId] ?? '').trim();
    if (!text) return;
    const updated = await store.update('widgets', doc.docId, { ...doc.data, items: [...doc.data.items, text] });
    setWidgets((prev) => (prev ?? []).map((w) => (w.docId === doc.docId ? updated : w)));
    setDrafts((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function removeItem(doc: StoreDoc<Widget>, index: number) {
    const items = doc.data.items.filter((_, i) => i !== index);
    const updated = await store.update('widgets', doc.docId, { ...doc.data, items });
    setWidgets((prev) => (prev ?? []).map((w) => (w.docId === doc.docId ? updated : w)));
  }

  async function removeWidget(docId: string) {
    await store.remove('widgets', docId);
    setWidgets((prev) => (prev ?? []).filter((w) => w.docId !== docId));
  }

  function exportDashboard() {
    const md = (widgets ?? [])
      .map((w) => `## ${KIND_META[w.data.kind].icon} ${w.data.title}\n${w.data.items.map((i) => `- ${i}`).join('\n')}`)
      .join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (widgets === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="personal-dashboard-root">
      <Section title="Add a Widget">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <Label>Type</Label>
            <Select value={newKind} onChange={(e) => setNewKind(e.target.value as Kind)} data-testid="widget-kind-select">
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_META[k].icon} {KIND_META[k].label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Title</Label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Today" data-testid="widget-title-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addWidget} data-testid="add-widget-button">
            + Add Widget
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Dashboard">
        {widgets.length === 0 ? (
          <EmptyState icon="🧭">No widgets yet — add one above to build your dashboard.</EmptyState>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }} data-testid="dashboard-grid">
            {widgets.map((w) => (
              <div key={w.docId} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12 }} data-testid="widget">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span aria-hidden>{KIND_META[w.data.kind].icon}</span>
                  <strong style={{ flex: 1 }}>{w.data.title}</strong>
                  <IconButton label="Remove widget" onClick={() => removeWidget(w.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {w.data.items.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Empty — add something below.</span>
                  ) : (
                    w.data.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-dim)' }}>
                        <span style={{ flex: 1, wordBreak: 'break-word' }}>
                          {w.data.kind === 'links' ? (
                            <a href={`https://${item.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--module-accent)' }}>
                              {item}
                            </a>
                          ) : (
                            item
                          )}
                        </span>
                        <IconButton label="Remove item" onClick={() => removeItem(w, i)}>
                          ✕
                        </IconButton>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input
                    value={drafts[w.docId] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [w.docId]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addItem(w)}
                    placeholder={KIND_META[w.data.kind].placeholder}
                    data-testid={`item-input-${w.docId}`}
                    style={{ flex: 1, fontSize: 13, padding: '6px 8px' }}
                  />
                  <Button variant="secondary" onClick={() => addItem(w)} data-testid={`add-item-${w.docId}`} style={{ padding: '6px 10px', fontSize: 12 }}>
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDashboard}>
          Export Dashboard as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
