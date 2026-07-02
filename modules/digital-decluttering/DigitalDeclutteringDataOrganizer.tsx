import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Digital Decluttering & Data Organizer — an inventory of digital clutter
// (files, photos, email, subscriptions) with a keep/archive/delete decision
// per item and progress tracking. The module can't reach into your actual
// drives/inboxes (nor should it) — it's the decision log and progress
// tracker for a declutter pass you run.

const CATEGORIES = ['files', 'photos', 'email', 'subscriptions'] as const;
type Category = (typeof CATEGORIES)[number];
const CAT_ICONS: Record<Category, string> = { files: '📁', photos: '🖼', email: '📧', subscriptions: '💳' };

const DECISIONS = ['pending', 'keep', 'archive', 'delete'] as const;
type Decision = (typeof DECISIONS)[number];

type Entry = { name: string; category: Category; decision: Decision; note: string };

export function DigitalDeclutteringDataOrganizer({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [entries, setEntries] = useState<StoreDoc<Entry>[] | null>(null);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('files');
  const [note, setNote] = useState('');

  useEffect(() => {
    store.list<Entry>('entries').then(setEntries);
  }, [store]);

  const visible = (entries ?? []).filter((e) => filter === 'all' || e.data.category === filter);
  const decided = visible.filter((e) => e.data.decision !== 'pending').length;
  const pct = visible.length ? Math.round((decided / visible.length) * 100) : 0;

  async function addEntry() {
    if (!name.trim()) return;
    const doc = await store.create('entries', { name: name.trim(), category, decision: 'pending' as Decision, note: note.trim() });
    setEntries((prev) => [...(prev ?? []), doc]);
    setName('');
    setNote('');
  }

  async function setDecision(doc: StoreDoc<Entry>, decision: Decision) {
    const updated = await store.update('entries', doc.docId, { ...doc.data, decision });
    setEntries((prev) => (prev ?? []).map((e) => (e.docId === doc.docId ? updated : e)));
  }

  async function remove(docId: string) {
    await store.remove('entries', docId);
    setEntries((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportPlan() {
    const rows = (entries ?? []).map((e) => `"${e.data.name}",${e.data.category},${e.data.decision},"${e.data.note}"`);
    const csv = ['item,category,decision,note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'declutter-plan.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (entries === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="digital-decluttering-root">
      <Section title="Log an Item">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>What Is It?</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Old project archives" data-testid="entry-name-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as Category)} data-testid="entry-category-select">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CAT_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" data-testid="entry-note-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addEntry} data-testid="add-entry-button">
            + Log
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Declutter Queue">
        <div style={{ marginBottom: 12 }}>
          <SegmentedControl
            options={[{ value: 'all' as const, label: 'All' }, ...CATEGORIES.map((c) => ({ value: c, label: `${CAT_ICONS[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}` }))]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {visible.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <StatDisplay value={`${pct}%`} label={`${decided} of ${visible.length} items decided`} />
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="🧹">Nothing logged {filter !== 'all' ? 'in this category ' : ''}yet.</EmptyState>
        ) : (
          <div data-testid="entries-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((e) => (
              <div key={e.docId} className="module-list-row" data-testid="entry-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                    {CAT_ICONS[e.data.category]} {e.data.name}
                  </span>
                  {e.data.note && <div style={{ fontSize: 12, marginTop: 2 }}>{e.data.note}</div>}
                </div>
                {e.data.decision === 'pending' ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button variant="secondary" onClick={() => setDecision(e, 'keep')} data-testid={`keep-${e.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Keep
                    </Button>
                    <Button variant="secondary" onClick={() => setDecision(e, 'archive')} data-testid={`archive-${e.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Archive
                    </Button>
                    <Button variant="secondary" onClick={() => setDecision(e, 'delete')} data-testid={`delete-${e.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Tag active onClick={() => setDecision(e, 'pending')}>
                    {e.data.decision === 'keep' ? '✓ Keep' : e.data.decision === 'archive' ? '📦 Archive' : '🗑 Delete'}
                  </Tag>
                )}
                <IconButton label="Remove" onClick={() => remove(e.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPlan}>
          ⬇️ Export Declutter Plan as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
