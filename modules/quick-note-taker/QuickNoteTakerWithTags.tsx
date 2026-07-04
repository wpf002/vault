import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, Input, Textarea, Label, Section, Divider, Tag, ListRow, EmptyState, LoadingState } from '@vault/module-ui';

type Note = { title: string; body: string; tags: string[]; createdAt: string };

export function QuickNoteTakerWithTags({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [notes, setNotes] = useState<StoreDoc<Note>[] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    store.list<Note>('notes').then((docs) => setNotes(docs.sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt))));
  }, [store]);

  const allTags = useMemo(
    () => Array.from(new Set((notes ?? []).flatMap((n) => n.data.tags))).sort(),
    [notes],
  );
  const visibleNotes = activeTag ? (notes ?? []).filter((n) => n.data.tags.includes(activeTag)) : notes ?? [];

  async function addNote() {
    if (!title.trim() && !body.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const note: Note = { title: title.trim() || 'Untitled', body: body.trim(), tags, createdAt: new Date().toISOString() };
    const doc = await store.create('notes', note);
    setNotes((prev) => [doc, ...(prev ?? [])]);
    setTitle('');
    setBody('');
    setTagsInput('');
  }

  async function removeNote(docId: string) {
    await store.remove('notes', docId);
    setNotes((prev) => (prev ?? []).filter((n) => n.docId !== docId));
    if (visibleNotes.length === 1) setActiveTag(null);
  }

  function exportMarkdown() {
    const md = (notes ?? [])
      .map((n) => `## ${n.data.title}\n${n.data.tags.map((t) => `#${t}`).join(' ')}\n\n${n.data.body}\n`)
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (notes === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="quick-note-taker-root">
      <Section title="New Note">
        <div style={{ marginBottom: 10 }}>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" data-testid="note-title-input" style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <Label>Note</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Jot it down…" data-testid="note-body-input" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Tags (comma separated)</Label>
          <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="work, idea" data-testid="note-tags-input" style={{ width: '100%' }} />
        </div>
        <Button variant="primary" onClick={addNote} data-testid="add-note-button">
          Save Note
        </Button>
      </Section>

      <Divider />

      <Section title="Notes">
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeTag === null} onClick={() => setActiveTag(null)}>
              All
            </Tag>
            {allTags.map((t) => (
              <Tag key={t} active={activeTag === t} onClick={() => setActiveTag(t)}>
                #{t}
              </Tag>
            ))}
          </div>
        )}

        {visibleNotes.length === 0 ? (
          <EmptyState icon="🗒️">No notes yet — jot one down above.</EmptyState>
        ) : (
          <div data-testid="notes-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {visibleNotes.map((n) => (
              <div key={n.docId} data-testid="note-item">
                <ListRow onRemove={() => removeNote(n.docId)}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{n.data.title}</div>
                  {n.data.body && <div style={{ marginBottom: n.data.tags.length ? 6 : 0 }}>{n.data.body}</div>}
                  {n.data.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {n.data.tags.map((t) => (
                        <Tag key={t}>#{t}</Tag>
                      ))}
                    </div>
                  )}
                </ListRow>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportMarkdown}>
          Export Notes as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
