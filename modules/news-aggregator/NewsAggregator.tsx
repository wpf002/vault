import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// News Aggregator — personalized reading feed with topic filters and
// save-for-later. Scope note: live RSS/API fetching is an outbound-network
// concern the module runtime doesn't proxy (preview must work offline);
// you clip articles in (title/source/link), the feed organizes them —
// read-state, topic filters, and the save-for-later queue are the
// substance.

type Article = { title: string; source: string; topic: string; url: string; saved: boolean; read: boolean };

export function NewsAggregator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [articles, setArticles] = useState<StoreDoc<Article>[] | null>(null);
  const [view, setView] = useState<'feed' | 'saved'>('feed');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [topic, setTopic] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    store.list<Article>('articles').then(setArticles);
  }, [store]);

  const topics = useMemo(() => Array.from(new Set((articles ?? []).map((a) => a.data.topic))).sort(), [articles]);
  const visible = (articles ?? [])
    .filter((a) => (view === 'saved' ? a.data.saved : true))
    .filter((a) => !activeTopic || a.data.topic === activeTopic)
    .sort((a, b) => Number(a.data.read) - Number(b.data.read));
  const unreadCount = (articles ?? []).filter((a) => !a.data.read).length;

  async function clip() {
    if (!title.trim()) return;
    const a: Article = { title: title.trim(), source: source.trim() || '—', topic: topic.trim().toLowerCase() || 'general', url: url.trim(), saved: false, read: false };
    const doc = await store.create('articles', a);
    setArticles((prev) => [doc, ...(prev ?? [])]);
    setTitle('');
    setUrl('');
  }

  async function toggle(doc: StoreDoc<Article>, field: 'saved' | 'read') {
    const updated = await store.update('articles', doc.docId, { ...doc.data, [field]: !doc.data[field] });
    setArticles((prev) => (prev ?? []).map((a) => (a.docId === doc.docId ? updated : a)));
  }

  async function remove(docId: string) {
    await store.remove('articles', docId);
    setArticles((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  function exportSaved() {
    const md = (articles ?? [])
      .filter((a) => a.data.saved)
      .map((a) => `- [${a.data.title}](${a.data.url}) — ${a.data.source} (#${a.data.topic})`)
      .join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url2 = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url2;
    a.download = 'reading-list.md';
    a.click();
    URL.revokeObjectURL(url2);
  }

  if (articles === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="news-aggregator-root">
      <Section title={`Your Feed (${unreadCount} unread)`}>
        <div style={{ marginBottom: 12 }}>
          <SegmentedControl
            options={[
              { value: 'feed', label: '🗞 Feed' },
              { value: 'saved', label: '🔖 Saved' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>

        {topics.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeTopic === null} onClick={() => setActiveTopic(null)}>
              All Topics
            </Tag>
            {topics.map((t) => (
              <Tag key={t} active={activeTopic === t} onClick={() => setActiveTopic(t)}>
                #{t}
              </Tag>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="🗞️">{view === 'saved' ? 'Nothing saved for later yet.' : 'Feed is empty — clip an article below.'}</EmptyState>
        ) : (
          <div data-testid="articles-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((a) => (
              <div key={a.docId} className="module-list-row" data-testid="article-item" style={{ alignItems: 'center', opacity: a.data.read ? 0.55 : 1 }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{a.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>{a.data.source}</span>
                    <Tag>#{a.data.topic}</Tag>
                    {a.data.url && (
                      <a href={`https://${a.data.url.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--module-accent)' }}>
                        open ↗
                      </a>
                    )}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => toggle(a, 'read')} data-testid={`read-${a.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  {a.data.read ? 'Unread' : '✓ Read'}
                </Button>
                <Tag active={a.data.saved} onClick={() => toggle(a, 'saved')}>
                  {a.data.saved ? '🔖 Saved' : 'Save'}
                </Tag>
                <IconButton label="Remove" onClick={() => remove(a.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSaved}>
          ⬇️ Export Saved Reading List
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Clip an Article">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" data-testid="clip-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Publication" data-testid="clip-source-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="tech" data-testid="clip-topic-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Link</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com/article" data-testid="clip-url-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={clip} data-testid="clip-button">
            + Clip
          </Button>
        </div>
      </Section>
    </div>
  );
}
