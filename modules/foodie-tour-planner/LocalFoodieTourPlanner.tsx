import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Local Foodie Tour Planner — build an ordered eating route from a stop
// pool, filtered by dietary need (the "curated by dietary needs" is the
// filter working against per-stop diet tags, not a static list). Tour
// membership is tourOrder > 0 on the stop; reorder with up/down (a DnD
// library is out of scope per platform constraints). Money is integer
// cents.

type Stop = { name: string; dish: string; neighborhood: string; dietTags: string[]; priceCents: number; tourOrder: number };

const DIETS: { key: string; label: string }[] = [
  { key: 'vegetarian', label: '🥬 Vegetarian' },
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'gluten_free', label: '🌾 Gluten-Free' },
  { key: 'halal', label: '🕌 Halal' },
];

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function LocalFoodieTourPlanner({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [stops, setStops] = useState<StoreDoc<Stop>[] | null>(null);
  const [dietFilter, setDietFilter] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dish, setDish] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [price, setPrice] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);

  useEffect(() => {
    store.list<Stop>('stops').then(setStops);
  }, [store]);

  const list = stops ?? [];
  const tour = useMemo(() => list.filter((s) => s.data.tourOrder > 0).sort((a, b) => a.data.tourOrder - b.data.tourOrder), [list]);
  const pool = list.filter((s) => s.data.tourOrder === 0 && (!dietFilter || s.data.dietTags.includes(dietFilter)));
  const tourCostCents = tour.reduce((s, x) => s + x.data.priceCents, 0);
  // the tour fits the filtered diet only if every stop on it carries the tag
  const tourFitsDiet = !dietFilter || tour.every((s) => s.data.dietTags.includes(dietFilter));

  async function patch(doc: StoreDoc<Stop>, patchData: Partial<Stop>) {
    const updated = await store.update('stops', doc.docId, { ...doc.data, ...patchData });
    setStops((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
    return updated;
  }

  async function addToTour(doc: StoreDoc<Stop>) {
    const maxOrder = tour.length > 0 ? tour[tour.length - 1]!.data.tourOrder : 0;
    await patch(doc, { tourOrder: maxOrder + 1 });
  }

  async function removeFromTour(doc: StoreDoc<Stop>) {
    await patch(doc, { tourOrder: 0 });
  }

  async function move(doc: StoreDoc<Stop>, direction: -1 | 1) {
    const idx = tour.findIndex((s) => s.docId === doc.docId);
    const swapWith = tour[idx + direction];
    if (!swapWith) return;
    const a = doc.data.tourOrder;
    const b = swapWith.data.tourOrder;
    await patch(doc, { tourOrder: b });
    await patch(swapWith, { tourOrder: a });
  }

  async function addStop() {
    if (!name.trim() || !dish.trim()) return;
    const s: Stop = { name: name.trim(), dish: dish.trim(), neighborhood: neighborhood.trim() || 'Around town', dietTags: newTags, priceCents: Math.round((Number(price) || 0) * 100), tourOrder: 0 };
    const doc = await store.create('stops', s);
    setStops((prev) => [...(prev ?? []), doc]);
    setName('');
    setDish('');
    setNeighborhood('');
    setPrice('');
    setNewTags([]);
  }

  async function removeStop(docId: string) {
    await store.remove('stops', docId);
    setStops((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportItinerary() {
    const lines = tour.map((s, i) => `${i + 1}. **${s.data.name}** (${s.data.neighborhood}) — ${s.data.dish} · ${fmt(s.data.priceCents)}${s.data.dietTags.length ? ` · ${s.data.dietTags.join(', ')}` : ''}`);
    const md = ['# Foodie Tour Itinerary', '', ...lines, '', `**Total: ${fmt(tourCostCents)} across ${tour.length} stops**`].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foodie-tour.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (stops === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="foodie-tour-planner-root">
      <Section title="Your Tour">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="tour-count">{tour.length}</span>} label="Stops on the route" />
          <StatDisplay value={<span data-testid="tour-cost">{fmt(tourCostCents)}</span>} label="Total tour cost" />
          <StatDisplay value={dietFilter ? (tourFitsDiet ? '✓ Yes' : '✗ Not yet') : '—'} label={dietFilter ? `Fully ${DIETS.find((d) => d.key === dietFilter)?.label.split(' ')[1]}?` : 'Pick a diet to check the route'} />
        </div>

        {tour.length === 0 ? (
          <EmptyState icon="🍜">No stops on the tour — add from the pool below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="tour-list">
            {tour.map((s, i) => (
              <div key={s.docId} className="module-list-row" data-testid="tour-stop" style={{ alignItems: 'center' }}>
                <span style={{ color: 'var(--module-accent)', fontWeight: 700, minWidth: 24 }}>{i + 1}.</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {s.data.dish} · {s.data.neighborhood}
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(s.data.priceCents)}</span>
                <IconButton label="Move Up" onClick={() => move(s, -1)} data-testid={`up-${s.docId}`}>
                  ↑
                </IconButton>
                <IconButton label="Move Down" onClick={() => move(s, 1)} data-testid={`down-${s.docId}`}>
                  ↓
                </IconButton>
                <Button variant="ghost" onClick={() => removeFromTour(s)} data-testid={`drop-${s.docId}`} style={{ padding: '4px 10px', fontSize: 12 }}>
                  Drop
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Stop Pool">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <Tag active={dietFilter === null} onClick={() => setDietFilter(null)}>
            All Diets
          </Tag>
          {DIETS.map((d) => (
            <Tag key={d.key} active={dietFilter === d.key} onClick={() => setDietFilter(dietFilter === d.key ? null : d.key)}>
              {d.label}
            </Tag>
          ))}
        </div>

        {pool.length === 0 ? (
          <EmptyState icon="🔍">No stops match{dietFilter ? ' that dietary need' : ''} — add one below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="pool-list">
            {pool.map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="pool-stop" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {s.data.dish} · {s.data.neighborhood}
                    {s.data.dietTags.length > 0 && ` · ${s.data.dietTags.join(', ')}`}
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(s.data.priceCents)}</span>
                <Button variant="secondary" onClick={() => addToTour(s)} data-testid={`add-tour-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  + Add to Tour
                </Button>
                <IconButton label="Remove" onClick={() => removeStop(s.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 150 }}>
              <Label>Spot</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Taquería Sol" data-testid="stop-name-input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Label>Must-Order Dish</Label>
              <Input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="e.g. Al pastor, extra piña" data-testid="stop-dish-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 140 }}>
              <Label>Neighborhood</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Market District" data-testid="stop-neighborhood-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 100 }}>
              <Label>Price ($)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="stop-price-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addStop} data-testid="add-stop-button">
              + Add Stop
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Diet Tags:</span>
            {DIETS.map((d) => (
              <Tag key={d.key} active={newTags.includes(d.key)} onClick={() => setNewTags((prev) => (prev.includes(d.key) ? prev.filter((t) => t !== d.key) : [...prev, d.key]))}>
                {d.label}
              </Tag>
            ))}
          </div>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportItinerary}>
          ⬇️ Export Itinerary as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}

