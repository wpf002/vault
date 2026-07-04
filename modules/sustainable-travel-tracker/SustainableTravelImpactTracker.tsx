import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Sustainable Travel Impact Tracker — log journey legs by mode and
// distance, get kg CO2e from published per-km emission factors, and see
// rule-based eco swaps (e.g. short flight → train) with the exact kg
// each would save. Estimate for planning, factors are ballpark averages
// — stated in the UI.

type TravelMode = 'flight' | 'train' | 'bus' | 'car' | 'ev' | 'bike_walk';
type Leg = { trip: string; from: string; to: string; mode: TravelMode; km: number };

// kg CO2e per passenger-km (rounded published averages)
const MODES: Record<TravelMode, { factor: number; icon: string; label: string }> = {
  flight: { factor: 0.246, icon: '✈️', label: 'Flight' },
  car: { factor: 0.17, icon: '🚗', label: 'Car (Solo)' },
  bus: { factor: 0.097, icon: '🚌', label: 'Bus' },
  ev: { factor: 0.05, icon: '🔋', label: 'EV' },
  train: { factor: 0.035, icon: '🚆', label: 'Train' },
  bike_walk: { factor: 0, icon: '🚲', label: 'Bike / Walk' },
};

function kgFor(leg: Leg): number {
  return leg.km * MODES[leg.mode].factor;
}

// the swap we'd suggest for a leg, if a meaningfully greener one exists
function suggestion(leg: Leg): { mode: TravelMode; savedKg: number } | null {
  let alt: TravelMode | null = null;
  if (leg.mode === 'flight' && leg.km <= 1000) alt = 'train';
  else if (leg.mode === 'car' && leg.km > 100) alt = 'train';
  else if (leg.mode === 'car' && leg.km <= 15) alt = 'bike_walk';
  else if (leg.mode === 'bus' && leg.km <= 8) alt = 'bike_walk';
  if (!alt) return null;
  const savedKg = kgFor(leg) - leg.km * MODES[alt].factor;
  return savedKg >= 1 ? { mode: alt, savedKg } : null;
}

export function SustainableTravelImpactTracker({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [legs, setLegs] = useState<StoreDoc<Leg>[] | null>(null);
  const [trip, setTrip] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('train');
  const [km, setKm] = useState('');

  useEffect(() => {
    store.list<Leg>('legs').then(setLegs);
  }, [store]);

  const list = legs ?? [];
  const totalKg = list.reduce((s, l) => s + kgFor(l.data), 0);
  const totalKm = list.reduce((s, l) => s + l.data.km, 0);
  const ifAllFlownKg = totalKm * MODES.flight.factor;
  const avoidedKg = ifAllFlownKg - totalKg;
  const potentialKg = list.reduce((s, l) => s + (suggestion(l.data)?.savedKg ?? 0), 0);

  const byTrip = useMemo(() => {
    const map = new Map<string, { kg: number; legs: number }>();
    for (const l of list) {
      const cur = map.get(l.data.trip) ?? { kg: 0, legs: 0 };
      map.set(l.data.trip, { kg: cur.kg + kgFor(l.data), legs: cur.legs + 1 });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].kg - a[1].kg);
  }, [list]);

  async function addLeg() {
    if (!from.trim() || !to.trim()) return;
    const l: Leg = { trip: trip.trim() || 'Untitled Trip', from: from.trim(), to: to.trim(), mode: travelMode, km: Math.max(0, Number(km) || 0) };
    const doc = await store.create('legs', l);
    setLegs((prev) => [...(prev ?? []), doc]);
    setFrom('');
    setTo('');
    setKm('');
  }

  async function applySwap(doc: StoreDoc<Leg>) {
    const s = suggestion(doc.data);
    if (!s) return;
    const updated = await store.update('legs', doc.docId, { ...doc.data, mode: s.mode });
    setLegs((prev) => (prev ?? []).map((l) => (l.docId === doc.docId ? updated : l)));
  }

  async function removeLeg(docId: string) {
    await store.remove('legs', docId);
    setLegs((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  function exportImpact() {
    const rows = list.map((l) => `"${l.data.trip}","${l.data.from}","${l.data.to}",${MODES[l.data.mode].label},${l.data.km},${kgFor(l.data).toFixed(1)}`);
    const csv = ['trip,from,to,mode,km,kg CO2e', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-impact.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (legs === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="sustainable-travel-tracker-root">
      <Section title="Impact Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 6 }}>
          <StatDisplay value={<span data-testid="total-kg">{totalKg.toFixed(0)} kg</span>} label={`CO2e across ${totalKm.toLocaleString()} km`} />
          <StatDisplay value={`${avoidedKg.toFixed(0)} kg`} label="Avoided vs. flying it all" />
          <StatDisplay value={<span data-testid="potential-kg">{potentialKg.toFixed(0)} kg</span>} label="Still on the table (eco swaps)" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }}>Per-km averages — a planning signal, not a measurement.</p>
      </Section>

      <Divider />

      <Section title="By Trip">
        {byTrip.length === 0 ? (
          <EmptyState icon="🌿">No journeys logged yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="trips-bars">
            {byTrip.map(([name, v]) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--color-text)' }}>{name}</span>
                  <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    {v.kg.toFixed(1)} kg · {v.legs} legs
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${byTrip[0]![1].kg > 0 ? (v.kg / byTrip[0]![1].kg) * 100 : 0}%`, background: 'var(--module-accent)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Journey Legs">
        {list.length === 0 ? (
          <EmptyState icon="🧳">Log your first leg below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="legs-list">
            {list.map((l) => {
              const s = suggestion(l.data);
              return (
                <div key={l.docId} className="module-list-row" data-testid="leg-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 24 }}>{MODES[l.data.mode].icon}</span>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                        {l.data.from} → {l.data.to}
                      </span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                        {l.data.trip} · {MODES[l.data.mode].label} · {l.data.km} km
                      </div>
                    </div>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }} data-testid={`kg-${l.docId}`}>
                      {kgFor(l.data).toFixed(1)} kg
                    </span>
                    <IconButton label="Remove" onClick={() => removeLeg(l.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  {s && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 32, flexWrap: 'wrap' }} data-testid={`suggestion-${l.docId}`}>
                      <span style={{ fontSize: 12, color: '#39d98a' }}>
                        🌿 Take the {MODES[s.mode].label.toLowerCase()} instead — saves {s.savedKg.toFixed(1)} kg
                      </span>
                      <Button variant="ghost" onClick={() => applySwap(l)} data-testid={`swap-${l.docId}`} style={{ padding: '3px 10px', fontSize: 12 }}>
                        Swap It
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 150 }}>
            <Label>Trip</Label>
            <Input value={trip} onChange={(e) => setTrip(e.target.value)} placeholder="e.g. Summer Break" data-testid="trip-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>From</Label>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Origin" data-testid="from-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Destination" data-testid="to-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Mode</Label>
            <Select value={travelMode} onChange={(e) => setTravelMode(e.target.value as TravelMode)} data-testid="mode-select" style={{ width: '100%' }}>
              {Object.entries(MODES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 90 }}>
            <Label>Distance (km)</Label>
            <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} data-testid="km-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addLeg} data-testid="add-leg-button">
            + Log Leg
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportImpact}>
          Export Impact Report as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
