import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Community Membership Portal — gated content with tiers. Creator side:
// assign each post a tier (free/member/premium), then use the "Preview As"
// switcher to see exactly what each tier unlocks — locked posts show
// title-only with a lock, the way a member below that tier would see them.
// Real member logins/forums are cross-account platform work.

const TIERS = ['free', 'member', 'premium'] as const;
type Tier = (typeof TIERS)[number];
const TIER_RANK: Record<Tier, number> = { free: 0, member: 1, premium: 2 };
const TIER_LABEL: Record<Tier, string> = { free: 'Free', member: 'Member', premium: 'Premium' };

type Post = { title: string; tier: Tier; body: string; pinned: boolean };

export function CommunityMembershipPortal({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [posts, setPosts] = useState<StoreDoc<Post>[] | null>(null);
  const [viewAs, setViewAs] = useState<Tier>('premium');
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<Tier>('free');
  const [body, setBody] = useState('');

  useEffect(() => {
    store.list<Post>('posts').then((docs) => setPosts(docs.sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned))));
  }, [store]);

  const canSee = (postTier: Tier) => TIER_RANK[viewAs] >= TIER_RANK[postTier];

  async function addPost() {
    if (!title.trim()) return;
    const p: Post = { title: title.trim(), tier, body: body.trim(), pinned: false };
    const doc = await store.create('posts', p);
    setPosts((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setBody('');
  }

  async function togglePinned(doc: StoreDoc<Post>) {
    const updated = await store.update('posts', doc.docId, { ...doc.data, pinned: !doc.data.pinned });
    setPosts((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)).sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned)));
  }

  async function remove(docId: string) {
    await store.remove('posts', docId);
    setPosts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportContent() {
    const md = (posts ?? []).map((p) => `## ${p.data.pinned ? '📌 ' : ''}${p.data.title}\n_Tier: ${TIER_LABEL[p.data.tier]}_\n\n${p.data.body}\n`).join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portal-content.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (posts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="community-membership-portal-root">
      <Section title="Portal Content">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Label>Preview As</Label>
          <SegmentedControl
            options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))}
            value={viewAs}
            onChange={setViewAs}
          />
        </div>

        {posts.length === 0 ? (
          <EmptyState icon="🔐">No posts yet — publish the first one below.</EmptyState>
        ) : (
          <div data-testid="posts-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {posts.map((p) => {
              const visible = canSee(p.data.tier);
              return (
                <div
                  key={p.docId}
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                    opacity: visible ? 1 : 0.55,
                  }}
                  data-testid={visible ? 'post-visible' : 'post-locked'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--color-text)', flex: 1 }}>
                      {p.data.pinned && '📌 '}
                      {!visible && '🔒 '}
                      {p.data.title}
                    </strong>
                    <Tag active={p.data.tier !== 'free'}>{TIER_LABEL[p.data.tier]}</Tag>
                    <Button variant="ghost" onClick={() => togglePinned(p)} data-testid={`pin-${p.docId}`} style={{ padding: '4px 8px', fontSize: 12 }}>
                      {p.data.pinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <IconButton label="Remove" onClick={() => remove(p.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  {visible ? (
                    <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '8px 0 0' }}>{p.data.body}</p>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '8px 0 0', fontStyle: 'italic' }}>
                      Upgrade to {TIER_LABEL[p.data.tier]} to unlock this post.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportContent}>
          Export All Content as Markdown
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Publish a Post">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" data-testid="post-title-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Tier</Label>
            <SegmentedControl options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))} value={tier} onChange={setTier} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's in this post?" data-testid="post-body-input" />
        </div>
        <Button variant="primary" onClick={addPost} data-testid="add-post-button">
          Publish
        </Button>
      </Section>
    </div>
  );
}
