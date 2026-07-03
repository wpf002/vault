import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Immersive Local Culture & Travel Guide — destination guides built from
// themed chapters (history, food, customs, phrases) you read like a
// story, with reading progress and your own field notes per place.
// Scope note: "multimedia" audio/video needs blob storage the platform
// doesn't have — the immersion here is editorial: chaptered deep-dives
// you author or collect, not stock photo carousels.

type Chapter = { title: string; kind: 'history' | 'food' | 'customs' | 'phrases'; body: string; read: boolean };
type Guide = { destination: string; chapters: Chapter[] };
type Note = { destination: string; text: string };

const KIND_META: Record<Chapter['kind'], { icon: string; label: string }> = {
  history: { icon: '🏛️', label: 'History' },
  food: { icon: '🍲', label: 'Food' },
  customs: { icon: '🤝', label: 'Customs' },
  phrases: { icon: '🗣️', label: 'Phrases' },
};

export function ImmersiveLocalCultureTravelGuide({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [guides, setGuides] = useState<StoreDoc<Guide>[] | null>(null);
  const [notes, setNotes] = useState<StoreDoc<Note>[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [openChapter, setOpenChapter] = useState<number | null>(0);
  const [destination, setDestination] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cKind, setCKind] = useState<Chapter['kind']>('history');
  const [cBody, setCBody] = useState('');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    store.list<Guide>('guides').then((docs) => {
      setGuides(docs);
      if (docs[0]) setSelectedId(docs[0].docId);
    });
    store.list<Note>('notes').then(setNotes);
  }, [store]);

  const selected = (guides ?? []).find((g) => g.docId === selectedId) ?? null;
  const chapters = selected?.data.chapters ?? [];
  const readCount = chapters.filter((c) => c.read).length;
  const guideNotes = (notes ?? []).filter((n) => n.data.destination === selected?.data.destination);

  async function saveChapters(next: Chapter[]) {
    if (!selected) return;
    const updated = await store.update('guides', selected.docId, { ...selected.data, chapters: next });
    setGuides((prev) => (prev ?? []).map((g) => (g.docId === selected.docId ? updated : g)));
  }

  async function markRead(i: number) {
    await saveChapters(chapters.map((c, idx) => (idx === i ? { ...c, read: true } : c)));
  }

  async function addGuide() {
    if (!destination.trim()) return;
    const doc = await store.create('guides', { destination: destination.trim(), chapters: [] });
    setGuides((prev) => [...(prev ?? []), doc]);
    setSelectedId(doc.docId);
    setDestination('');
  }

  async function removeGuide(docId: string) {
    await store.remove('guides', docId);
    setGuides((prev) => {
      const next = (prev ?? []).filter((g) => g.docId !== docId);
      if (selectedId === docId) setSelectedId(next[0]?.docId ?? '');
      return next;
    });
  }

  async function addChapter() {
    if (!selected || !cTitle.trim() || !cBody.trim()) return;
    await saveChapters([...chapters, { title: cTitle.trim(), kind: cKind, body: cBody.trim(), read: false }]);
    setCTitle('');
    setCBody('');
  }

  async function removeChapter(i: number) {
    await saveChapters(chapters.filter((_, idx) => idx !== i));
    if (openChapter === i) setOpenChapter(null);
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return;
    const doc = await store.create('notes', { destination: selected.data.destination, text: noteText.trim() });
    setNotes((prev) => [...(prev ?? []), doc]);
    setNoteText('');
  }

  async function removeNote(docId: string) {
    await store.remove('notes', docId);
    setNotes((prev) => (prev ?? []).filter((n) => n.docId !== docId));
  }

  function exportGuide() {
    if (!selected) return;
    const lines = chapters.map((c) => `## ${KIND_META[c.kind].icon} ${c.title}\n\n${c.body}`);
    const noteLines = guideNotes.map((n) => `- ${n.data.text}`);
    const md = [`# ${selected.data.destination}`, '', ...lines, '', '## Field Notes', ...(noteLines.length ? noteLines : ['_None yet._'])].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.data.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-guide.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (guides === null || notes === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="local-culture-travel-guide-root">
      <Section title="Destinations">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          {guides.length > 0 && (
            <div style={{ width: 220 }}>
              <Label>Guide</Label>
              <Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setOpenChapter(0); }} data-testid="guide-select" style={{ width: '100%' }}>
                {guides.map((g) => (
                  <option key={g.docId} value={g.docId}>
                    {g.data.destination}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>New Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Kyoto, Japan" data-testid="destination-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addGuide} data-testid="add-guide-button">
            + Start Guide
          </Button>
          {selected && (
            <Button variant="ghost" onClick={() => removeGuide(selected.docId)} data-testid="delete-guide-button">
              🗑️
            </Button>
          )}
        </div>
        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <StatDisplay value={<span data-testid="read-progress">{`${readCount} / ${chapters.length}`}</span>} label="Chapters read" />
            <StatDisplay value={guideNotes.length} label="Field notes" />
            <StatDisplay value={guides.length} label="Destinations" />
          </div>
        )}
      </Section>

      {selected && (
        <>
          <Divider />
          <Section title={`Reading: ${selected.data.destination}`}>
            {chapters.length === 0 ? (
              <EmptyState icon="🏛️">No chapters yet — write the first below.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="chapters-list">
                {chapters.map((c, i) => (
                  <div key={i} className="module-list-row" data-testid="chapter-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ minWidth: 24 }}>{KIND_META[c.kind].icon}</span>
                      <div className="module-list-row-content" style={{ flex: 1 }}>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.title}</span>
                      </div>
                      <Tag active={c.read}>{c.read ? '✓ Read' : KIND_META[c.kind].label}</Tag>
                      <Button variant="secondary" onClick={() => setOpenChapter(openChapter === i ? null : i)} data-testid={`open-chapter-${i}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                        {openChapter === i ? 'Close' : 'Read'}
                      </Button>
                      <IconButton label="Remove" onClick={() => removeChapter(i)}>
                        ✕
                      </IconButton>
                    </div>
                    {openChapter === i && (
                      <div style={{ padding: '4px 8px 4px 32px', display: 'flex', flexDirection: 'column', gap: 10 }} data-testid={`chapter-body-${i}`}>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', margin: 0 }}>{c.body}</p>
                        {!c.read && (
                          <Button variant="primary" onClick={() => markRead(i)} data-testid={`mark-read-${i}`} style={{ alignSelf: 'flex-start' }}>
                            ✓ Mark Read
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Label>Chapter Title</Label>
                  <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="e.g. The Tea Ceremony Decoded" data-testid="chapter-title-input" style={{ width: '100%' }} />
                </div>
                <div style={{ width: 130 }}>
                  <Label>Theme</Label>
                  <Select value={cKind} onChange={(e) => setCKind(e.target.value as Chapter['kind'])} data-testid="chapter-kind-select" style={{ width: '100%' }}>
                    {Object.entries(KIND_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="primary" onClick={addChapter} data-testid="add-chapter-button">
                  + Add Chapter
                </Button>
              </div>
              <Textarea value={cBody} onChange={(e) => setCBody(e.target.value)} placeholder="The story — what a local would actually tell you." data-testid="chapter-body-input" rows={3} style={{ width: '100%' }} />
            </div>
          </Section>

          <Divider />

          <Section title="Field Notes">
            {guideNotes.length === 0 ? (
              <EmptyState icon="📝">No notes for this destination yet.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }} data-testid="notes-list">
                {guideNotes.map((n) => (
                  <div key={n.docId} className="module-list-row" data-testid="note-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1, fontSize: 13 }}>
                      {n.data.text}
                    </div>
                    <IconButton label="Remove" onClick={() => removeNote(n.docId)}>
                      ✕
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <Label>Note</Label>
                <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="A tip worth remembering…" data-testid="note-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={addNote} data-testid="add-note-button">
                + Save Note
              </Button>
            </div>

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportGuide}>
              ⬇️ Export Guide as Markdown
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
