import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Online Booking & Scheduling for Service Providers — a service menu with
// prices + an open-slot day sheet that bookings claim. Distinct from
// appointment-booking (#14, an appointment book with intake forms): this
// one is availability-first — you publish slots, bookings fill them.
// Scope note: taking payment at booking is Stripe-Connect platform work;
// the day sheet totals what the day's bookings would collect.

type Service = { name: string; minutes: number; priceCents: number };
type Slot = { time: string; booked: string; service: string };

function fmt(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function OnlineBookingSchedulingForServiceProviders({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [services, setServices] = useState<StoreDoc<Service>[] | null>(null);
  const [slots, setSlots] = useState<StoreDoc<Slot>[] | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcMinutes, setSvcMinutes] = useState('30');
  const [svcPrice, setSvcPrice] = useState('');
  const [slotTime, setSlotTime] = useState('09:00');
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientService, setClientService] = useState('');

  useEffect(() => {
    store.list<Service>('services').then(setServices);
    store.list<Slot>('slots').then((docs) => setSlots(docs.sort((a, b) => a.data.time.localeCompare(b.data.time))));
  }, [store]);

  const bookedSlots = (slots ?? []).filter((s) => s.data.booked);
  const dayRevenueCents = bookedSlots.reduce((sum, s) => {
    const svc = (services ?? []).find((x) => x.data.name === s.data.service);
    return sum + (svc?.data.priceCents ?? 0);
  }, 0);

  async function addService() {
    if (!svcName.trim()) return;
    const doc = await store.create('services', { name: svcName.trim(), minutes: Number(svcMinutes) || 30, priceCents: Math.round((Number(svcPrice) || 0) * 100) });
    setServices((prev) => [...(prev ?? []), doc]);
    setSvcName('');
    setSvcPrice('');
  }

  async function removeService(docId: string) {
    await store.remove('services', docId);
    setServices((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  async function addSlot() {
    const doc = await store.create('slots', { time: slotTime, booked: '', service: '' });
    setSlots((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.time.localeCompare(b.data.time)));
  }

  async function book() {
    const doc = (slots ?? []).find((s) => s.docId === bookingSlot);
    if (!doc || !clientName.trim() || !clientService) return;
    const updated = await store.update('slots', doc.docId, { ...doc.data, booked: clientName.trim(), service: clientService });
    setSlots((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
    setBookingSlot(null);
    setClientName('');
  }

  async function cancelBooking(doc: StoreDoc<Slot>) {
    const updated = await store.update('slots', doc.docId, { ...doc.data, booked: '', service: '' });
    setSlots((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function removeSlot(docId: string) {
    await store.remove('slots', docId);
    setSlots((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportDaySheet() {
    const rows = (slots ?? []).map((s) => `${s.data.time},${s.data.booked || 'OPEN'},${s.data.service || ''}`);
    const csv = ['time,client,service', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'day-sheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (services === null || slots === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="online-booking-scheduling-root">
      <Section title="Day Sheet">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={fmt(dayRevenueCents)} label={`${bookedSlots.length} of ${slots.length} slots booked today`} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{ width: 110 }}>
            <Label>New Slot</Label>
            <Input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} data-testid="slot-time-input" style={{ width: '100%' }} />
          </div>
          <Button variant="secondary" onClick={addSlot} data-testid="add-slot-button">
            + Open Slot
          </Button>
        </div>

        {slots.length === 0 ? (
          <EmptyState icon="🕑">No slots published — open your first slot above.</EmptyState>
        ) : (
          <div data-testid="slots-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {slots.map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="slot-item" style={{ alignItems: 'center' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 50 }}>{s.data.time}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  {s.data.booked ? (
                    <>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.booked}</span>
                      <span style={{ fontSize: 12, marginLeft: 8 }}>{s.data.service}</span>
                    </>
                  ) : (
                    <Tag>Open</Tag>
                  )}
                </div>
                {s.data.booked ? (
                  <Button variant="ghost" onClick={() => cancelBooking(s)} data-testid={`cancel-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    Cancel
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setBookingSlot(s.docId)} data-testid={`book-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    Book
                  </Button>
                )}
                <IconButton label="Remove slot" onClick={() => removeSlot(s.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        {bookingSlot && (
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14 }} data-testid="booking-form">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Label>Client</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" data-testid="booking-client-input" style={{ width: '100%' }} />
              </div>
              <div>
                <Label>Service</Label>
                <Select value={clientService} onChange={(e) => setClientService(e.target.value)} data-testid="booking-service-select">
                  <option value="">Choose…</option>
                  {services.map((svc) => (
                    <option key={svc.docId} value={svc.data.name}>
                      {svc.data.name} ({fmt(svc.data.priceCents)})
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="primary" onClick={book} data-testid="confirm-booking-button">
                Confirm
              </Button>
              <Button variant="ghost" onClick={() => setBookingSlot(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDaySheet}>
          ⬇️ Export Day Sheet as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Service Menu">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Service</Label>
            <Input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="e.g. Haircut" data-testid="service-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Minutes</Label>
            <Input type="number" value={svcMinutes} onChange={(e) => setSvcMinutes(e.target.value)} data-testid="service-minutes-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} data-testid="service-price-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addService} data-testid="add-service-button">
            + Add
          </Button>
        </div>

        {services.length === 0 ? (
          <EmptyState icon="💈">No services on the menu yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="services-list">
            {services.map((svc) => (
              <div key={svc.docId} className="module-list-row" data-testid="service-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{svc.data.name}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{svc.data.minutes} min</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(svc.data.priceCents)}</span>
                <IconButton label="Remove" onClick={() => removeService(svc.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
