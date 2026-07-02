import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Sustainable Goods & Repair Marketplace — second-hand/upcycled goods and
// repair services in one board. Curator side: you run the board, listings
// carry a contact handle; buyers reach out directly. Cross-account buyer
// accounts/checkout are platform-level work. Money is integer cents.

type Listing = { title: string; kind: 'goods' | 'repair'; priceCents: number; condition: string; contact: string; status: 'available' | 'sold' };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function SustainableGoodsRepairMarketplace({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [listings, setListings] = useState<StoreDoc<Listing>[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'goods' | 'repair'>('all');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'goods' | 'repair'>('goods');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    store.list<Listing>('listings').then(setListings);
  }, [store]);

  const visible = (listings ?? [])
    .filter((l) => filter === 'all' || l.data.kind === filter)
    .sort((a, b) => Number(a.data.status === 'sold') - Number(b.data.status === 'sold'));
  const availableCount = (listings ?? []).filter((l) => l.data.status === 'available').length;

  async function addListing() {
    if (!title.trim()) return;
    const l: Listing = { title: title.trim(), kind, priceCents: Math.round((Number(price) || 0) * 100), condition: condition.trim() || '—', contact: contact.trim(), status: 'available' };
    const doc = await store.create('listings', l);
    setListings((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setPrice('');
    setCondition('');
    setContact('');
  }

  async function toggleSold(doc: StoreDoc<Listing>) {
    const next: Listing = { ...doc.data, status: doc.data.status === 'available' ? 'sold' : 'available' };
    const updated = await store.update('listings', doc.docId, next);
    setListings((prev) => (prev ?? []).map((l) => (l.docId === doc.docId ? updated : l)));
  }

  async function remove(docId: string) {
    await store.remove('listings', docId);
    setListings((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  function exportBoard() {
    const rows = (listings ?? []).map((l) => `"${l.data.title}",${l.data.kind},${(l.data.priceCents / 100).toFixed(2)},"${l.data.condition}","${l.data.contact}",${l.data.status}`);
    const csv = ['listing,type,price,condition,contact,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketplace-board.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (listings === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="sustainable-goods-repair-root">
      <Section title="Marketplace Board">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={availableCount} label="Listings currently available" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'all', label: '♻️ All' },
              { value: 'goods', label: '🛋 Goods' },
              { value: 'repair', label: '🔧 Repairs' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="♻️">Nothing listed yet — add the first item below.</EmptyState>
        ) : (
          <div data-testid="listings-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((l) => (
              <div key={l.docId} className="module-list-row" data-testid="listing-item" style={{ alignItems: 'center', opacity: l.data.status === 'sold' ? 0.55 : 1 }}>
                <span style={{ fontSize: 18 }}>{l.data.kind === 'goods' ? '🛋' : '🔧'}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: l.data.status === 'sold' ? 'line-through' : 'none' }}>{l.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{l.data.condition}</Tag>
                    {l.data.contact && <span>📮 {l.data.contact}</span>}
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(l.data.priceCents)}</span>
                <Button variant={l.data.status === 'available' ? 'secondary' : 'primary'} onClick={() => toggleSold(l)} data-testid={`sold-${l.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  {l.data.status === 'available' ? 'Mark Sold' : 'Relist'}
                </Button>
                <IconButton label="Remove" onClick={() => remove(l.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          ⬇️ Export Board as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Listing">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Restored oak side table" data-testid="listing-title-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Type</Label>
            <SegmentedControl
              options={[
                { value: 'goods', label: '🛋 Goods' },
                { value: 'repair', label: '🔧 Repair' },
              ]}
              value={kind}
              onChange={setKind}
            />
          </div>
          <div style={{ width: 100 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="listing-price-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Condition</Label>
            <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Refinished / Service" data-testid="listing-condition-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Contact</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email / handle / site" data-testid="listing-contact-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addListing} data-testid="add-listing-button">
            + List It
          </Button>
        </div>
      </Section>
    </div>
  );
}
