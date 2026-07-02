import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Subscription Box Management Platform — subscriber roster, box inventory,
// and a ship-queue for the current cycle. Money is integer cents.
// Scope note: actually charging subscribers is Stripe-Connect-level
// platform work (same boundary as quote-invoice-builder); MRR here is the
// number that billing would collect. Shipping-label APIs are third-party —
// the ship queue tracks who still needs a box and decrements inventory
// when marked shipped.

type Subscriber = { name: string; plan: 'monthly' | 'quarterly'; priceCents: number; status: 'active' | 'paused'; shippedThisCycle: boolean };
type InventoryItem = { item: string; onHand: number; perBox: number };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function SubscriptionBoxManagementPlatform({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [subs, setSubs] = useState<StoreDoc<Subscriber>[] | null>(null);
  const [inventory, setInventory] = useState<StoreDoc<InventoryItem>[] | null>(null);
  const [tab, setTab] = useState<'subscribers' | 'inventory'>('subscribers');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'quarterly'>('monthly');
  const [price, setPrice] = useState('35');
  const [itemName, setItemName] = useState('');
  const [onHand, setOnHand] = useState('');
  const [perBox, setPerBox] = useState('1');

  useEffect(() => {
    store.list<Subscriber>('subscribers').then(setSubs);
    store.list<InventoryItem>('inventory').then(setInventory);
  }, [store]);

  const active = (subs ?? []).filter((s) => s.data.status === 'active');
  // monthly-equivalent revenue: quarterly plans contribute a third per month
  const mrrCents = active.reduce((sum, s) => sum + (s.data.plan === 'monthly' ? s.data.priceCents : Math.round(s.data.priceCents / 3)), 0);
  const toShip = active.filter((s) => !s.data.shippedThisCycle);
  const boxesBuildable = (inventory ?? []).length
    ? Math.min(...(inventory ?? []).map((i) => Math.floor(i.data.onHand / Math.max(1, i.data.perBox))))
    : 0;

  async function addSubscriber() {
    if (!name.trim()) return;
    const sub: Subscriber = { name: name.trim(), plan, priceCents: Math.round((Number(price) || 0) * 100), status: 'active', shippedThisCycle: false };
    const doc = await store.create('subscribers', sub);
    setSubs((prev) => [...(prev ?? []), doc]);
    setName('');
  }

  async function togglePause(doc: StoreDoc<Subscriber>) {
    const next: Subscriber = { ...doc.data, status: doc.data.status === 'active' ? 'paused' : 'active' };
    const updated = await store.update('subscribers', doc.docId, next);
    setSubs((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function markShipped(doc: StoreDoc<Subscriber>) {
    const updated = await store.update('subscribers', doc.docId, { ...doc.data, shippedThisCycle: true });
    setSubs((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
    // decrement inventory by one box's worth
    for (const inv of inventory ?? []) {
      const next = { ...inv.data, onHand: Math.max(0, inv.data.onHand - inv.data.perBox) };
      const updatedInv = await store.update('inventory', inv.docId, next);
      setInventory((prev) => (prev ?? []).map((i) => (i.docId === inv.docId ? updatedInv : i)));
    }
  }

  async function removeSub(docId: string) {
    await store.remove('subscribers', docId);
    setSubs((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  async function addInventory() {
    if (!itemName.trim()) return;
    const doc = await store.create('inventory', { item: itemName.trim(), onHand: Number(onHand) || 0, perBox: Number(perBox) || 1 });
    setInventory((prev) => [...(prev ?? []), doc]);
    setItemName('');
    setOnHand('');
  }

  async function restock(doc: StoreDoc<InventoryItem>, amount: number) {
    const updated = await store.update('inventory', doc.docId, { ...doc.data, onHand: doc.data.onHand + amount });
    setInventory((prev) => (prev ?? []).map((i) => (i.docId === doc.docId ? updated : i)));
  }

  async function removeInventory(docId: string) {
    await store.remove('inventory', docId);
    setInventory((prev) => (prev ?? []).filter((i) => i.docId !== docId));
  }

  function exportRoster() {
    const rows = (subs ?? []).map((s) => `"${s.data.name}",${s.data.plan},${(s.data.priceCents / 100).toFixed(2)},${s.data.status},${s.data.shippedThisCycle ? 'shipped' : 'pending'}`);
    const csv = ['subscriber,plan,price,status,this cycle', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (subs === null || inventory === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="subscription-box-management-root">
      <Section title="Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
          <StatDisplay value={fmt(mrrCents)} label="Monthly-equivalent revenue" />
          <StatDisplay value={toShip.length} label="Boxes to ship this cycle" />
          <StatDisplay value={boxesBuildable} label="Boxes buildable from inventory" />
        </div>
        <SegmentedControl
          options={[
            { value: 'subscribers', label: '👥 Subscribers' },
            { value: 'inventory', label: '📦 Inventory' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Divider />

      {tab === 'subscribers' ? (
        <Section title="Subscribers">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subscriber name" data-testid="sub-name-input" style={{ width: '100%' }} />
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={plan} onChange={(e) => setPlan(e.target.value as 'monthly' | 'quarterly')} data-testid="sub-plan-select">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </Select>
            </div>
            <div style={{ width: 100 }}>
              <Label>Price ($)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="sub-price-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addSubscriber} data-testid="add-sub-button">
              + Add
            </Button>
          </div>

          {subs.length === 0 ? (
            <EmptyState icon="📦">No subscribers yet.</EmptyState>
          ) : (
            <div data-testid="subs-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {subs.map((s) => (
                <div key={s.docId} className="module-list-row" data-testid="sub-item" style={{ alignItems: 'center' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.name}</span>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      {s.data.plan} · {fmt(s.data.priceCents)}
                    </div>
                  </div>
                  <Tag active={s.data.status === 'active'} onClick={() => togglePause(s)}>
                    {s.data.status === 'active' ? 'Active' : 'Paused'}
                  </Tag>
                  {s.data.status === 'active' &&
                    (s.data.shippedThisCycle ? (
                      <Tag>✓ Shipped</Tag>
                    ) : (
                      <Button variant="primary" onClick={() => markShipped(s)} data-testid={`ship-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                        📦 Ship
                      </Button>
                    ))}
                  <IconButton label="Remove" onClick={() => removeSub(s.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
          )}

          <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportRoster}>
            ⬇️ Export Subscriber Roster as CSV
          </GatedAction>
        </Section>
      ) : (
        <Section title="Box Inventory">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Item</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Coffee bags" data-testid="inv-item-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 100 }}>
              <Label>On Hand</Label>
              <Input type="number" value={onHand} onChange={(e) => setOnHand(e.target.value)} data-testid="inv-onhand-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 100 }}>
              <Label>Per Box</Label>
              <Input type="number" min={1} value={perBox} onChange={(e) => setPerBox(e.target.value)} data-testid="inv-perbox-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addInventory} data-testid="add-inv-button">
              + Add
            </Button>
          </div>

          {inventory.length === 0 ? (
            <EmptyState icon="📦">No inventory tracked yet.</EmptyState>
          ) : (
            <div data-testid="inv-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inventory.map((i) => {
                const low = i.data.onHand < i.data.perBox * Math.max(1, toShip.length);
                return (
                  <div key={i.docId} className="module-list-row" data-testid="inv-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{i.data.item}</span>
                      <div style={{ fontSize: 12, marginTop: 2 }}>
                        {i.data.onHand} on hand · {i.data.perBox}/box
                        {low && <span style={{ color: '#ff9f0a' }}> · ⚠️ low for this cycle</span>}
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => restock(i, 10)} data-testid={`restock-${i.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      +10
                    </Button>
                    <IconButton label="Remove" onClick={() => removeInventory(i.docId)}>
                      ✕
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
