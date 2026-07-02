import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Internal Knowledge Base / Team Wiki — Searchable wiki for small teams.
// Scope note: "rich text editor and permissions" trimmed to plain-text
// articles owned by the signed-in user — per-teammate permissions need
// cross-account infra the platform doesn't have yet, and a rich-text
// editor is a dependency this module doesn't need to prove its value.
// Search is the substance here: live filter across title + body + category.

type Article = { title: string; body: string; category: string; updatedAt: string };

export function InternalKnowledgeBaseTeamWiki({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [articles, setArticles] = useState<StoreDoc<Article>[] | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    store.list<Article>('articles').then((docs) => setArticles(docs.sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt))));
  }, [store]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles ?? [];
    return (articles ?? []).filter(
      (a) => a.data.title.toLowerCase().includes(q) || a.data.body.toLowerCase().includes(q) || a.data.category.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const open = openId ? (articles ?? []).find((a) => a.docId === openId) ?? null : null;

  function startNew() {
    setOpenId(null);
    setEditing(true);
    setTitle('');
    setBody('');
    setCategory('');
  }

  function startEdit(doc: StoreDoc<Article>) {
    setOpenId(doc.docId);
    setEditing(true);
    setTitle(doc.data.title);
    setBody(doc.data.body);
    setCategory(doc.data.category);
  }

  async function save() {
    if (!title.trim()) return;
    const data: Article = { title: title.trim(), body, category: category.trim() || 'General', updatedAt: new Date().toISOString() };
    if (openId) {
      const updated = await store.update('articles', openId, data);
      setArticles((prev) => (prev ?? []).map((a) => (a.docId === openId ? updated : a)));
    } else {
      const doc = await store.create('articles', data);
      setArticles((prev) => [doc, ...(prev ?? [])]);
      setOpenId(doc.docId);
    }
    setEditing(false);
  }

  async function remove(docId: string) {
    await store.remove('articles', docId);
    setArticles((prev) => (prev ?? []).filter((a) => a.docId !== docId));
    if (openId === docId) setOpenId(null);
  }

  function exportWiki() {
    const md = (articles ?? []).map((a) => `# ${a.data.title}\n_${a.data.category}_\n\n${a.data.body}\n`).join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-wiki.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (articles === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="internal-knowledge-base-root">
      <Section title="Search the Wiki">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, content, categories…" data-testid="search-input" style={{ flex: 1 }} />
          <Button variant="primary" onClick={startNew} data-testid="new-article-button">
            + New Article
          </Button>
        </div>
      </Section>

      {editing && (
        <>
          <Divider />
          <Section title={openId ? 'Edit Article' : 'New Article'}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="article-title-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" data-testid="article-category-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Content</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 140 }} data-testid="article-body-input" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={save} data-testid="save-article-button">
                💾 Save Article
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
          <Section title={open.data.title}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <Tag>{open.data.category}</Tag>
              <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Updated {open.data.updatedAt.slice(0, 10)}</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-dim)', marginBottom: 14 }} data-testid="article-body">
              {open.data.body}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={() => startEdit(open)} data-testid="edit-article-button">
                ✏️ Edit
              </Button>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
            </div>
          </Section>
        </>
      )}

      <Divider />

      <Section title={`Articles (${visible.length})`}>
        {visible.length === 0 ? (
          <EmptyState icon="📚">{query ? 'No articles match your search.' : 'No articles yet — write the first one.'}</EmptyState>
        ) : (
          <div data-testid="articles-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((a) => (
              <div key={a.docId} className="module-list-row" data-testid="article-item">
                <button
                  onClick={() => {
                    setOpenId(a.docId);
                    setEditing(false);
                  }}
                  style={{ all: 'unset', cursor: 'pointer', flex: 1 }}
                  data-testid={`open-${a.docId}`}
                >
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{a.data.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                    {a.data.category} · {a.data.updatedAt.slice(0, 10)}
                  </div>
                </button>
                <IconButton label="Remove" onClick={() => remove(a.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportWiki}>
          ⬇️ Export Wiki as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
