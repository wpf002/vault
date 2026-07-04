import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, SegmentedControl, EmptyState, LoadingState } from '@vault/module-ui';

// Neighborhood Services Exchange — a needs/offers board: match an open
// need with an open offer (both flip to matched), keep a message thread
// per post, and mark exchanges done. Scope note: real multi-resident
// messaging is cross-account infra — this is the block-captain's board:
// you log posts and relay messages.

type Post = { kind: 'need' | 'offer'; title: string; neighbor: string; category: string; status: 'open' | 'matched' | 'done'; matchedWith: string };
type Message = { post: string; from: string; text: string };

const CATEGORIES = ['Home', 'Garden', 'Transport', 'Lessons', 'Errands', 'Tools'];

export function NeighborhoodServicesExchange({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [posts, setPosts] = useState<StoreDoc<Post>[] | null>(null);
  const [messages, setMessages] = useState<StoreDoc<Message>[] | null>(null);
  const [view, setView] = useState('All');
  const [kind, setKind] = useState<Post['kind']>('need');
  const [title, setTitle] = useState('');
  const [neighbor, setNeighbor] = useState('');
  const [category, setCategory] = useState('Home');
  const [threadFor, setThreadFor] = useState<string | null>(null);
  const [msgFrom, setMsgFrom] = useState('You');
  const [msgText, setMsgText] = useState('');
  const [matching, setMatching] = useState<StoreDoc<Post> | null>(null);

  useEffect(() => {
    store.list<Post>('posts').then(setPosts);
    store.list<Message>('messages').then(setMessages);
  }, [store]);

  const list = posts ?? [];
  const shown = list.filter((p) => view === 'All' || (view === 'Needs' ? p.data.kind === 'need' : view === 'Offers' ? p.data.kind === 'offer' : p.data.status === 'matched'));
  const openNeeds = list.filter((p) => p.data.kind === 'need' && p.data.status === 'open').length;
  const openOffers = list.filter((p) => p.data.kind === 'offer' && p.data.status === 'open').length;
  const matchedCount = list.filter((p) => p.data.status === 'matched').length;
  const matchCandidates = matching ? list.filter((p) => p.data.kind !== matching.data.kind && p.data.status === 'open') : [];
  const threadMessages = (messages ?? []).filter((m) => m.data.post === threadFor);

  async function addPost() {
    if (!title.trim()) return;
    const p: Post = { kind, title: title.trim(), neighbor: neighbor.trim() || 'You', category, status: 'open', matchedWith: '' };
    const doc = await store.create('posts', p);
    setPosts((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setNeighbor('');
  }

  async function confirmMatch(other: StoreDoc<Post>) {
    if (!matching) return;
    const nextA: Post = { ...matching.data, status: 'matched', matchedWith: `${other.data.neighbor} — ${other.data.title}` };
    const nextB: Post = { ...other.data, status: 'matched', matchedWith: `${matching.data.neighbor} — ${matching.data.title}` };
    const a = await store.update('posts', matching.docId, nextA);
    const b = await store.update('posts', other.docId, nextB);
    setPosts((prev) => (prev ?? []).map((p) => (p.docId === a.docId ? a : p.docId === b.docId ? b : p)));
    setMatching(null);
  }

  async function markDone(doc: StoreDoc<Post>) {
    const next: Post = { ...doc.data, status: 'done' };
    const updated = await store.update('posts', doc.docId, next);
    setPosts((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function removePost(docId: string) {
    await store.remove('posts', docId);
    setPosts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  async function sendMessage() {
    if (!msgText.trim() || !threadFor) return;
    const doc = await store.create('messages', { post: threadFor, from: msgFrom.trim() || 'You', text: msgText.trim() });
    setMessages((prev) => [...(prev ?? []), doc]);
    setMsgText('');
  }

  function exportBoard() {
    const rows = list.map((p) => `${p.data.kind},"${p.data.title}","${p.data.neighbor}",${p.data.category},${p.data.status},"${p.data.matchedWith}"`);
    const csv = ['type,post,neighbor,category,status,matched with', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exchange-board.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (posts === null || messages === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="neighborhood-services-exchange-root">
      <Section title="The Board">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="open-needs">{openNeeds}</span>} label="Open needs" />
          <StatDisplay value={openOffers} label="Skills offered" />
          <StatDisplay value={<span data-testid="matched-count">{matchedCount}</span>} label="Matched exchanges" />
        </div>
        <SegmentedControl options={['All', 'Needs', 'Offers', 'Matched'].map((v) => ({ value: v, label: v }))} value={view} onChange={setView} data-testid="view-control" />
      </Section>

      <Divider />

      <Section title="Posts">
        {shown.length === 0 ? (
          <EmptyState icon="🏘️">Nothing here — post a need or an offer below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="posts-list">
            {shown.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="post-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 24 }}>{p.data.kind === 'need' ? '🙏' : '💪'}</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: p.data.status === 'done' ? 'line-through' : 'none' }}>{p.data.title}</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                      {p.data.neighbor} · {p.data.category}
                      {p.data.matchedWith ? ` · 🤝 ${p.data.matchedWith}` : ''}
                    </div>
                  </div>
                  <Tag active={p.data.status === 'matched'}>{p.data.status === 'open' ? 'Open' : p.data.status === 'matched' ? '🤝 Matched' : '✓ Done'}</Tag>
                  {p.data.status === 'open' && (
                    <Button variant="secondary" onClick={() => setMatching(matching?.docId === p.docId ? null : p)} data-testid={`match-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Match
                    </Button>
                  )}
                  {p.data.status === 'matched' && (
                    <Button variant="secondary" onClick={() => markDone(p)} data-testid={`done-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      ✓ Done
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setThreadFor(threadFor === p.data.title ? null : p.data.title)} data-testid={`thread-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    💬 {(messages ?? []).filter((m) => m.data.post === p.data.title).length}
                  </Button>
                  <IconButton label="Remove" onClick={() => removePost(p.docId)}>
                    ✕
                  </IconButton>
                </div>

                {matching?.docId === p.docId && (
                  <div style={{ padding: '4px 8px 4px 32px', display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="match-picker">
                    <Label>Match With an Open {p.data.kind === 'need' ? 'Offer' : 'Need'}</Label>
                    {matchCandidates.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>No open {p.data.kind === 'need' ? 'offers' : 'needs'} to match with.</span>
                    ) : (
                      matchCandidates.map((c) => (
                        <Button key={c.docId} variant="ghost" onClick={() => confirmMatch(c)} data-testid={`candidate-${c.docId}`} style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                          {c.data.kind === 'need' ? '🙏' : '💪'} {c.data.title} — {c.data.neighbor}
                        </Button>
                      ))
                    )}
                  </div>
                )}

                {threadFor === p.data.title && (
                  <div style={{ padding: '4px 8px 4px 32px', display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="thread-panel">
                    {threadMessages.map((m) => (
                      <div key={m.docId} style={{ fontSize: 13 }}>
                        <span style={{ color: 'var(--module-accent)', fontWeight: 700 }}>{m.data.from}:</span>{' '}
                        <span style={{ color: 'var(--color-text)' }}>{m.data.text}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Input value={msgFrom} onChange={(e) => setMsgFrom(e.target.value)} data-testid="msg-from-input" style={{ width: 110, fontSize: 12 }} />
                      <Input value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Relay a message…" data-testid="msg-text-input" style={{ flex: 1, minWidth: 140, fontSize: 12 }} />
                      <Button variant="secondary" onClick={sendMessage} data-testid="send-msg-button" style={{ padding: '5px 10px', fontSize: 12 }}>
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 130 }}>
            <Label>Type</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as Post['kind'])} data-testid="kind-select" style={{ width: '100%' }}>
              <option value="need">🙏 Need</option>
              <option value="offer">💪 Offer</option>
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Post</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Help moving a couch Saturday" data-testid="title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Neighbor</Label>
            <Input value={neighbor} onChange={(e) => setNeighbor(e.target.value)} placeholder="You" data-testid="neighbor-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-select" style={{ width: '100%' }}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={addPost} data-testid="add-post-button">
            Post
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          Export Board as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
