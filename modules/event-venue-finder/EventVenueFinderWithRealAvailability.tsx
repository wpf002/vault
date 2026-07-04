import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Event Venue Finder with Real Availability — venue listings checked
// against a target date: pick your event date and guest count, and the
// list splits into available/unavailable with per-venue booked-date
// calendars you maintain. Scope note: "calendar-synced" against external
// calendars (Google/Outlook) is a third-party-API integration; the
// booked-dates set per venue is the module-side availability source.

type Venue = { name: string; capacity: number; rateCents: number; region: string; bookedDates: string[] };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function EventVenueFinderWithRealAvailability({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [venues, setVenues] = useState<StoreDoc<Venue>[] | null>(null);
  const [eventDate, setEventDate] = useState(todayStr());
  const [guests, setGuests] = useState('50');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [rate, setRate] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    store.list<Venue>('venues').then(setVenues);
  }, [store]);

  const guestCount = Number(guests) || 0;
  const fits = (v: Venue) => v.capacity >= guestCount;
  const freeOnDate = (v: Venue) => !v.bookedDates.includes(eventDate);
  const available = (venues ?? []).filter((v) => fits(v.data) && freeOnDate(v.data)).sort((a, b) => a.data.rateCents - b.data.rateCents);
  const unavailable = (venues ?? []).filter((v) => !fits(v.data) || !freeOnDate(v.data));

  async function addVenue() {
    if (!name.trim()) return;
    const v: Venue = { name: name.trim(), capacity: Number(capacity) || 0, rateCents: Math.round((Number(rate) || 0) * 100), region: region.trim() || '—', bookedDates: [] };
    const doc = await store.create('venues', v);
    setVenues((prev) => [...(prev ?? []), doc]);
    setName('');
    setCapacity('');
    setRate('');
    setRegion('');
  }

  async function toggleBooked(doc: StoreDoc<Venue>) {
    const bookedDates = doc.data.bookedDates.includes(eventDate)
      ? doc.data.bookedDates.filter((d) => d !== eventDate)
      : [...doc.data.bookedDates, eventDate];
    const updated = await store.update('venues', doc.docId, { ...doc.data, bookedDates });
    setVenues((prev) => (prev ?? []).map((v) => (v.docId === doc.docId ? updated : v)));
  }

  async function remove(docId: string) {
    await store.remove('venues', docId);
    setVenues((prev) => (prev ?? []).filter((v) => v.docId !== docId));
  }

  function exportShortlist() {
    const rows = available.map((v) => `"${v.data.name}",${v.data.region},${v.data.capacity},${(v.data.rateCents / 100).toFixed(2)}`);
    const csv = [`available venues for ${eventDate} (party of ${guestCount})`, 'venue,region,capacity,rate', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venues-${eventDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (venues === null) return <LoadingState />;

  function VenueRow({ v, reason }: { v: StoreDoc<Venue>; reason?: string }) {
    const bookedOnDate = v.data.bookedDates.includes(eventDate);
    return (
      <div className="module-list-row" data-testid="venue-item" style={{ alignItems: 'center', opacity: reason ? 0.6 : 1 }}>
        <div className="module-list-row-content" style={{ flex: 1 }}>
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{v.data.name}</span>
          <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>📍 {v.data.region}</span>
            <span>👥 up to {v.data.capacity}</span>
            <span style={{ color: 'var(--module-accent)', fontWeight: 700 }}>{fmt(v.data.rateCents)}</span>
            {reason && <Tag>{reason}</Tag>}
          </div>
        </div>
        <Button
          variant={bookedOnDate ? 'primary' : 'secondary'}
          onClick={() => toggleBooked(v)}
          data-testid={`toggle-booked-${v.docId}`}
          style={{ padding: '5px 10px', fontSize: 12 }}
          title={bookedOnDate ? `Booked on ${eventDate} — click to free` : `Mark booked on ${eventDate}`}
        >
          {bookedOnDate ? 'Booked This Date' : 'Mark Booked'}
        </Button>
        <IconButton label="Remove" onClick={() => remove(v.docId)}>
          ✕
        </IconButton>
      </div>
    );
  }

  return (
    <div className="module-card" data-testid="event-venue-finder-root">
      <Section title="Find a Venue">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 160 }}>
            <Label>Event Date</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} data-testid="event-date-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Guests</Label>
            <Input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} data-testid="guests-input" style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={available.length} label={`Venues available on ${eventDate} for ${guestCount} guests`} />
        </div>

        {available.length === 0 ? (
          <EmptyState icon="🎪">Nothing available for that date and size — adjust the search or add venues.</EmptyState>
        ) : (
          <div data-testid="available-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {available.map((v) => (
              <VenueRow key={v.docId} v={v} />
            ))}
          </div>
        )}

        {unavailable.length > 0 && (
          <>
            <Label>Unavailable</Label>
            <div data-testid="unavailable-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {unavailable.map((v) => (
                <VenueRow key={v.docId} v={v} reason={!fits(v.data) ? 'Too small' : 'Booked'} />
              ))}
            </div>
          </>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportShortlist}>
          Export Available Shortlist as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Venue">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Venue name" data-testid="venue-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Region</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Downtown" data-testid="venue-region-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Capacity</Label>
            <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} data-testid="venue-capacity-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Rate ($)</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} data-testid="venue-rate-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addVenue} data-testid="add-venue-button">
            + Add Venue
          </Button>
        </div>
      </Section>
    </div>
  );
}
