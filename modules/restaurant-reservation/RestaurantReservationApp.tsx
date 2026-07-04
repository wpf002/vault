import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Restaurant Reservation App — the restaurant-side book: a table map with
// live availability, tonight's reservation list (auto-fits parties to the
// smallest free table that seats them), and the specials board. "View
// menus / get deals" from the catalog blurb is the specials board — a full
// diner-facing app is a public-page platform feature.

type Table = { name: string; seats: number };
type Reservation = { table: string; name: string; party: number; time: string };
type Special = { title: string; detail: string };

export function RestaurantReservationApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [tables, setTables] = useState<StoreDoc<Table>[] | null>(null);
  const [reservations, setReservations] = useState<StoreDoc<Reservation>[] | null>(null);
  const [specials, setSpecials] = useState<StoreDoc<Special>[] | null>(null);
  const [name, setName] = useState('');
  const [party, setParty] = useState('2');
  const [time, setTime] = useState('19:00');
  const [error, setError] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableSeats, setTableSeats] = useState('4');

  useEffect(() => {
    store.list<Table>('tables').then(setTables);
    store.list<Reservation>('reservations').then((docs) => setReservations(docs.sort((a, b) => a.data.time.localeCompare(b.data.time))));
    store.list<Special>('specials').then(setSpecials);
  }, [store]);

  const bookedTables = new Set((reservations ?? []).map((r) => r.data.table));
  const freeTables = (tables ?? []).filter((t) => !bookedTables.has(t.data.name));

  async function book() {
    setError(null);
    if (!name.trim()) return;
    const size = Number(party) || 2;
    // smallest free table that fits the party
    const fit = freeTables.filter((t) => t.data.seats >= size).sort((a, b) => a.data.seats - b.data.seats)[0];
    if (!fit) {
      setError(`No free table seats ${size} — try another time or add tables.`);
      return;
    }
    const doc = await store.create('reservations', { table: fit.data.name, name: name.trim(), party: size, time });
    setReservations((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.time.localeCompare(b.data.time)));
    setName('');
  }

  async function cancel(docId: string) {
    await store.remove('reservations', docId);
    setReservations((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  async function addTable() {
    if (!tableName.trim()) return;
    const doc = await store.create('tables', { name: tableName.trim(), seats: Number(tableSeats) || 4 });
    setTables((prev) => [...(prev ?? []), doc]);
    setTableName('');
  }

  async function removeTable(doc: StoreDoc<Table>) {
    await store.remove('tables', doc.docId);
    setTables((prev) => (prev ?? []).filter((t) => t.docId !== doc.docId));
  }

  function exportBook() {
    const rows = (reservations ?? []).map((r) => `${r.data.time},${r.data.table},"${r.data.name}",${r.data.party}`);
    const csv = ['time,table,name,party', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservations.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tables === null || reservations === null || specials === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="restaurant-reservation-root">
      <Section title="Tonight">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={`${freeTables.length}/${tables.length}`} label="Tables still available tonight" />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }} data-testid="table-map">
          {tables.map((t) => (
            <span key={t.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <Tag active={!bookedTables.has(t.data.name)}>
                {t.data.name} · {t.data.seats} seats{bookedTables.has(t.data.name) ? ' · booked' : ''}
              </Tag>
              <IconButton label="Remove table" onClick={() => removeTable(t)}>
                ✕
              </IconButton>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ width: 90 }}>
            <Label>Table</Label>
            <Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="T6" data-testid="table-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Seats</Label>
            <Input type="number" min={1} value={tableSeats} onChange={(e) => setTableSeats(e.target.value)} data-testid="table-seats-input" style={{ width: '100%' }} />
          </div>
          <Button variant="secondary" onClick={addTable} data-testid="add-table-button">
            + Add Table
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Book a Table">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" data-testid="res-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Party</Label>
            <Select value={party} onChange={(e) => setParty(e.target.value)} data-testid="res-party-select">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 110 }}>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="res-time-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={book} data-testid="book-button">
            Book
          </Button>
          {error && (
            <span style={{ fontSize: 13, color: '#ff6b5e' }} data-testid="book-error">
              {error}
            </span>
          )}
        </div>
      </Section>

      <Divider />

      <Section title={`Reservations (${reservations.length})`}>
        {reservations.length === 0 ? (
          <EmptyState icon="🍽️">No reservations tonight yet.</EmptyState>
        ) : (
          <div data-testid="reservations-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {reservations.map((r) => (
              <div key={r.docId} className="module-list-row" data-testid="reservation-item" style={{ alignItems: 'center' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 50 }}>{r.data.time}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.name}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>
                    party of {r.data.party} · {r.data.table}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => cancel(r.docId)} data-testid={`cancel-${r.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBook}>
          Export Reservations as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Specials Board">
        {specials.length === 0 ? (
          <EmptyState icon="⭐">No specials posted.</EmptyState>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {specials.map((s) => (
              <div key={s.docId} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <strong style={{ color: 'var(--module-accent)' }}>{s.data.title}</strong>
                <div style={{ fontSize: 13, color: 'var(--color-text-dim)', marginTop: 4 }}>{s.data.detail}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
