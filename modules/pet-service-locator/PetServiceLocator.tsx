import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Pet Service Locator — directory of groomers, trainers, and sitters,
// grouped by area. Scope note: "map-based" needs a map tile dependency;
// area grouping delivers the locate-by-neighborhood substance without it.

const KINDS = ['groomer', 'trainer', 'sitter'] as const;
type Kind = (typeof KINDS)[number];
const KIND_META: Record<Kind, { label: string; icon: string }> = {
  groomer: { label: 'Groomers', icon: '✂️' },
  trainer: { label: 'Trainers', icon: '🎾' },
  sitter: { label: 'Sitters', icon: '🏠' },
};

type Provider = { name: string; kind: Kind; area: string; phone: string; rating: number; notes: string };

export function PetServiceLocator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [providers, setProviders] = useState<StoreDoc<Provider>[] | null>(null);
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('groomer');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    store.list<Provider>('providers').then(setProviders);
  }, [store]);

  const visible = (providers ?? []).filter((p) => filter === 'all' || p.data.kind === filter);
  const areas = useMemo(() => Array.from(new Set(visible.map((p) => p.data.area))).sort(), [visible]);

  async function addProvider() {
    if (!name.trim()) return;
    const p: Provider = { name: name.trim(), kind, area: area.trim() || 'Unspecified', phone: phone.trim(), rating, notes: notes.trim() };
    const doc = await store.create('providers', p);
    setProviders((prev) => [...(prev ?? []), doc]);
    setName('');
    setPhone('');
    setNotes('');
  }

  async function remove(docId: string) {
    await store.remove('providers', docId);
    setProviders((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportDirectory() {
    const rows = (providers ?? []).map((p) => `"${p.data.name}",${p.data.kind},${p.data.area},"${p.data.phone}",${p.data.rating},"${p.data.notes}"`);
    const csv = ['name,type,area,phone,rating,notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pet-services.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (providers === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="pet-service-locator-root">
      <Section title="Find a Service">
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[{ value: 'all' as const, label: '🐾 All' }, ...KINDS.map((k) => ({ value: k, label: `${KIND_META[k].icon} ${KIND_META[k].label}` }))]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="🐾">No providers listed yet — add one below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }} data-testid="areas-list">
            {areas.map((a) => (
              <div key={a}>
                <Label>📍 {a}</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {visible
                    .filter((p) => p.data.area === a)
                    .sort((x, y) => y.data.rating - x.data.rating)
                    .map((p) => (
                      <div key={p.docId} className="module-list-row" data-testid="provider-item" style={{ alignItems: 'center' }}>
                        <span style={{ fontSize: 18 }}>{KIND_META[p.data.kind].icon}</span>
                        <div className="module-list-row-content" style={{ flex: 1 }}>
                          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                          <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--module-accent)', letterSpacing: 1 }}>
                              {'★'.repeat(p.data.rating)}
                              <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - p.data.rating)}</span>
                            </span>
                            {p.data.phone && <span>📞 {p.data.phone}</span>}
                            {p.data.notes && <span>{p.data.notes}</span>}
                          </div>
                        </div>
                        <IconButton label="Remove" onClick={() => remove(p.docId)}>
                          ✕
                        </IconButton>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDirectory}>
          ⬇️ Export Directory as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Provider">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" data-testid="provider-name-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)} data-testid="provider-kind-select">
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_META[k].icon} {KIND_META[k].label.slice(0, -1)}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Area</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="North Side" data-testid="provider-area-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0100" data-testid="provider-phone-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <Label>Rating</Label>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} style={{ all: 'unset', cursor: 'pointer', fontSize: 20, color: n <= rating ? 'var(--module-accent)' : 'var(--color-border)' }} data-testid={`rating-star-${n}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" data-testid="provider-notes-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProvider} data-testid="add-provider-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
