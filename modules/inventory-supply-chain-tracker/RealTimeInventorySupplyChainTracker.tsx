import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Real-Time Inventory & Supply Chain Tracker — SKUs with reorder points
// and low-stock flags, inbound shipments that add to stock when
// received, and quick adjustments for sales/damage. Inventory value is
// onHand × unit cost, integer cents. Scope note: "real-time" barcode/
// EDI feeds are hardware and supplier integrations — the stock ledger
// and inbound pipeline are the substance.

type Sku = { sku: string; name: string; onHand: number; reorderPoint: number; unitCostCents: number };
type Shipment = { sku: string; qty: number; supplier: string; eta: string; status: 'ordered' | 'in_transit' | 'received' };

const SHIPMENT_LABELS: Record<Shipment['status'], string> = { ordered: '📝 Ordered', in_transit: '🚚 In Transit', received: '✅ Received' };

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function RealTimeInventorySupplyChainTracker({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [skus, setSkus] = useState<StoreDoc<Sku>[] | null>(null);
  const [shipments, setShipments] = useState<StoreDoc<Shipment>[] | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [onHand, setOnHand] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [shipSku, setShipSku] = useState('');
  const [shipQty, setShipQty] = useState('');
  const [shipSupplier, setShipSupplier] = useState('');
  const [shipEta, setShipEta] = useState('');
  const [adjust, setAdjust] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Sku>('skus').then((docs) => {
      setSkus(docs);
      if (docs[0]) setShipSku(docs[0].data.sku);
    });
    store.list<Shipment>('shipments').then(setShipments);
  }, [store]);

  const skuList = skus ?? [];
  const lowStock = skuList.filter((s) => s.data.onHand <= s.data.reorderPoint);
  const valueCents = skuList.reduce((s, x) => s + x.data.onHand * x.data.unitCostCents, 0);
  const inboundUnits = (shipments ?? []).filter((s) => s.data.status !== 'received').reduce((s, x) => s + x.data.qty, 0);

  async function addSku() {
    if (!sku.trim() || !name.trim()) return;
    const s: Sku = { sku: sku.trim().toUpperCase(), name: name.trim(), onHand: Math.max(0, Math.round(Number(onHand) || 0)), reorderPoint: Math.max(0, Math.round(Number(reorderPoint) || 0)), unitCostCents: Math.round((Number(unitCost) || 0) * 100) };
    const doc = await store.create('skus', s);
    setSkus((prev) => [...(prev ?? []), doc]);
    if (!shipSku) setShipSku(s.sku);
    setSku('');
    setName('');
    setOnHand('');
    setReorderPoint('');
    setUnitCost('');
  }

  async function adjustStock(doc: StoreDoc<Sku>, direction: 1 | -1) {
    const qty = Math.round(Number(adjust[doc.docId]) || 0);
    if (qty <= 0) return;
    const nextOnHand = Math.max(0, doc.data.onHand + direction * qty);
    const updated = await store.update('skus', doc.docId, { ...doc.data, onHand: nextOnHand });
    setSkus((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
    setAdjust((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function removeSku(docId: string) {
    await store.remove('skus', docId);
    setSkus((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  async function addShipment() {
    if (!shipSku || !shipEta) return;
    const qty = Math.max(1, Math.round(Number(shipQty) || 0));
    const newShipment: Shipment = { sku: shipSku, qty, supplier: shipSupplier.trim() || 'Supplier', eta: shipEta, status: 'ordered' };
    const doc = await store.create('shipments', newShipment);
    setShipments((prev) => [...(prev ?? []), doc]);
    setShipQty('');
    setShipSupplier('');
    setShipEta('');
  }

  async function advanceShipment(doc: StoreDoc<Shipment>) {
    const nextStatus: Shipment['status'] = doc.data.status === 'ordered' ? 'in_transit' : 'received';
    const next: Shipment = { ...doc.data, status: nextStatus };
    const updated = await store.update('shipments', doc.docId, next);
    setShipments((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
    // receiving a shipment lands its units in stock
    if (nextStatus === 'received') {
      const target = skuList.find((s) => s.data.sku === doc.data.sku);
      if (target) {
        const updatedSku = await store.update('skus', target.docId, { ...target.data, onHand: target.data.onHand + doc.data.qty });
        setSkus((prev) => (prev ?? []).map((s) => (s.docId === target.docId ? updatedSku : s)));
      }
    }
  }

  async function removeShipment(docId: string) {
    await store.remove('shipments', docId);
    setShipments((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportInventory() {
    const rows = skuList.map((s) => `${s.data.sku},"${s.data.name}",${s.data.onHand},${s.data.reorderPoint},${(s.data.unitCostCents / 100).toFixed(2)},${((s.data.onHand * s.data.unitCostCents) / 100).toFixed(2)}`);
    const csv = ['sku,name,on hand,reorder point,unit cost,stock value', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (skus === null || shipments === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="inventory-supply-chain-tracker-root">
      <Section title="Stock Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="stock-value">{fmt(valueCents)}</span>} label={`Inventory value · ${skuList.length} SKUs`} />
          <StatDisplay value={<span data-testid="low-stock-count">{lowStock.length}</span>} label="SKUs below reorder point" />
          <StatDisplay value={<span data-testid="inbound-units">{inboundUnits}</span>} label="Units inbound" />
        </div>
      </Section>

      <Divider />

      <Section title="Inventory">
        {skuList.length === 0 ? (
          <EmptyState icon="📦">No SKUs yet — add your first product below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="skus-list">
            {skuList.map((s) => {
              const low = s.data.onHand <= s.data.reorderPoint;
              return (
                <div key={s.docId} className="module-list-row" data-testid="sku-item" style={{ alignItems: 'center' }}>
                  <span style={{ color: 'var(--module-accent)', fontWeight: 700, fontSize: 12, minWidth: 84, fontFamily: 'monospace' }}>{s.data.sku}</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.name}</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(s.data.unitCostCents)}/unit · reorder at {s.data.reorderPoint}
                    </div>
                  </div>
                  {low && <Tag active data-testid={`low-${s.data.sku}`}>⚠️ Reorder</Tag>}
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: low ? '#ff9f0a' : 'var(--module-accent)' }} data-testid={`onhand-${s.data.sku}`}>
                    {s.data.onHand} on hand
                  </span>
                  <Input
                    type="number"
                    value={adjust[s.docId] ?? ''}
                    onChange={(e) => setAdjust((prev) => ({ ...prev, [s.docId]: e.target.value }))}
                    placeholder="Qty"
                    data-testid={`adjust-input-${s.data.sku}`}
                    style={{ width: 70, fontSize: 12, padding: '4px 8px' }}
                  />
                  <Button variant="ghost" onClick={() => adjustStock(s, -1)} data-testid={`sold-${s.data.sku}`} style={{ padding: '4px 8px', fontSize: 12 }}>
                    − Sold
                  </Button>
                  <Button variant="ghost" onClick={() => adjustStock(s, 1)} data-testid={`found-${s.data.sku}`} style={{ padding: '4px 8px', fontSize: 12 }}>
                    + Add
                  </Button>
                  <IconButton label="Remove" onClick={() => removeSku(s.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 110 }}>
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="HAT-GRN" data-testid="sku-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Product</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beanie (Green)" data-testid="name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>On Hand</Label>
            <Input type="number" value={onHand} onChange={(e) => setOnHand(e.target.value)} data-testid="onhand-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Reorder At</Label>
            <Input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} data-testid="reorder-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Unit Cost ($)</Label>
            <Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} data-testid="cost-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addSku} data-testid="add-sku-button">
            + Add SKU
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Inbound Shipments">
        {shipments.length === 0 ? (
          <EmptyState icon="🚚">Nothing inbound.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="shipments-list">
            {shipments.map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="shipment-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                    {s.data.qty} × {s.data.sku}
                  </span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>
                    {s.data.supplier} · ETA {s.data.eta}
                  </span>
                </div>
                <Tag active={s.data.status === 'received'} data-testid={`shipment-status-${s.docId}`}>
                  {SHIPMENT_LABELS[s.data.status]}
                </Tag>
                {s.data.status !== 'received' && (
                  <Button variant="secondary" onClick={() => advanceShipment(s)} data-testid={`advance-shipment-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    {s.data.status === 'ordered' ? '🚚 Ship It' : '✅ Receive'}
                  </Button>
                )}
                <IconButton label="Remove" onClick={() => removeShipment(s.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 140 }}>
            <Label>SKU</Label>
            <Select value={shipSku} onChange={(e) => setShipSku(e.target.value)} data-testid="ship-sku-select" style={{ width: '100%' }}>
              {skuList.map((s) => (
                <option key={s.docId} value={s.data.sku}>
                  {s.data.sku}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 80 }}>
            <Label>Qty</Label>
            <Input type="number" value={shipQty} onChange={(e) => setShipQty(e.target.value)} data-testid="ship-qty-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Supplier</Label>
            <Input value={shipSupplier} onChange={(e) => setShipSupplier(e.target.value)} placeholder="e.g. Harbor Textiles" data-testid="ship-supplier-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>ETA</Label>
            <Input type="date" value={shipEta} onChange={(e) => setShipEta(e.target.value)} data-testid="ship-eta-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addShipment} data-testid="add-shipment-button">
            📝 Order
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportInventory}>
          ⬇️ Export Inventory as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
