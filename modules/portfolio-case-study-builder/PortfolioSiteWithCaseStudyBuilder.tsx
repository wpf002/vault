import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Portfolio Site with Case Study Builder — the structured editor that
// turns rough notes into Problem/Approach/Outcome case studies is the
// substance; the "site" is the rendered preview + HTML export a portfolio
// page would embed. Public hosting is platform-level work.

type Study = { title: string; client: string; problem: string; approach: string; outcome: string; published: boolean };

const STRUCTURE: { key: 'problem' | 'approach' | 'outcome'; label: string; hint: string }[] = [
  { key: 'problem', label: 'The Problem', hint: 'What was broken or missing before you showed up?' },
  { key: 'approach', label: 'The Approach', hint: 'What did you actually do, in what order, and why?' },
  { key: 'outcome', label: 'The Outcome', hint: 'What changed? Numbers beat adjectives.' },
];

export function PortfolioSiteWithCaseStudyBuilder({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [studies, setStudies] = useState<StoreDoc<Study>[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Study>({ title: '', client: '', problem: '', approach: '', outcome: '', published: false });

  useEffect(() => {
    store.list<Study>('studies').then((docs) => {
      setStudies(docs);
      if (docs[0]) setOpenId(docs[0].docId);
    });
  }, [store]);

  const open = openId ? (studies ?? []).find((s) => s.docId === openId) ?? null : null;

  function startNew() {
    setEditing(true);
    setOpenId(null);
    setDraft({ title: '', client: '', problem: '', approach: '', outcome: '', published: false });
  }

  function startEdit(doc: StoreDoc<Study>) {
    setEditing(true);
    setOpenId(doc.docId);
    setDraft({ ...doc.data });
  }

  async function save() {
    if (!draft.title.trim()) return;
    if (openId) {
      const updated = await store.update('studies', openId, draft);
      setStudies((prev) => (prev ?? []).map((s) => (s.docId === openId ? updated : s)));
    } else {
      const doc = await store.create('studies', draft);
      setStudies((prev) => [...(prev ?? []), doc]);
      setOpenId(doc.docId);
    }
    setEditing(false);
  }

  async function togglePublished(doc: StoreDoc<Study>) {
    const updated = await store.update('studies', doc.docId, { ...doc.data, published: !doc.data.published });
    setStudies((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function remove(docId: string) {
    await store.remove('studies', docId);
    setStudies((prev) => (prev ?? []).filter((s) => s.docId !== docId));
    if (openId === docId) setOpenId(null);
  }

  function exportHtml() {
    const published = (studies ?? []).filter((s) => s.data.published);
    const html = published
      .map(
        (s) =>
          `<article>\n  <h2>${s.data.title}</h2>\n  <p class="client">${s.data.client}</p>\n  <h3>The Problem</h3><p>${s.data.problem}</p>\n  <h3>The Approach</h3><p>${s.data.approach}</p>\n  <h3>The Outcome</h3><p>${s.data.outcome}</p>\n</article>`,
      )
      .join('\n\n');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'case-studies.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (studies === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="portfolio-case-study-builder-root">
      <Section title="Case Studies">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {studies.map((s) => (
            <span key={s.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <Tag active={openId === s.docId && !editing} onClick={() => { setOpenId(s.docId); setEditing(false); }}>
                {s.data.published ? '🌐' : '📝'} {s.data.title}
              </Tag>
              <IconButton label="Remove" onClick={() => remove(s.docId)}>
                ✕
              </IconButton>
            </span>
          ))}
          <Button variant="ghost" onClick={startNew} data-testid="new-study-button">
            + New Case Study
          </Button>
        </div>
        {studies.length === 0 && !editing && <EmptyState icon="🖼️">No case studies yet — turn your best project into one.</EmptyState>}
      </Section>

      {editing && (
        <>
          <Divider />
          <Section title={openId ? 'Edit Case Study' : 'New Case Study'}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <Label>Title</Label>
                <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} data-testid="study-title-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <Label>Client</Label>
                <Input value={draft.client} onChange={(e) => setDraft((d) => ({ ...d, client: e.target.value }))} data-testid="study-client-input" style={{ width: '100%' }} />
              </div>
            </div>
            {STRUCTURE.map((sec) => (
              <div key={sec.key} style={{ marginBottom: 10 }}>
                <Label>{sec.label}</Label>
                <Textarea
                  value={draft[sec.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [sec.key]: e.target.value }))}
                  placeholder={sec.hint}
                  data-testid={`study-${sec.key}-input`}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={save} data-testid="save-study-button">
                💾 Save Case Study
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </Section>
        </>
      )}

      {!editing && open && (
        <>
          <Divider />
          <Section title="Preview">
            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 18, marginBottom: 14 }} data-testid="study-preview">
              <h3 style={{ margin: '0 0 2px', color: 'var(--color-text)' }}>{open.data.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--module-accent)', fontWeight: 700, margin: '0 0 14px' }}>{open.data.client}</p>
              {STRUCTURE.map((sec) => (
                <div key={sec.key} style={{ marginBottom: 12 }}>
                  <Label>{sec.label}</Label>
                  <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0 }}>{open.data[sec.key] || '—'}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => startEdit(open)} data-testid="edit-study-button">
                ✏️ Edit
              </Button>
              <Tag active={open.data.published} onClick={() => togglePublished(open)}>
                {open.data.published ? '🌐 Published' : 'Draft — Click to Publish'}
              </Tag>
            </div>
          </Section>
        </>
      )}

      <Divider />

      <Section title="Export">
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportHtml}>
          ⬇️ Export Published Studies as HTML
        </GatedAction>
      </Section>
    </div>
  );
}
