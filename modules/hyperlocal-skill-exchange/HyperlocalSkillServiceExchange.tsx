import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Hyperlocal Skill & Service Exchange — neighbors post needs and offer
// skills informally, trades happen in person. Board-keeper side: one
// neighbor (you) keeps the board; matched posts pair an offer with a need.
// Cross-account neighbor logins are platform-level work.

type Post = { kind: 'offer' | 'need'; person: string; skill: string; trade: string; matched: boolean };

export function HyperlocalSkillServiceExchange({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [posts, setPosts] = useState<StoreDoc<Post>[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'offer' | 'need'>('all');
  const [kind, setKind] = useState<'offer' | 'need'>('offer');
  const [person, setPerson] = useState('');
  const [skill, setSkill] = useState('');
  const [trade, setTrade] = useState('');

  useEffect(() => {
    store.list<Post>('posts').then(setPosts);
  }, [store]);

  const visible = (posts ?? [])
    .filter((p) => filter === 'all' || p.data.kind === filter)
    .sort((a, b) => Number(a.data.matched) - Number(b.data.matched));
  const openCount = (posts ?? []).filter((p) => !p.data.matched).length;

  async function addPost() {
    if (!person.trim() || !skill.trim()) return;
    const p: Post = { kind, person: person.trim(), skill: skill.trim(), trade: trade.trim(), matched: false };
    const doc = await store.create('posts', p);
    setPosts((prev) => [doc, ...(prev ?? [])]);
    setSkill('');
    setTrade('');
  }

  async function toggleMatched(doc: StoreDoc<Post>) {
    const updated = await store.update('posts', doc.docId, { ...doc.data, matched: !doc.data.matched });
    setPosts((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('posts', docId);
    setPosts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportBoard() {
    const rows = (posts ?? []).map((p) => `${p.data.kind},"${p.data.person}","${p.data.skill}","${p.data.trade}",${p.data.matched ? 'matched' : 'open'}`);
    const csv = ['type,person,skill,trade,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skill-exchange-board.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (posts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="hyperlocal-skill-exchange-root">
      <Section title="Neighborhood Board">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={openCount} label="Open offers and needs on the board" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'all', label: '🤝 All' },
              { value: 'offer', label: '🙋 Offers' },
              { value: 'need', label: '🙏 Needs' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="🤝">Nothing on the board — post the first offer or need below.</EmptyState>
        ) : (
          <div data-testid="posts-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="post-item" style={{ alignItems: 'center', opacity: p.data.matched ? 0.55 : 1 }}>
                <span style={{ fontSize: 18 }}>{p.data.kind === 'offer' ? '🙋' : '🙏'}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.skill}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{p.data.kind === 'offer' ? 'Offering' : 'Looking For'}</Tag>
                    <span>{p.data.person}</span>
                    {p.data.trade && <span>↔️ {p.data.trade}</span>}
                  </div>
                </div>
                <Button variant={p.data.matched ? 'primary' : 'secondary'} onClick={() => toggleMatched(p)} data-testid={`match-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  {p.data.matched ? '✓ Matched' : 'Mark Matched'}
                </Button>
                <IconButton label="Remove" onClick={() => remove(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          Export Board as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Post to the Board">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <SegmentedControl
            options={[
              { value: 'offer', label: '🙋 I Can Offer' },
              { value: 'need', label: '🙏 I Need' },
            ]}
            value={kind}
            onChange={setKind}
          />
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Who</Label>
            <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name (street)" data-testid="post-person-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>{kind === 'offer' ? 'Skill / Service Offered' : 'What You Need'}</Label>
            <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={kind === 'offer' ? 'e.g. Bike repair basics' : 'e.g. Help moving a couch'} data-testid="post-skill-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Trade / Thanks</Label>
            <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="What's the swap?" data-testid="post-trade-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addPost} data-testid="add-post-button">
            + Post
          </Button>
        </div>
      </Section>
    </div>
  );
}
