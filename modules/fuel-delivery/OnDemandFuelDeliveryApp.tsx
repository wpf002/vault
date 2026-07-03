import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// On-Demand Fuel Delivery App — save vehicles with their usual fill
// location, order fuel by the gallon at current per-gallon rates, and
// track each delivery through its dispatch stages with a progress bar.
// Scope note: live GPS courier tracking is a geo/realtime integration —
// the stage tracker mirrors what a dispatcher actually updates. Money
// is integer cents; order total = gallons × rate.

type Vehicle = { label: string; fuelType: 'gas' | 'diesel'; address: string };
type Order = { vehicle: string; fuelType: 'gas' | 'diesel'; gallons: number; priceCentsPerGal: number; status: 'ordered' | 'driver_en_route' | 'delivering' | 'completed'; address: string };

const RATES: Record<Vehicle['fuelType'], number> = { gas: 349, diesel: 419 }; // cents per gallon

const STAGES: Order['status'][] = ['ordered', 'driver_en_route', 'delivering', 'completed'];
const STAGE_LABELS: Record<Order['status'], string> = {
  ordered: '📝 Ordered',
  driver_en_route: '🚚 Driver En Route',
  delivering: '⛽ Delivering',
  completed: '✅ Completed',
};

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function orderTotalCents(o: Order): number {
  return Math.round(o.gallons * o.priceCentsPerGal);
}

export function OnDemandFuelDeliveryApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [vehicles, setVehicles] = useState<StoreDoc<Vehicle>[] | null>(null);
  const [orders, setOrders] = useState<StoreDoc<Order>[] | null>(null);
  const [vLabel, setVLabel] = useState('');
  const [vFuel, setVFuel] = useState<Vehicle['fuelType']>('gas');
  const [vAddress, setVAddress] = useState('');
  const [orderVehicle, setOrderVehicle] = useState('');
  const [gallons, setGallons] = useState('10');

  useEffect(() => {
    store.list<Vehicle>('vehicles').then((docs) => {
      setVehicles(docs);
      if (docs[0]) setOrderVehicle(docs[0].data.label);
    });
    store.list<Order>('orders').then(setOrders);
  }, [store]);

  const vehicleList = vehicles ?? [];
  const orderList = orders ?? [];
  const active = orderList.filter((o) => o.data.status !== 'completed');
  const deliveredGallons = orderList.filter((o) => o.data.status === 'completed').reduce((s, o) => s + o.data.gallons, 0);
  const totalSpentCents = orderList.filter((o) => o.data.status === 'completed').reduce((s, o) => s + orderTotalCents(o.data), 0);

  const selectedVehicle = vehicleList.find((v) => v.data.label === orderVehicle);
  const quoteGallons = Math.max(0, Number(gallons) || 0);
  const quoteCents = selectedVehicle ? Math.round(quoteGallons * RATES[selectedVehicle.data.fuelType]) : 0;

  async function addVehicle() {
    if (!vLabel.trim()) return;
    const v: Vehicle = { label: vLabel.trim(), fuelType: vFuel, address: vAddress.trim() || 'Current location' };
    const doc = await store.create('vehicles', v);
    setVehicles((prev) => [...(prev ?? []), doc]);
    if (!orderVehicle) setOrderVehicle(v.label);
    setVLabel('');
    setVAddress('');
  }

  async function removeVehicle(docId: string) {
    await store.remove('vehicles', docId);
    setVehicles((prev) => (prev ?? []).filter((v) => v.docId !== docId));
  }

  async function placeOrder() {
    if (!selectedVehicle || quoteGallons <= 0) return;
    const o: Order = {
      vehicle: selectedVehicle.data.label,
      fuelType: selectedVehicle.data.fuelType,
      gallons: quoteGallons,
      priceCentsPerGal: RATES[selectedVehicle.data.fuelType],
      status: 'ordered',
      address: selectedVehicle.data.address,
    };
    const doc = await store.create('orders', o);
    setOrders((prev) => [doc, ...(prev ?? [])]);
  }

  async function advanceOrder(doc: StoreDoc<Order>) {
    const idx = STAGES.indexOf(doc.data.status);
    if (idx >= STAGES.length - 1) return;
    const next: Order = { ...doc.data, status: STAGES[idx + 1]! };
    const updated = await store.update('orders', doc.docId, next);
    setOrders((prev) => (prev ?? []).map((o) => (o.docId === doc.docId ? updated : o)));
  }

  async function removeOrder(docId: string) {
    await store.remove('orders', docId);
    setOrders((prev) => (prev ?? []).filter((o) => o.docId !== docId));
  }

  function exportReceipts() {
    const rows = orderList.map((o) => `"${o.data.vehicle}",${o.data.fuelType},${o.data.gallons},${(o.data.priceCentsPerGal / 100).toFixed(2)},${(orderTotalCents(o.data) / 100).toFixed(2)},${o.data.status},"${o.data.address}"`);
    const csv = ['vehicle,fuel,gallons,price per gallon,total,status,address', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fuel-receipts.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (vehicles === null || orders === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="fuel-delivery-root">
      <Section title="Delivery Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="active-orders">{active.length}</span>} label="Deliveries in progress" />
          <StatDisplay value={`${deliveredGallons} gal`} label="Fuel delivered to date" />
          <StatDisplay value={<span data-testid="total-spent">{fmt(totalSpentCents)}</span>} label="Total spent" />
        </div>
      </Section>

      <Divider />

      <Section title="Order Fuel">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ width: 200 }}>
            <Label>Vehicle</Label>
            <Select value={orderVehicle} onChange={(e) => setOrderVehicle(e.target.value)} data-testid="order-vehicle-select" style={{ width: '100%' }}>
              {vehicleList.map((v) => (
                <option key={v.docId} value={v.data.label}>
                  {v.data.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 100 }}>
            <Label>Gallons</Label>
            <Input type="number" value={gallons} onChange={(e) => setGallons(e.target.value)} data-testid="gallons-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={placeOrder} data-testid="place-order-button" disabled={!selectedVehicle || quoteGallons <= 0}>
            ⛽ Order — {fmt(quoteCents)}
          </Button>
        </div>
        {selectedVehicle && (
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="quote-line">
            {selectedVehicle.data.fuelType === 'gas' ? 'Gas' : 'Diesel'} at {fmt(RATES[selectedVehicle.data.fuelType])}/gal, delivered to {selectedVehicle.data.address}.
          </p>
        )}
      </Section>

      <Divider />

      <Section title="Deliveries">
        {orderList.length === 0 ? (
          <EmptyState icon="⛽">No orders yet — fuel up above.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="orders-list">
            {orderList.map((o) => {
              const stageIdx = STAGES.indexOf(o.data.status);
              return (
                <div key={o.docId} className="module-list-row" data-testid="order-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                        {o.data.gallons} gal {o.data.fuelType} → {o.data.vehicle}
                      </span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                        📍 {o.data.address} · {fmt(o.data.priceCentsPerGal)}/gal
                      </div>
                    </div>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }} data-testid={`total-${o.docId}`}>
                      {fmt(orderTotalCents(o.data))}
                    </span>
                    <Tag active={o.data.status === 'completed'} data-testid={`status-${o.docId}`}>
                      {STAGE_LABELS[o.data.status]}
                    </Tag>
                    {o.data.status !== 'completed' && (
                      <Button variant="secondary" onClick={() => advanceOrder(o)} data-testid={`advance-${o.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                        → {STAGE_LABELS[STAGES[stageIdx + 1]!].split(' ').slice(1).join(' ')}
                      </Button>
                    )}
                    <IconButton label="Remove" onClick={() => removeOrder(o.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {STAGES.map((s, i) => (
                      <div key={s} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= stageIdx ? 'var(--module-accent)' : 'var(--color-surface-2, rgba(255,255,255,0.08))' }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Your Vehicles">
        {vehicleList.length === 0 ? (
          <EmptyState icon="🚗">No vehicles saved.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="vehicles-list">
            {vehicleList.map((v) => (
              <div key={v.docId} className="module-list-row" data-testid="vehicle-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{v.data.label}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>📍 {v.data.address}</span>
                </div>
                <Tag>{v.data.fuelType === 'gas' ? '⛽ Gas' : '🛢️ Diesel'}</Tag>
                <IconButton label="Remove" onClick={() => removeVehicle(v.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Vehicle</Label>
            <Input value={vLabel} onChange={(e) => setVLabel(e.target.value)} placeholder="e.g. Delivery Van" data-testid="vehicle-label-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Fuel</Label>
            <Select value={vFuel} onChange={(e) => setVFuel(e.target.value as Vehicle['fuelType'])} data-testid="fuel-select" style={{ width: '100%' }}>
              <option value="gas">Gas</option>
              <option value="diesel">Diesel</option>
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Usual Fill Location</Label>
            <Input value={vAddress} onChange={(e) => setVAddress(e.target.value)} placeholder="e.g. Office parking lot" data-testid="vehicle-address-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addVehicle} data-testid="add-vehicle-button">
            + Save Vehicle
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReceipts}>
          ⬇️ Export Receipts as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
