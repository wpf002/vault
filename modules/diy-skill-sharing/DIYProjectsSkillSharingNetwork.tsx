import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// DIY Projects & Skill-Sharing Network — community step-by-step guides.
// Curator side: publish guides with ordered steps, difficulty, category
// filter, and likes. Cross-account community accounts are platform work.

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type Guide = { title: string; category: string; difficulty: Difficulty; steps: string[]; likes: number };

export function DiyProjectsSkillSharingNetwork({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [guides, setGuides] = useState<StoreDoc<Guide>[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Difficulty>('all');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [stepsText, setStepsText] = useState('');

  useEffect(() => {
    store.list<Guide>('guides').then((docs) => setGuides(docs.sort((a, b) => b.data.likes - a.data.likes)));
  }, [store]);

  const visible = (guides ?? []).filter((g) => filter === 'all' || g.data.difficulty === filter);
  const open = openId ? (guides ?? []).find((g) => g.docId === openId) ?? null : null;

  async function addGuide() {
    if (!title.trim() || !stepsText.trim()) return;
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const g: Guide = { title: title.trim(), category: category.trim() || 'General', difficulty, steps, likes: 0 };
    const doc = await store.create('guides', g);
    setGuides((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setCategory('');
    setStepsText('');
  }

  async function like(doc: StoreDoc<Guide>) {
    const updated = await store.update('guides', doc.docId, { ...doc.data, likes: doc.data.likes + 1 });
    setGuides((prev) => (prev ?? []).map((g) => (g.docId === doc.docId ? updated : g)).sort((a, b) => b.data.likes - a.data.likes));
  }

  async function remove(docId: string) {
    await store.remove('guides', docId);
    setGuides((prev) => (prev ?? []).filter((g) => g.docId !== docId));
    if (openId === docId) setOpenId(null);
  }

  function exportGuides() {
    const md = (guides ?? [])
      .map((g) => `# ${g.data.title}\n_${g.data.category} · ${g.data.difficulty}_\n\n${g.data.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`)
      .join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diy-guides.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (guides === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="diy-skill-sharing-root">
      <Section title="Guides">
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[{ value: 'all' as const, label: 'All' }, ...DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="🔨">No guides {filter !== 'all' ? 'at this level ' : ''}yet — share one below.</EmptyState>
        ) : (
          <div data-testid="guides-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((g) => (
              <div key={g.docId} className="module-list-row" data-testid="guide-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <button onClick={() => setOpenId(openId === g.docId ? null : g.docId)} style={{ all: 'unset', cursor: 'pointer' }} data-testid={`open-${g.docId}`}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{g.data.title}</span>
                  </button>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{g.data.category}</Tag>
                    <Tag active>{g.data.difficulty}</Tag>
                    <span>{g.data.steps.length} steps</span>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => like(g)} data-testid={`like-${g.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  👍 {g.data.likes}
                </Button>
                <IconButton label="Remove" onClick={() => remove(g.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16 }} data-testid="guide-detail">
            <strong style={{ color: 'var(--color-text)' }}>{open.data.title}</strong>
            <ol style={{ margin: '10px 0 0', paddingLeft: 20, color: 'var(--color-text-dim)', fontSize: 13, lineHeight: 1.8 }}>
              {open.data.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportGuides}>
          ⬇️ Export Guides as Markdown
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Share a Guide">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a cedar planter box" data-testid="guide-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Woodworking" data-testid="guide-category-input" style={{ width: '100%' }} />
          </div>
          <SegmentedControl options={DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))} value={difficulty} onChange={setDifficulty} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Steps (One Per Line)</Label>
          <Textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={'Cut the boards\nDrill the holes\nAssemble'} data-testid="guide-steps-input" style={{ minHeight: 100 }} />
        </div>
        <Button variant="primary" onClick={addGuide} data-testid="add-guide-button">
          Publish Guide
        </Button>
      </Section>
    </div>
  );
}
