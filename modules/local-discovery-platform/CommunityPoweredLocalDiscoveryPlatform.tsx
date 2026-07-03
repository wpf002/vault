import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, SegmentedControl, EmptyState, LoadingState } from '@vault/module-ui';

// Community-Powered Local Discovery Platform — a shared map-less guide
// to hidden gems, small businesses, and local events, ranked by upvotes,
// each with the one insider tip that makes it worth knowing. Track what
// you've actually visited and export the whole thing as a city guide.
// Scope note: a public multi-user feed is cross-account infra — this is
// your circle's guide, curated by whoever holds the keyboard.

type Gem = { name: string; kind: 'gem' | 'business' | 'event'; neighborhood: string; tip: string; sharedBy: string; upvotes: number; visited: boolean };

const KIND_META: Record<Gem['kind'], { icon: string; label: string }> = {
  gem: { icon: '💎', label: 'Hidden Gem' },
  business: { icon: '🏪', label: 'Small Business' },
  event: { icon: '🎪', label: 'Local Event' },
};

export function CommunityPoweredLocalDiscoveryPlatform({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [gems, setGems] = useState<StoreDoc<Gem>[] | null>(null);
  const [view, setView] = useState('All');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Gem['kind']>('gem');
  const [neighborhood, setNeighborhood] = useState('');
  const [tip, setTip] = useState('');
  const [sharedBy, setSharedBy] = useState('');

  useEffect(() => {
    store.list<Gem>('gems').then(setGems);
  }, [store]);

  const list = gems ?? [];
  const shown = useMemo(
    () =>
      list
        .filter((g) => view === 'All' || (view === 'Gems' ? g.data.kind === 'gem' : view === 'Businesses' ? g.data.kind === 'business' : g.data.kind === 'event'))
        .sort((a, b) => b.data.upvotes - a.data.upvotes),
    [list, view],
  );
  const visitedCount = list.filter((g) => g.data.visited).length;
  const topNeighborhood = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of list) counts.set(g.data.neighborhood, (counts.get(g.data.neighborhood) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [list]);

  async function upvote(doc: StoreDoc<Gem>) {
    const updated = await store.update('gems', doc.docId, { ...doc.data, upvotes: doc.data.upvotes + 1 });
    setGems((prev) => (prev ?? []).map((g) => (g.docId === doc.docId ? updated : g)));
  }

  async function toggleVisited(doc: StoreDoc<Gem>) {
    const updated = await store.update('gems', doc.docId, { ...doc.data, visited: !doc.data.visited });
    setGems((prev) => (prev ?? []).map((g) => (g.docId === doc.docId ? updated : g)));
  }

  async function addGem() {
    if (!name.trim() || !tip.trim()) return;
    const g: Gem = { name: name.trim(), kind, neighborhood: neighborhood.trim() || 'Around town', tip: tip.trim(), sharedBy: sharedBy.trim() || 'You', upvotes: 1, visited: false };
    const doc = await store.create('gems', g);
    setGems((prev) => [...(prev ?? []), doc]);
    setName('');
    setNeighborhood('');
    setTip('');
    setSharedBy('');
  }

  async function removeGem(docId: string) {
    await store.remove('gems', docId);
    setGems((prev) => (prev ?? []).filter((g) => g.docId !== docId));
  }

  function exportGuide() {
    const byVotes = [...list].sort((a, b) => b.data.upvotes - a.data.upvotes);
    const lines = byVotes.map((g) => `## ${KIND_META[g.data.kind].icon} ${g.data.name}\n_${g.data.neighborhood} · ▲${g.data.upvotes} · shared by ${g.data.sharedBy}${g.data.visited ? ' · ✓ visited' : ''}_\n\n> ${g.data.tip}`);
    const md = ['# Our City Guide', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'city-guide.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (gems === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="local-discovery-platform-root">
      <Section title="The Guide">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={list.length} label="Spots shared" />
          <StatDisplay value={<span data-testid="visited-count">{visitedCount}</span>} label="You've been to" />
          <StatDisplay value={topNeighborhood} label="Most-shared neighborhood" />
        </div>
        <SegmentedControl options={['All', 'Gems', 'Businesses', 'Events'].map((v) => ({ value: v, label: v }))} value={view} onChange={setView} data-testid="view-control" />
      </Section>

      <Divider />

      <Section title="Ranked by the Community">
        {shown.length === 0 ? (
          <EmptyState icon="🗺️">Nothing shared yet — drop the first pin below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="gems-list">
            {shown.map((g) => (
              <div key={g.docId} className="module-list-row" data-testid="gem-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 24 }}>{KIND_META[g.data.kind].icon}</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{g.data.name}</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                      {g.data.neighborhood} · shared by {g.data.sharedBy}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => upvote(g)} data-testid={`upvote-${g.docId}`} style={{ padding: '5px 10px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    ▲ {g.data.upvotes}
                  </Button>
                  <Tag active={g.data.visited} onClick={() => toggleVisited(g)}>
                    {g.data.visited ? '✓ Visited' : 'Want to Go'}
                  </Tag>
                  <IconButton label="Remove" onClick={() => removeGem(g.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ padding: '8px 12px', marginLeft: 32, borderRadius: 8, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)' }}>
                  💡 {g.data.tip}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Label>Spot</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rooftop Reading Nook" data-testid="name-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 150 }}>
              <Label>Type</Label>
              <Select value={kind} onChange={(e) => setKind(e.target.value as Gem['kind'])} data-testid="kind-select" style={{ width: '100%' }}>
                {Object.entries(KIND_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ width: 150 }}>
              <Label>Neighborhood</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g. Riverside" data-testid="neighborhood-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 120 }}>
              <Label>Shared By</Label>
              <Input value={sharedBy} onChange={(e) => setSharedBy(e.target.value)} placeholder="You" data-testid="shared-by-input" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Label>The Insider Tip</Label>
              <Input value={tip} onChange={(e) => setTip(e.target.value)} placeholder="What do locals know that visitors don't?" data-testid="tip-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addGem} data-testid="add-gem-button">
              📍 Share It
            </Button>
          </div>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportGuide}>
          ⬇️ Export City Guide as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
